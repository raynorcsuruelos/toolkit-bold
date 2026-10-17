import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_KITS_DATA, MaintenanceKit, BomItem } from '../../data/kitFinderData';
import { KpodSearch } from '../kpod/KpodSearch';
import {
  Search,
  RotateCcw,
  Copy,
  Check,
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Key,
  Download,
  Upload,
  AlertCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { sha256Sync, generateSaltHex } from '../../utils/crypto';

const LS_KITS_DATA = 'wlkf.data.v1';
const LS_PASSCODE = 'wlkf.passcode.v1';
const DEFAULT_PASSCODE_HASH = 'b22514b7f7d922b4b58cca21e9e8e3aabf5405f0ff696d7247918f2c229b354f';
const DEFAULT_PASSCODE_SALT = '29ec47345a19a6c6c2bdf70747ab4360';

interface KitFinderProps {
  onNotify?: (msg: string, type?: 'info' | 'error' | 'success' | 'warn') => void;
}

export const KitFinder: React.FC<KitFinderProps> = ({ onNotify }) => {
  // Kits state
  const [kits, setKits] = useState<MaintenanceKit[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KITS_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.kits) && parsed.kits.length > 0) {
          return parsed.kits;
        }
      }
    } catch {}
    return INITIAL_KITS_DATA;
  });

  // Current Selection
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedMaintenance, setSelectedMaintenance] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [copiedKit, setCopiedKit] = useState(false);
  const [bomFilter, setBomFilter] = useState('');

  // Reverse Part Search
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // Admin Portal State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [adminTab, setAdminTab] = useState<'kits' | 'upload' | 'data'>('kits');

  // Admin Kits tab filters & modals
  const [adminKitFilter, setAdminKitFilter] = useState('');
  const [adminFamilyFilter, setAdminFamilyFilter] = useState('');
  const [editingKit, setEditingKit] = useState<MaintenanceKit | null>(null);
  const [showKitFormModal, setShowKitFormModal] = useState(false);

  // Admin BOM Upload state
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [uploadTargetKitId, setUploadTargetKitId] = useState<string>('');
  const [previewParsedBom, setPreviewParsedBom] = useState<BomItem[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Persist kits
  const persistKits = (newKits: MaintenanceKit[]) => {
    setKits(newKits);
    try {
      localStorage.setItem(
        LS_KITS_DATA,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          kits: newKits
        })
      );
    } catch {}
  };

  // Step Options logic
  const availableFamilies = useMemo(() => {
    return Array.from(new Set(kits.map(k => k.family))).sort();
  }, [kits]);

  const availableAssets = useMemo(() => {
    if (!selectedFamily) return [];
    return Array.from(new Set(kits.filter(k => k.family === selectedFamily).map(k => k.asset))).sort();
  }, [kits, selectedFamily]);

  const availableMaintenances = useMemo(() => {
    if (!selectedFamily || !selectedAsset) return [];
    return Array.from(
      new Set(
        kits
          .filter(k => k.family === selectedFamily && k.asset === selectedAsset)
          .map(k => k.maintenance)
      )
    ).sort();
  }, [kits, selectedFamily, selectedAsset]);

  const availableLevels = useMemo(() => {
    if (!selectedFamily || !selectedAsset || !selectedMaintenance) return [];
    return Array.from(
      new Set(
        kits
          .filter(
            k =>
              k.family === selectedFamily &&
              k.asset === selectedAsset &&
              k.maintenance === selectedMaintenance
          )
          .map(k => k.level)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [kits, selectedFamily, selectedAsset, selectedMaintenance]);

  // Auto-pick when only 1 option remains
  useEffect(() => {
    if (selectedFamily && !selectedAsset && availableAssets.length === 1) {
      setSelectedAsset(availableAssets[0]);
    } else if (selectedAsset && !selectedMaintenance && availableMaintenances.length === 1) {
      setSelectedMaintenance(availableMaintenances[0]);
    } else if (selectedMaintenance && !selectedLevel && availableLevels.length === 1) {
      setSelectedLevel(availableLevels[0]);
    }
  }, [selectedFamily, selectedAsset, selectedMaintenance, selectedLevel, availableAssets, availableMaintenances, availableLevels]);

  // Found Kit
  const foundKit = useMemo(() => {
    if (!selectedFamily || !selectedAsset || !selectedMaintenance || !selectedLevel) return null;
    return (
      kits.find(
        k =>
          k.family === selectedFamily &&
          k.asset === selectedAsset &&
          k.maintenance === selectedMaintenance &&
          k.level === selectedLevel
      ) || null
    );
  }, [kits, selectedFamily, selectedAsset, selectedMaintenance, selectedLevel]);

  const handleResetFilters = () => {
    setSelectedFamily('');
    setSelectedAsset('');
    setSelectedMaintenance('');
    setSelectedLevel('');
    setIsBomOpen(false);
  };

  const selectSpecificKit = (k: MaintenanceKit) => {
    setSelectedFamily(k.family);
    setSelectedAsset(k.asset);
    setSelectedMaintenance(k.maintenance);
    setSelectedLevel(k.level);
    setIsBomOpen(k.bom.length > 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reverse Part Search Results
  const partSearchResults = useMemo(() => {
    const q = partSearchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const hits: Array<{ kit: MaintenanceKit; kind: 'kit' | 'bom'; row?: BomItem }> = [];
    kits.forEach(k => {
      if (k.kitNumber.toLowerCase().includes(q)) {
        hits.push({ kit: k, kind: 'kit' });
      }
      k.bom.forEach(b => {
        if (b.partNumber.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)) {
          hits.push({ kit: k, kind: 'bom', row: b });
        }
      });
    });
    return hits.slice(0, 100);
  }, [kits, partSearchQuery]);

  // Passcode verification
  const verifyAdminPasscode = (pass: string) => {
    let salt = DEFAULT_PASSCODE_SALT;
    let hash = DEFAULT_PASSCODE_HASH;
    try {
      const stored = localStorage.getItem(LS_PASSCODE);
      if (stored) {
        const p = JSON.parse(stored);
        if (p.salt && p.hash) {
          salt = p.salt;
          hash = p.hash;
        }
      }
    } catch {}

    let out = sha256Sync(salt + ':' + pass);
    for (let i = 0; i < 5000; i++) {
      out = sha256Sync(out + salt);
    }
    return out === hash;
  };

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasscode(gatePassword)) {
      setIsAdminUnlocked(true);
      setShowGateModal(false);
      setGatePassword('');
      setGateError('');
      setShowAdminModal(true);
      onNotify?.('Admin portal unlocked.', 'success');
    } else {
      setGateError('Incorrect passcode.');
    }
  };

  // CSV export for BOM
  const exportBomCsv = (kit: MaintenanceKit) => {
    const headers = ['Part Number', 'Description', 'Quantity'];
    const rows = [headers];
    kit.bom.forEach(b => {
      rows.push([b.partNumber, b.description, b.quantity]);
    });
    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOM_${kit.asset}_${kit.maintenance}_L${kit.level}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-5 space-y-5 max-w-[1250px] mx-auto">
      {/* Module Title / Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-gray-300 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#003057] uppercase tracking-wide flex items-center gap-2">
            <Search className="w-5 h-5 text-[#0066a1]" />
            <span>Find a Maintenance Kit (WL Kit Finder)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select Sonde family, asset, maintenance type, and level to inspect kit part numbers and bills of materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedFamily && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border-2 border-black flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Selection</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) setShowAdminModal(true);
              else setShowGateModal(true);
            }}
            className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow-xs ${
              isAdminUnlocked
                ? 'bg-[#1a7a3c] text-white border-black'
                : 'bg-[#002240] hover:bg-[#001830] text-white border-black/40'
            }`}
          >
            {isAdminUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-300" />}
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* 4-Step Selection Grid */}
      <div className="bg-white p-4 sm:p-5 border-3 sm:border-4 border-black rounded-xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Step 1: Family */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black ${selectedFamily ? 'bg-[#1a7a3c] text-white' : 'bg-[#003057] text-white'}`}>
                1
              </span>
              <span>Tool Family</span>
            </label>
            <select
              value={selectedFamily}
              onChange={e => {
                setSelectedFamily(e.target.value);
                setSelectedAsset('');
                setSelectedMaintenance('');
                setSelectedLevel('');
                setIsBomOpen(false);
              }}
              className="w-full p-2.5 border-2 border-black rounded-lg text-xs font-semibold bg-white cursor-pointer focus:border-[#0066a1] outline-none"
            >
              <option value="">-- Select Family --</option>
              {availableFamilies.map(fam => (
                <option key={fam} value={fam}>
                  {fam}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Asset */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black ${selectedAsset ? 'bg-[#1a7a3c] text-white' : !selectedFamily ? 'bg-gray-200 text-gray-500' : 'bg-[#003057] text-white'}`}>
                2
              </span>
              <span>Asset Name</span>
            </label>
            <select
              value={selectedAsset}
              disabled={!selectedFamily}
              onChange={e => {
                setSelectedAsset(e.target.value);
                setSelectedMaintenance('');
                setSelectedLevel('');
                setIsBomOpen(false);
              }}
              className="w-full p-2.5 border-2 border-black rounded-lg text-xs font-semibold bg-white cursor-pointer focus:border-[#0066a1] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Asset --</option>
              {availableAssets.map(asset => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Maintenance */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black ${selectedMaintenance ? 'bg-[#1a7a3c] text-white' : !selectedAsset ? 'bg-gray-200 text-gray-500' : 'bg-[#003057] text-white'}`}>
                3
              </span>
              <span>Maintenance</span>
            </label>
            <select
              value={selectedMaintenance}
              disabled={!selectedAsset}
              onChange={e => {
                setSelectedMaintenance(e.target.value);
                setSelectedLevel('');
                setIsBomOpen(false);
              }}
              className="w-full p-2.5 border-2 border-black rounded-lg text-xs font-semibold bg-white cursor-pointer focus:border-[#0066a1] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Type --</option>
              {availableMaintenances.map(maint => (
                <option key={maint} value={maint}>
                  {maint}
                </option>
              ))}
            </select>
          </div>

          {/* Step 4: Level */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black ${selectedLevel ? 'bg-[#1a7a3c] text-white' : !selectedMaintenance ? 'bg-gray-200 text-gray-500' : 'bg-[#003057] text-white'}`}>
                4
              </span>
              <span>Level</span>
            </label>
            <select
              value={selectedLevel}
              disabled={!selectedMaintenance}
              onChange={e => {
                setSelectedLevel(e.target.value);
                setIsBomOpen(false);
              }}
              className="w-full p-2.5 border-2 border-black rounded-lg text-xs font-semibold bg-white cursor-pointer focus:border-[#0066a1] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Level --</option>
              {availableLevels.map(lvl => (
                <option key={lvl} value={lvl}>
                  Level {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result Display Card */}
      {foundKit ? (
        <div className="space-y-4 animate-pop-in">
          <div className="bg-white border-3 sm:border-4 border-black rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[#003057] text-white px-4 py-3 border-b-3 border-black flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-base sm:text-lg">{foundKit.asset}</span>
                <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 text-xs font-bold">
                  {foundKit.family}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0066a1] text-white font-mono text-xs font-bold border border-white/20">
                  {foundKit.maintenance} · Level {foundKit.level}
                </span>
              </div>
            </div>

            <div className="p-6 text-center space-y-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Kit Part Number
              </div>

              <div className="text-2xl sm:text-4xl font-mono font-black text-[#c0392b] tracking-tight break-all">
                {foundKit.kitNumber}
              </div>

              {foundKit.notes && (
                <div className="text-xs text-gray-600 italic max-w-lg mx-auto">
                  {foundKit.notes}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 flex-wrap pt-2">
                {!/no kit/i.test(foundKit.kitNumber) && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(foundKit.kitNumber);
                      setCopiedKit(true);
                      setTimeout(() => setCopiedKit(false), 1400);
                      onNotify?.('Copied kit part number to clipboard!', 'success');
                    }}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 rounded-lg text-xs font-bold border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
                  >
                    {copiedKit ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKit ? 'Copied!' : 'Copy Part Number'}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={foundKit.bom.length === 0}
                  onClick={() => setIsBomOpen(!isBomOpen)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition ${
                    foundKit.bom.length > 0
                      ? isBomOpen
                        ? 'bg-[#002240] text-white'
                        : 'bg-[#0066a1] hover:bg-[#004e7c] text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {foundKit.bom.length > 0
                      ? `${isBomOpen ? 'Hide' : 'View'} BOM (${foundKit.bom.length})`
                      : 'No BOM yet'}
                  </span>
                </button>
              </div>

              {foundKit.bomUpdatedAt && (
                <div className="text-[11px] text-gray-400">
                  BOM updated {new Date(foundKit.bomUpdatedAt).toLocaleDateString()}
                  {foundKit.bomUpdatedBy ? ` by ${foundKit.bomUpdatedBy}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Expanded BOM Table */}
          {isBomOpen && foundKit.bom.length > 0 && (
            <div className="border-3 border-black rounded-xl overflow-hidden bg-white shadow-sm animate-pop-in">
              <div className="bg-[#003057] text-white px-4 py-3 border-b-2 border-black flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-300" />
                  <span className="font-bold text-sm">
                    Bill of Materials — {foundKit.asset} ({foundKit.maintenance} L{foundKit.level})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0066a1] text-[11px] font-mono">
                    {foundKit.bom.length} items
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportBomCsv(foundKit)}
                    className="px-3 py-1 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded text-xs font-bold border border-black cursor-pointer flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBomOpen(false)}
                    className="p-1 hover:bg-white/20 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#f0f4f8] border-b-2 border-black flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Filter parts inside this BOM..."
                  value={bomFilter}
                  onChange={e => setBomFilter(e.target.value)}
                  className="w-full p-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#0066a1]"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#002B49] text-white sticky top-0">
                      <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] w-12">#</th>
                      <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px]">Part Number</th>
                      <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px]">Description</th>
                      <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Quantity</th>
                      <th className="py-2 px-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {foundKit.bom
                      .filter(
                        b =>
                          !bomFilter.trim() ||
                          b.partNumber.toLowerCase().includes(bomFilter.toLowerCase()) ||
                          b.description.toLowerCase().includes(bomFilter.toLowerCase())
                      )
                      .map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#f0f7fd] transition-colors">
                          <td className="py-2 px-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#003057]">{item.partNumber}</td>
                          <td className="py-2 px-3 text-gray-800">{item.description}</td>
                          <td className="py-2 px-3 font-mono font-bold text-right text-gray-900">{item.quantity}</td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.partNumber);
                                onNotify?.(`Copied ${item.partNumber}`, 'info');
                              }}
                              className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded cursor-pointer"
                              title="Copy part number"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-[#f8fafc] border-2 border-dashed border-gray-300 rounded-xl text-gray-500 space-y-1">
          <Search className="w-8 h-8 text-gray-400 mx-auto" />
          <div className="font-bold text-sm text-gray-700">
            {selectedFamily
              ? 'Complete the remaining selections above to view the maintenance kit.'
              : 'Select a Sonde tool family above to view its maintenance kit part number.'}
          </div>
          <div className="text-xs text-gray-400">
            Or use the reverse part-number search below to locate which kit uses a specific part.
          </div>
        </div>
      )}

      {/* Reverse Part Number Search */}
      <section className="bg-white p-4 sm:p-5 border-3 sm:border-4 border-black rounded-xl shadow-xs space-y-3">
        <h3 className="font-bold text-sm sm:text-base text-[#003057] uppercase tracking-wide flex items-center gap-2">
          <Search className="w-4 h-4 text-[#0066a1]" />
          <span>Reverse Part-Number Search</span>
        </h3>

        <div className="relative">
          <input
            type="text"
            value={partSearchQuery}
            onChange={e => setPartSearchQuery(e.target.value)}
            placeholder="Enter a part # to find which kits contain it and in what quantity..."
            className="w-full pl-4 pr-10 py-3 text-sm sm:text-base border-3 border-black rounded-lg font-medium focus:border-[#0066a1] outline-none shadow-xs"
          />
          {partSearchQuery && (
            <button
              type="button"
              onClick={() => setPartSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {partSearchQuery.trim().length >= 2 && (
          <div className="border-2 border-black rounded-lg overflow-hidden bg-white shadow-sm max-h-72 overflow-y-auto">
            <div className="bg-[#f0f4f8] px-3 py-2 border-b-2 border-black text-xs font-bold text-gray-600 flex justify-between items-center">
              <span>{partSearchResults.length} match(es) for "{partSearchQuery}"</span>
            </div>

            {partSearchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 italic">
                No kit or BOM contains this part number.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {partSearchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSpecificKit(item.kit)}
                    className="w-full text-left p-2.5 hover:bg-[#f0f7fd] transition flex items-center justify-between gap-3 text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-bold text-[#003057] group-hover:underline text-sm">
                        {item.kit.asset}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#003057] text-white font-mono text-[10px] font-bold">
                        {item.kit.maintenance} L{item.kit.level}
                      </span>
                      <span className="text-gray-500 text-xs hidden sm:inline">
                        {item.kit.family}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.kind === 'kit' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-300">
                          Kit # {item.kit.kitNumber}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#003057]">
                            {item.row?.partNumber}
                          </span>
                          <span className="text-gray-500 truncate max-w-xs hidden md:inline">
                            {item.row?.description}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                            Qty {item.row?.quantity || '—'}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-[#0066a1] group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* kPod PDF Attachments Search */}
      <KpodSearch onNotify={onNotify} />

      {/* Passcode Unlock Gate Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-base">Admin Passcode</h3>
              </div>
              <button
                onClick={() => setShowGateModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGateSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-gray-600">
                Enter the passcode to add, edit or delete kits and upload BOMs.
              </p>

              {gateError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#c0392b] text-[#c0392b] rounded-lg font-bold">
                  {gateError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Passcode
                </label>
                <input
                  type="password"
                  value={gatePassword}
                  onChange={e => {
                    setGatePassword(e.target.value);
                    setGateError('');
                  }}
                  placeholder="Enter admin passcode..."
                  className="w-full p-2 border-2 border-black rounded-lg text-sm font-mono focus:border-[#0066a1] outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowGateModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-sm active:scale-95"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Management Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">WL Kit Finder — Admin Management</h3>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-gray-300 bg-gray-100 px-4 pt-2 gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAdminTab('kits')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'kits'
                    ? 'bg-white border-black text-[#003057]'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Kits List ({kits.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('upload')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'upload'
                    ? 'bg-white border-black text-[#003057]'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                BOM Upload (CSV / JSON)
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('data')}
                className={`px-3 py-2 text-xs font-bold rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'data'
                    ? 'bg-white border-black text-[#003057]'
                    : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Backup &amp; Passcode
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* TAB 1: KITS */}
              {adminTab === 'kits' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Filter kits by tool, part number..."
                          value={adminKitFilter}
                          onChange={e => setAdminKitFilter(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border-2 border-black rounded-lg text-xs"
                        />
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                      <select
                        value={adminFamilyFilter}
                        onChange={e => setAdminFamilyFilter(e.target.value)}
                        className="p-1.5 border-2 border-black rounded-lg text-xs font-medium bg-white"
                      >
                        <option value="">All Families</option>
                        {availableFamilies.map(f => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingKit({
                          family: adminFamilyFilter || availableFamilies[0] || 'Sonic TOOLS',
                          asset: '',
                          maintenance: 'SLS',
                          level: '1',
                          kitNumber: '',
                          notes: '',
                          bomUpdatedAt: null,
                          bomUpdatedBy: null,
                          bom: []
                        });
                        setShowKitFormModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Kit</span>
                    </button>
                  </div>

                  <div className="border-2 border-black rounded-lg overflow-hidden bg-white max-h-80 overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#002B49] text-white sticky top-0">
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">Family</th>
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">Asset</th>
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">Maint</th>
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">Level</th>
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">Kit Part #</th>
                          <th className="py-2 px-3 font-bold uppercase text-[10px]">BOM</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {kits
                          .filter(
                            k =>
                              (!adminFamilyFilter || k.family === adminFamilyFilter) &&
                              (!adminKitFilter.trim() ||
                                [k.family, k.asset, k.maintenance, k.kitNumber, k.notes].some(v =>
                                  v.toLowerCase().includes(adminKitFilter.toLowerCase())
                                ))
                          )
                          .map((k, idx) => (
                            <tr key={idx} className="hover:bg-[#f0f7fd]">
                              <td className="py-2 px-3 text-gray-600">{k.family}</td>
                              <td className="py-2 px-3 font-bold text-[#003057]">{k.asset}</td>
                              <td className="py-2 px-3">{k.maintenance}</td>
                              <td className="py-2 px-3 font-mono">L{k.level}</td>
                              <td className="py-2 px-3 font-mono font-bold text-[#c0392b]">{k.kitNumber}</td>
                              <td className="py-2 px-3">
                                {k.bom.length > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    {k.bom.length} parts
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">None</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingKit(k);
                                      setShowKitFormModal(true);
                                    }}
                                    className="p-1 text-gray-600 hover:text-black rounded"
                                    title="Edit kit"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`Delete kit for ${k.asset} (${k.maintenance} L${k.level})?`)) {
                                        const filtered = kits.filter(x => x !== k);
                                        persistKits(filtered);
                                        onNotify?.(`Kit deleted.`, 'warn');
                                      }
                                    }}
                                    className="p-1 text-red-600 hover:text-red-800 rounded"
                                    title="Delete kit"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: BOM UPLOAD */}
              {adminTab === 'upload' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                    <strong>BOM Upload:</strong> Replace or update the bill of materials for a specific kit or multiple kits using a CSV or JSON file.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Target Kit
                      </label>
                      <select
                        value={uploadTargetKitId}
                        onChange={e => setUploadTargetKitId(e.target.value)}
                        className="w-full p-2 border-2 border-black rounded-lg text-xs bg-white"
                      >
                        <option value="">-- Choose Target Kit --</option>
                        {kits.map((k, i) => (
                          <option key={i} value={`${k.asset}|${k.maintenance}|${k.level}`}>
                            {k.asset} · {k.maintenance} L{k.level} ({k.family})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Select CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv,.json"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadedFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = evt => {
                            try {
                              const text = evt.target?.result as string;
                              const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                              if (lines.length < 2) throw new Error('File has no data rows');
                              const parsed: BomItem[] = [];
                              for (let i = 1; i < lines.length; i++) {
                                const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                                if (cols[0]) {
                                  parsed.push({
                                    partNumber: cols[0],
                                    description: cols[1] || '',
                                    quantity: cols[2] || '1'
                                  });
                                }
                              }
                              setPreviewParsedBom(parsed);
                            } catch (err: any) {
                              alert(`Failed to parse file: ${err.message}`);
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="w-full p-1.5 border-2 border-black rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>

                  {previewParsedBom && (
                    <div className="border-2 border-black rounded-lg p-3 bg-white space-y-2">
                      <div className="font-bold text-xs text-[#003057]">
                        Preview: {previewParsedBom.length} BOM rows parsed from "{uploadedFileName}"
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded divide-y divide-gray-100 text-xs">
                        {previewParsedBom.slice(0, 15).map((row, idx) => (
                          <div key={idx} className="p-1.5 flex justify-between">
                            <span className="font-mono font-bold text-[#003057]">{row.partNumber}</span>
                            <span className="text-gray-600">{row.description}</span>
                            <span className="font-bold">Qty {row.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewParsedBom(null);
                            setUploadedFileName('');
                          }}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!uploadTargetKitId}
                          onClick={() => {
                            const [asset, maint, lvl] = uploadTargetKitId.split('|');
                            const updatedKits = kits.map(k => {
                              if (k.asset === asset && k.maintenance === maint && k.level === lvl) {
                                return {
                                  ...k,
                                  bom: previewParsedBom,
                                  bomUpdatedAt: new Date().toISOString(),
                                  bomUpdatedBy: 'Admin'
                                };
                              }
                              return k;
                            });
                            persistKits(updatedKits);
                            setPreviewParsedBom(null);
                            setUploadedFileName('');
                            onNotify?.(`BOM updated for ${asset}!`, 'success');
                          }}
                          className="px-3 py-1 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded text-xs font-bold disabled:opacity-50"
                        >
                          Apply BOM to Selected Kit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BACKUP & DATA */}
              {adminTab === 'data' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg space-y-2">
                    <h4 className="font-bold text-sm text-[#003057]">Backup &amp; Restore</h4>
                    <p className="text-xs text-gray-600">
                      Download the complete kit and BOM database as JSON.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const data = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), kits }, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `WL_Kit_Finder_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded text-xs font-bold border border-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Backup JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Reset all kits and BOMs back to built-in factory defaults?')) {
                            localStorage.removeItem(LS_KITS_DATA);
                            setKits(INITIAL_KITS_DATA);
                            onNotify?.('Restored built-in factory kit data.', 'info');
                          }
                        }}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded text-xs font-bold border border-red-300 cursor-pointer"
                      >
                        Reset to Built-in Data
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Session Active: <strong>Administrator</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAdminModal(false);
                  setIsAdminUnlocked(false);
                  onNotify?.('Admin session closed and locked.', 'info');
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Sign Out &amp; Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Kit Modal */}
      {showKitFormModal && editingKit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <h3 className="font-bold text-base">
                {editingKit.asset ? `Edit Kit: ${editingKit.asset}` : 'Add New Maintenance Kit'}
              </h3>
              <button
                onClick={() => setShowKitFormModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!editingKit.family || !editingKit.asset || !editingKit.maintenance || !editingKit.level || !editingKit.kitNumber) {
                  alert('All starred fields are required.');
                  return;
                }
                const existingIdx = kits.findIndex(
                  k =>
                    k !== editingKit &&
                    k.family === editingKit.family &&
                    k.asset === editingKit.asset &&
                    k.maintenance === editingKit.maintenance &&
                    k.level === editingKit.level
                );
                if (existingIdx !== -1) {
                  alert(`A kit already exists for ${editingKit.asset} (${editingKit.maintenance} L${editingKit.level})`);
                  return;
                }
                const isExisting = kits.includes(editingKit);
                const updated = isExisting ? [...kits] : [...kits, editingKit];
                persistKits(updated);
                setShowKitFormModal(false);
                onNotify?.(`Saved kit for ${editingKit.asset}!`, 'success');
              }}
              className="p-5 space-y-3 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Tool Family *
                </label>
                <input
                  type="text"
                  value={editingKit.family}
                  onChange={e => setEditingKit({ ...editingKit, family: e.target.value })}
                  placeholder="e.g. Sonic TOOLS, Caliper TOOLS"
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  value={editingKit.asset}
                  onChange={e => setEditingKit({ ...editingKit, asset: e.target.value })}
                  placeholder="e.g. SPDRS-BA"
                  className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Maintenance *
                  </label>
                  <input
                    type="text"
                    value={editingKit.maintenance}
                    onChange={e => setEditingKit({ ...editingKit, maintenance: e.target.value })}
                    placeholder="SLS or WA"
                    className="w-full p-2 border-2 border-black rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Level *
                  </label>
                  <input
                    type="text"
                    value={editingKit.level}
                    onChange={e => setEditingKit({ ...editingKit, level: e.target.value })}
                    placeholder="1, 2, 3..."
                    className="w-full p-2 border-2 border-black rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Kit Part Number *
                </label>
                <input
                  type="text"
                  value={editingKit.kitNumber}
                  onChange={e => setEditingKit({ ...editingKit, kitNumber: e.target.value })}
                  placeholder="e.g. 102057866"
                  className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono font-bold text-[#c0392b]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingKit.notes}
                  onChange={e => setEditingKit({ ...editingKit, notes: e.target.value })}
                  placeholder="e.g. Low temp variant, includes O-rings..."
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowKitFormModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Kit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
