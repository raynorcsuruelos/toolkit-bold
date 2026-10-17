import React, { useState, useEffect, useRef } from 'react';
import { Folder, RefreshCw, FileText, Search, ExternalLink } from 'lucide-react';

interface KpodFile {
  name: string;
  path: string;
  handle?: any;
  file?: File;
  lastModified?: number;
}

const KPOD_DB = 'wlkf-kpod-folders';
const KPOD_STORE = 'handles';
const KPOD_KEY = 'kpod-attachments';

function openKpodDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = indexedDB.open(KPOD_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KPOD_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveKpodHandle(handle: any): Promise<void> {
  try {
    const db = await openKpodDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(KPOD_STORE, 'readwrite');
      tx.objectStore(KPOD_STORE).put(handle, KPOD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

async function loadKpodHandle(): Promise<any> {
  try {
    const db = await openKpodDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(KPOD_STORE, 'readonly');
      const req = tx.objectStore(KPOD_STORE).get(KPOD_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle || null;
  } catch {
    return null;
  }
}

async function walkDirectory(dir: any, prefix: string, list: KpodFile[], tokenRef: { token: number; current: number }) {
  for await (const entry of dir.values()) {
    if (tokenRef.token !== tokenRef.current) return;
    if (entry.kind === 'file' && /\.pdf$/i.test(entry.name)) {
      try {
        const file = await entry.getFile();
        list.push({
          name: entry.name,
          path: prefix ? `${prefix}/${entry.name}` : entry.name,
          handle: entry,
          file,
          lastModified: file.lastModified
        });
      } catch {}
    } else if (entry.kind === 'directory') {
      await walkDirectory(entry, prefix ? `${prefix}/${entry.name}` : entry.name, list, tokenRef);
    }
  }
}

interface KpodSearchProps {
  onNotify?: (msg: string, type?: 'info' | 'error' | 'success' | 'warn') => void;
  className?: string;
}

export const KpodSearch: React.FC<KpodSearchProps> = ({ onNotify, className = '' }) => {
  const [folderName, setFolderName] = useState<string>('');
  const [kpodFiles, setKpodFiles] = useState<KpodFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('Choose the folder containing your latest kPod PDF attachments.');
  const [latestModified, setLatestModified] = useState<string>('not available yet');
  const [isScanning, setIsScanning] = useState(false);
  const scanTokenRef = useRef<{ token: number; current: number }>({ token: 0, current: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanFolder = async (handle: any) => {
    scanTokenRef.current.current++;
    const token = scanTokenRef.current.current;
    scanTokenRef.current.token = token;
    setIsScanning(true);
    setStatusMessage('Scanning folder and subfolders for PDF files…');
    setKpodFiles([]);

    try {
      const list: KpodFile[] = [];
      await walkDirectory(handle, '', list, { token, current: scanTokenRef.current.current });
      if (token !== scanTokenRef.current.current) return;

      list.sort((a, b) => a.path.localeCompare(b.path));
      setKpodFiles(list);
      setFolderName(handle.name);

      const newest = list.reduce((max, f) => Math.max(max, f.lastModified || 0), 0);
      setLatestModified(newest ? new Date(newest).toLocaleString() : 'no PDF files found');
      setStatusMessage(`Folder: ${handle.name} · ${list.length} PDF file(s) indexed.`);
      setIsScanning(false);
    } catch (err: any) {
      setStatusMessage('Unable to read this folder. Click Set / Change Folder and grant read permissions.');
      setIsScanning(false);
    }
  };

  const handleChooseFolder = async () => {
    const w = window as any;
    if (w.showDirectoryPicker) {
      try {
        const handle = await w.showDirectoryPicker({ mode: 'read' });
        const perm = await handle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') {
          onNotify?.('Folder permission was not granted.', 'error');
          return;
        }
        await saveKpodHandle(handle);
        await scanFolder(handle);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        onNotify?.(`Folder picker error: ${err.message}`, 'error');
      }
    }

    // Fallback: trigger HTML directory input
    fileInputRef.current?.click();
  };

  const handleFallbackDirectory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;

    const list: KpodFile[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (/\.pdf$/i.test(file.name)) {
        list.push({
          name: file.name,
          path: (file as any).webkitRelativePath || file.name,
          file,
          lastModified: file.lastModified
        });
      }
    }

    list.sort((a, b) => a.path.localeCompare(b.path));
    setKpodFiles(list);
    setFolderName('Local Folder (Selected)');
    const newest = list.reduce((max, f) => Math.max(max, f.lastModified || 0), 0);
    setLatestModified(newest ? new Date(newest).toLocaleString() : 'no PDF files found');
    setStatusMessage(`Folder indexed · ${list.length} PDF file(s) found.`);
  };

  // Re-connect saved handle on mount
  useEffect(() => {
    (async () => {
      const w = window as any;
      if (!w.showDirectoryPicker) {
        setStatusMessage('Choose your kPod Attachments folder using Set / Change Folder.');
        return;
      }
      const savedHandle = await loadKpodHandle();
      if (savedHandle) {
        setFolderName(savedHandle.name);
        try {
          const perm = await savedHandle.queryPermission({ mode: 'read' });
          if (perm === 'granted') {
            await scanFolder(savedHandle);
          } else {
            setStatusMessage(`Saved folder "${savedHandle.name}" found. Click Set / Change Folder to grant access.`);
          }
        } catch {
          setStatusMessage('A saved folder was found. Click Set / Change Folder to reconnect.');
        }
      }
    })();
  }, []);

  const openPdf = async (item: KpodFile) => {
    try {
      let file = item.file;
      if (!file && item.handle) {
        let perm = await item.handle.queryPermission({ mode: 'read' });
        if (perm !== 'granted') {
          perm = await item.handle.requestPermission({ mode: 'read' });
        }
        if (perm !== 'granted') {
          onNotify?.('Permission to read file was denied.', 'error');
          return;
        }
        file = await item.handle.getFile();
      }

      if (!file) {
        onNotify?.('Unable to load PDF file content.', 'error');
        return;
      }

      const url = URL.createObjectURL(file);
      const newWin = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWin) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
      onNotify?.(`Opening ${item.name}`, 'info');
    } catch (err: any) {
      onNotify?.(`Error opening PDF: ${err.message}`, 'error');
    }
  };

  const filtered = searchQuery.trim()
    ? kpodFiles.filter(
        f =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.path.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 80)
    : [];

  return (
    <section className={`p-4 sm:p-5 border-3 border-black rounded-xl bg-[#f7f9fb] shadow-sm space-y-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-300 pb-2.5">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-[#003057] uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#0066a1]" />
            <span>Check with Latest kPod files</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Latest PDF modified: <strong className="text-gray-800">{latestModified}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleChooseFolder}
            className="px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white text-xs font-bold rounded-lg border-2 border-black cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 transition"
            title="Set this folder to your synced kPod folder, usually located in Documents\KPOD\Attachments"
          >
            <Folder className="w-3.5 h-3.5 text-amber-300" />
            <span>Set / Change Folder</span>
          </button>

          {folderName && (
            <button
              type="button"
              onClick={async () => {
                const handle = await loadKpodHandle();
                if (handle) scanFolder(handle);
                else handleChooseFolder();
              }}
              disabled={isScanning}
              className="p-1.5 bg-white hover:bg-gray-100 text-[#003057] rounded-lg border-2 border-black cursor-pointer shadow-xs transition disabled:opacity-50"
              title="Rescan folder"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            className="hidden"
            onChange={handleFallbackDirectory}
          />
        </div>
      </div>

      <div className="text-xs text-gray-600 font-medium">{statusMessage}</div>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          disabled={kpodFiles.length === 0}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            kpodFiles.length > 0
              ? 'Type a kPod PDF filename to search (e.g. tool string, schematic, spec)...'
              : 'Choose a folder first to enable PDF filename search...'
          }
          className="w-full pl-9 pr-4 py-2.5 border-2 border-black rounded-lg text-sm bg-white font-medium focus:outline-none focus:border-[#0066a1] shadow-xs disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      {searchQuery.trim() && (
        <div className="border-2 border-black rounded-lg bg-white max-h-64 overflow-y-auto divide-y divide-gray-200 shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 italic">
              No matching PDF files found in the selected folder.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openPdf(item)}
                className="w-full text-left p-2.5 hover:bg-[#f0f7fd] transition flex items-center justify-between gap-3 text-xs group cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#003057] group-hover:underline flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono truncate">{item.path}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.lastModified && (
                    <span className="text-[10px] text-gray-400 hidden sm:inline">
                      {new Date(item.lastModified).toLocaleDateString()}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-[#0066a1] group-hover:scale-110 transition" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="text-[11px] text-gray-400">
        The folder location is saved in this browser when supported. If access is lost, reselect the folder.
      </div>
    </section>
  );
};
