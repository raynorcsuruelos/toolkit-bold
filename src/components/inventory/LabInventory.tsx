import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  db,
  StoreDef,
  InventoryItem,
  HistoryRecord,
  DEFAULT_STORES,
  INITIAL_INVENTORY_ITEMS,
  STORE_PLACEHOLDERS
} from '../../data/inventoryData';
import {
  Package,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  RotateCcw,
  Download,
  Upload,
  Lock,
  Unlock,
  Building2,
  Trash2,
  Edit2,
  Check,
  X,
  History,
  TrendingUp,
  MapPin,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { sha256Sync, generateSaltHex, constantTimeEqual } from '../../utils/crypto';

interface LabInventoryProps {
  onNotify?: (msg: string, type?: 'info' | 'error' | 'success' | 'warn') => void;
}

export const LabInventory: React.FC<LabInventoryProps> = ({ onNotify }) => {
  // Database state
  const [stores, setStores] = useState<StoreDef[]>(DEFAULT_STORES);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [globalThreshold, setGlobalThreshold] = useState<number>(0);

  // Active Store
  const [activeStoreId, setActiveStoreId] = useState<string>('sonde-lab');
  const [showStorePickerModal, setShowStorePickerModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeRemarkPart, setActiveRemarkPart] = useState<string | null>(null);

  // Low stock banner
  const [showLowStockBanner, setShowLowStockBanner] = useState(false);
  const [showAllAlertsModal, setShowAllAlertsModal] = useState(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');

  // Adjust modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustAction, setAdjustAction] = useState<'set' | 'add' | 'sub'>('set');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustThreshold, setAdjustThreshold] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Edit item modal
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editPartNumber, setEditPartNumber] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editQty, setEditQty] = useState<number>(0);
  const [editThreshold, setEditThreshold] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState('');

  // Admin authentication & Panel
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPasswordEye, setShowAdminPasswordEye] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [pendingAction, setPendingAction] = useState<any>(null);

  // Admin panel sub-tabs
  const [adminTab, setAdminTab] = useState<'adjust' | 'edit' | 'add' | 'stores' | 'import' | 'settings'>('adjust');

  // Admin Panel - Add New Part
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  // Admin Panel - Add New Store
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreDesc, setNewStoreDesc] = useState('');
  const [newStorePass, setNewStorePass] = useState('');

  // Admin Panel - Change Master Password
  const [currMasterPass, setCurrMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confMasterPass, setConfMasterPass] = useState('');
  const [passChangeError, setPassChangeError] = useState('');

  // Admin Panel - Global Threshold
  const [tempThreshold, setTempThreshold] = useState<string>('0');

  // Load / Seed DB on start
  useEffect(() => {
    async function initDb() {
      try {
        await db.open();
        // Check stores
        let sCount = await db.stores.count();
        if (sCount === 0) {
          await db.stores.bulkPut(DEFAULT_STORES);
        }
        const loadedStores = await db.stores.toArray();
        setStores(loadedStores.length > 0 ? loadedStores : DEFAULT_STORES);

        // Check inventory
        let iCount = await db.inventory.count();
        if (iCount === 0) {
          const initialItems = [
            ...INITIAL_INVENTORY_ITEMS['sonde-lab'],
            ...INITIAL_INVENTORY_ITEMS['e-lab'],
            ...INITIAL_INVENTORY_ITEMS['whe']
          ];
          await db.inventory.bulkPut(initialItems);
          await logHistory('Database Initialized', 'SYSTEM', 'Seeded default Wireline stores and demo parts', initialItems.length, 'Sonde Lab, E-Lab, WHE');
        }
        const loadedItems = await db.inventory.toArray();
        setInventory(loadedItems);

        // History
        const loadedHistory = await db.history.orderBy('id').reverse().toArray();
        setHistory(loadedHistory);

        // Settings
        const threshSetting = await db.settings.get('globalThreshold');
        if (threshSetting) {
          setGlobalThreshold(Number(threshSetting.value) || 0);
          setTempThreshold(String(threshSetting.value));
        }
      } catch (err: any) {
        console.error('Dexie DB Init Error:', err);
      }
    }
    initDb();
  }, []);

  const refreshFromDb = async () => {
    try {
      const s = await db.stores.toArray();
      setStores(s.length > 0 ? s : DEFAULT_STORES);
      const i = await db.inventory.toArray();
      setInventory(i);
      const h = await db.history.orderBy('id').reverse().toArray();
      setHistory(h);
      const g = await db.settings.get('globalThreshold');
      if (g) setGlobalThreshold(Number(g.value) || 0);
    } catch {}
  };

  const currentStore = useMemo(() => {
    return stores.find(s => s.id === activeStoreId) || stores[0] || DEFAULT_STORES[0];
  }, [stores, activeStoreId]);

  // Items in active store
  const storeItems = useMemo(() => {
    return inventory.filter(i => (i.storeId || 'whe') === currentStore.id);
  }, [inventory, currentStore]);

  // Threshold evaluator
  const getItemThreshold = (item: InventoryItem): number => {
    if (item.threshold !== undefined && item.threshold !== null && item.threshold !== 0) {
      return item.threshold;
    }
    if (item.threshold === 0) return 0;
    return globalThreshold;
  };

  // Low & out of stock items
  const lowStockItems = useMemo(() => {
    return storeItems.filter(i => i.quantity <= getItemThreshold(i));
  }, [storeItems, globalThreshold]);

  const outOfStockItems = useMemo(() => {
    return storeItems.filter(i => i.quantity <= 0);
  }, [storeItems]);

  // Filtered & Paginated items
  const filteredItems = useMemo(() => {
    let result = storeItems;
    if (stockFilter === 'in_stock') {
      result = result.filter(i => i.quantity > getItemThreshold(i));
    } else if (stockFilter === 'low_stock') {
      result = result.filter(i => i.quantity > 0 && i.quantity <= getItemThreshold(i));
    } else if (stockFilter === 'out_of_stock') {
      result = result.filter(i => i.quantity <= 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        i =>
          i.partNumber.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          (i.remarks || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [storeItems, stockFilter, searchQuery, globalThreshold]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / 10));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * 10;
    return filteredItems.slice(start, start + 10);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, stockFilter, activeStoreId]);

  // History Logger
  const logHistory = async (
    action: string,
    partNumber: string,
    description: string,
    qty: number | string,
    note: string = '',
    storeId: string = activeStoreId
  ) => {
    try {
      const rec: HistoryRecord = {
        storeId,
        ts: new Date().toISOString(),
        action,
        partNumber,
        description,
        qty,
        note
      };
      await db.history.add(rec);
      const count = await db.history.count();
      if (count > 1000) {
        const oldestKeys = await db.history.orderBy('id').limit(count - 1000).keys();
        await db.history.bulkDelete(oldestKeys as number[]);
      }
      const loaded = await db.history.orderBy('id').reverse().toArray();
      setHistory(loaded);
    } catch {}
  };

  // Stock Adjustment Engine
  const executeStockAdjustment = async (
    storeId: string,
    partNumber: string,
    action: 'set' | 'add' | 'sub' | 'withdraw',
    val: number,
    note: string = '',
    customThreshold?: number
  ) => {
    const itemKey = `${storeId}:${partNumber}`;
    const existing = await db.inventory.get(itemKey);
    if (!existing) {
      onNotify?.(`Part ${partNumber} not found in this sub-store.`, 'error');
      return false;
    }

    const prevQty = existing.quantity;
    let newQty = prevQty;

    if (action === 'set') {
      newQty = Math.max(0, val);
    } else if (action === 'add') {
      newQty = prevQty + val;
    } else if (action === 'sub') {
      if (val > prevQty) {
        onNotify?.(`Cannot subtract ${val}; current stock is only ${prevQty}.`, 'error');
        return false;
      }
      newQty = prevQty - val;
    } else if (action === 'withdraw') {
      newQty = 0;
    }

    const updatedItem: InventoryItem = {
      ...existing,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
      ...(customThreshold !== undefined && !isNaN(customThreshold) ? { threshold: Math.max(0, customThreshold) } : {})
    };

    await db.inventory.put(updatedItem);

    const actionLabel = action === 'withdraw' ? 'Full Withdraw' : `Adjustment (${action})`;
    const loggedQty = action === 'withdraw' ? prevQty : action === 'set' ? newQty : Math.abs(val);
    await logHistory(
      actionLabel,
      partNumber,
      existing.description,
      loggedQty,
      note || `Stock updated from ${prevQty} to ${newQty}`,
      storeId
    );

    await refreshFromDb();
    onNotify?.(`Stock updated for ${partNumber} (New Qty: ${newQty})`, 'success');
    return true;
  };

  // Quick +1 / -1
  const handleQuickAdd = async (item: InventoryItem) => {
    if (isAdmin) {
      await executeStockAdjustment(item.storeId, item.partNumber, 'add', 1, 'Quick +1 stock added by admin');
    } else {
      setPendingAction({ type: 'add', item });
      setShowAdminAuthModal(true);
    }
  };

  const handleQuickSub = async (item: InventoryItem) => {
    if (item.quantity <= 0) {
      onNotify?.(`Stock for ${item.partNumber} is already 0.`, 'error');
      return;
    }
    if (isAdmin) {
      await executeStockAdjustment(item.storeId, item.partNumber, 'sub', 1, 'Quick -1 stock withdrawn by admin');
    } else {
      setPendingAction({ type: 'sub', item });
      setShowAdminAuthModal(true);
    }
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    if (isAdmin) {
      setAdjustingItem(item);
      setAdjustAction('set');
      setAdjustQty('');
      setAdjustThreshold(item.threshold !== undefined && item.threshold !== null ? String(item.threshold) : '');
      setAdjustNotes('');
      setAdjustError('');
    } else {
      setPendingAction({ type: 'adjust', item });
      setShowAdminAuthModal(true);
    }
  };

  // Password verification
  const checkAdminPassword = async (pwd: string, storeId: string): Promise<{ success: boolean; isSuper: boolean; message?: string }> => {
    // 1. Check Master Admin password
    const masterSetting = await db.settings.get('adminPassHash');
    if (masterSetting && masterSetting.value) {
      const { hash, salt } = masterSetting.value;
      let out = sha256Sync(salt + ':' + pwd);
      if (constantTimeEqual(out, hash)) {
        return { success: true, isSuper: true };
      }
    } else {
      // Default fallback master: WLAdmin2025
      if (pwd === 'WLAdmin2025') {
        return { success: true, isSuper: true };
      }
    }

    // 2. Check Store-specific password
    const storeObj = stores.find(s => s.id === storeId);
    if (storeObj && storeObj.adminPasswordHash) {
      const { hash, salt } = storeObj.adminPasswordHash;
      let out = sha256Sync(salt + ':' + pwd);
      if (constantTimeEqual(out, hash)) {
        return { success: true, isSuper: false };
      }
    } else {
      // Default fallback store password: e.g. SONDEAdmin2025
      if (storeObj && pwd === `${storeObj.code}Admin2025`) {
        return { success: true, isSuper: false };
      }
    }

    return { success: false, isSuper: false, message: 'Incorrect password for this store.' };
  };

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    const res = await checkAdminPassword(adminPasswordInput, currentStore.id);
    if (res.success) {
      setIsAdmin(true);
      setIsMaster(res.isSuper);
      setShowAdminAuthModal(false);
      setAdminPasswordInput('');
      onNotify?.(res.isSuper ? 'Master Admin authenticated.' : `Store Admin authenticated for ${currentStore.name}.`, 'success');

      // Execute pending action if any
      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        if (action.type === 'add' && action.item) {
          await executeStockAdjustment(action.item.storeId, action.item.partNumber, 'add', 1, 'Quick +1 stock added by admin');
        } else if (action.type === 'sub' && action.item) {
          await executeStockAdjustment(action.item.storeId, action.item.partNumber, 'sub', 1, 'Quick -1 stock withdrawn by admin');
        } else if (action.type === 'adjust' && action.item) {
          setAdjustingItem(action.item);
          setAdjustAction('set');
          setAdjustQty('');
          setAdjustThreshold(action.item.threshold !== undefined && action.item.threshold !== null ? String(action.item.threshold) : '');
          setAdjustNotes('');
          setAdjustError('');
        }
      } else {
        setShowAdminPanelModal(true);
      }
    } else {
      setAdminAuthError(res.message || 'Incorrect password.');
    }
  };

  // CSV Export for current store
  const exportStoreCsv = () => {
    if (storeItems.length === 0) {
      onNotify?.(`No inventory items to export for ${currentStore.name}.`, 'error');
      return;
    }

    const headers = ['Store', 'Part Number', 'Description', 'Location', 'Quantity', 'Threshold', 'Remarks', 'Last Updated'];
    const rows = [headers];
    storeItems.forEach(item => {
      rows.push([
        currentStore.name,
        item.partNumber,
        item.description,
        item.location,
        String(item.quantity),
        String(getItemThreshold(item)),
        item.remarks || '',
        item.updatedAt
      ]);
    });

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WLLab_${currentStore.code}_Inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Inventory CSV exported for ${currentStore.name}!`, 'success');
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1250px] mx-auto">
      {/* Module Title & Store Navigation Bar */}
      <div className="bg-white border-3 sm:border-4 border-black rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowStorePickerModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg border-2 border-black font-bold text-xs sm:text-sm cursor-pointer shadow-xs active:scale-95 transition"
            title="Click to switch Wireline Sub-Store"
          >
            <Building2 className="w-4 h-4 text-amber-300" />
            <span>Store: {currentStore.name}</span>
            <span className="text-[10px] font-mono bg-[#0066a1] px-1.5 py-0.5 rounded border border-white/20">
              {currentStore.code}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowLowStockBanner(!showLowStockBanner)}
            className="relative px-3 py-1.5 bg-[#f0f4f8] hover:bg-gray-200 text-[#003057] rounded-lg border-2 border-black font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition flex items-center gap-1.5"
            title="Low stock notifications"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${lowStockItems.length > 0 ? 'text-[#c0392b]' : 'text-emerald-600'}`} />
            <span>Alerts</span>
            {lowStockItems.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-[#c0392b] text-white rounded-full text-[10px] font-mono font-bold animate-pulse">
                {lowStockItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 bg-[#f0f4f8] hover:bg-gray-200 text-[#003057] rounded-lg border-2 border-black font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#0066a1]" />
            <span className="hidden sm:inline">Usage History &amp; Trends</span>
            <span className="sm:hidden">History</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border-2 border-[#1a7a3c]">
              <button
                type="button"
                onClick={() => setShowAdminPanelModal(true)}
                className="px-2.5 py-1 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded font-bold text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isMaster ? 'Master Admin' : 'Store Admin'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdmin(false);
                  setIsMaster(false);
                  onNotify?.('Admin privileges locked.', 'info');
                }}
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded cursor-pointer"
                title="Lock Admin Mode"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPendingAction(null);
                setAdminPasswordInput('');
                setAdminAuthError('');
                setShowAdminAuthModal(true);
              }}
              className="px-3 py-1.5 bg-[#2c3e50] hover:bg-[#34495e] text-white rounded-lg text-xs font-bold border-2 border-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Admin</span>
            </button>
          )}

          <a
            href="https://imapp.bluemm.gt.slb.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#0092d1] hover:bg-[#007cb3] text-white rounded-lg text-xs font-bold border-2 border-[#0066a1] flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BlueMM</span>
          </a>
        </div>
      </div>

      {/* Low-Stock Quick Notification Dropdown */}
      {showLowStockBanner && (
        <div className="bg-[#fff9e6] border-3 border-black p-4 rounded-xl text-[#5a3200] shadow-sm space-y-3 animate-pop-in">
          <div className="flex items-center justify-between border-b border-amber-300 pb-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Low-Stock &amp; Out-of-Stock Alerts ({lowStockItems.length}) — {currentStore.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLowStockBanner(false);
                  setShowAllAlertsModal(true);
                }}
                className="text-xs font-bold px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded border border-black cursor-pointer shadow-xs"
              >
                Show All Alerts
              </button>
              <button
                type="button"
                onClick={() => setShowLowStockBanner(false)}
                className="p-1 text-amber-900 hover:text-black hover:bg-amber-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-2 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>All inventory stock levels in {currentStore.name} are healthy!</span>
            </div>
          ) : (
            <div className="divide-y divide-amber-200 text-xs">
              {lowStockItems.slice(0, 4).map(item => {
                const isZero = item.quantity <= 0;
                return (
                  <div key={item.partNumber} className="py-2 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isZero ? 'bg-[#c0392b]' : 'bg-[#e67e22]'}`} />
                      <span className="font-mono font-bold text-black">{item.partNumber}</span>
                      <span className="text-gray-700 hidden sm:inline">— {item.description}</span>
                      <span className="text-gray-500 font-mono text-[11px]">({item.location})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isZero ? 'text-[#c0392b]' : 'text-amber-900'}`}>
                        Qty: {item.quantity} (min: {getItemThreshold(item)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(item)}
                        className="px-2.5 py-0.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded text-xs font-bold border border-black cursor-pointer shadow-xs"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 4 && (
                <div className="pt-2 text-xs text-amber-800 flex justify-between items-center">
                  <span>...and {lowStockItems.length - 4} more parts require replenishment.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLowStockBanner(false);
                      setShowAllAlertsModal(true);
                    }}
                    className="underline font-bold text-[#0066a1] cursor-pointer"
                  >
                    View all alerts →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Section */}
      <div className="bg-white p-4 sm:p-5 border-3 sm:border-4 border-black rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-[#003057] uppercase tracking-wide flex items-center gap-2">
            <Search className="w-4 h-4 text-[#0066a1]" />
            <span>Search {currentStore.name} Inventory</span>
          </h3>
          <span className="text-[11px] font-mono text-gray-500">
            Dexie IndexedDB Engine · 0ms Instant Response
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Type part number, tool name, shelf/bin location, or remark (${STORE_PLACEHOLDERS[currentStore.id] || ''})...`}
            className="w-full pl-4 pr-10 py-2.5 text-sm sm:text-base border-3 border-black rounded-lg font-medium focus:border-[#0066a1] outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
          <span className="font-bold text-gray-600 mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 rounded-md font-semibold border-2 border-black transition cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-[#003057] text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            All Items ({storeItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1 rounded-md font-semibold border-2 border-black transition cursor-pointer ${
              stockFilter === 'in_stock'
                ? 'bg-[#1a7a3c] text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            In Stock ({Math.max(0, storeItems.length - lowStockItems.length)})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1 rounded-md font-semibold border-2 border-black transition cursor-pointer ${
              stockFilter === 'low_stock'
                ? 'bg-[#d97706] text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            Low Stock ({lowStockItems.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1 rounded-md font-semibold border-2 border-black transition cursor-pointer ${
              stockFilter === 'out_of_stock'
                ? 'bg-[#c0392b] text-white'
                : 'bg-red-50 hover:bg-red-100 text-red-800'
            }`}
          >
            Out of Stock ({outOfStockItems.length})
          </button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border-3 sm:border-4 border-black rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#003057] text-white select-none">
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] border-r border-blue-900/60 whitespace-nowrap">
                  Part Number
                </th>
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] border-r border-blue-900/60">
                  Description
                </th>
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] border-r border-blue-900/60 whitespace-nowrap">
                  Location
                </th>
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] border-r border-blue-900/60 text-center whitespace-nowrap min-w-[140px]">
                  Stock Quantity
                </th>
                <th className="py-2.5 px-2.5 font-bold uppercase tracking-wider text-[11px] border-r border-blue-900/60 text-center whitespace-nowrap w-16">
                  Min
                </th>
                <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] text-center whitespace-nowrap">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 italic">
                    No matching inventory items found for "{searchQuery}" in {currentStore.name}.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const thresh = getItemThreshold(item);
                  const isZero = item.quantity <= 0;
                  const isLow = !isZero && item.quantity <= thresh;

                  let statusBadge = (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#1a7a3c] border border-emerald-400">
                      In Stock
                    </span>
                  );
                  if (isZero) {
                    statusBadge = (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#c0392b] border border-red-400">
                        Out of Stock
                      </span>
                    );
                  } else if (isLow) {
                    statusBadge = (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#d97706] border border-amber-400">
                        Low Stock
                      </span>
                    );
                  }

                  return (
                    <tr key={item.partNumber} className="hover:bg-[#f0f7fd] transition-colors group">
                      <td className="py-2.5 px-3 font-mono font-bold text-gray-950 border-r border-gray-100 whitespace-nowrap">
                        {item.partNumber}
                      </td>

                      <td className="py-2.5 px-3 text-gray-900 font-medium border-r border-gray-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.description}</span>
                          {item.remarks && (
                            <div className="relative inline-flex items-center group/balloon">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveRemarkPart(activeRemarkPart === item.partNumber ? null : item.partNumber)
                                }
                                className="p-0.5 text-[#0066a1] hover:text-[#004e7c] rounded cursor-pointer"
                                title="Click or hover to inspect remarks"
                              >
                                <MessageSquare className="w-3.5 h-3.5 fill-[#0066a1]/20 text-[#0066a1]" />
                              </button>

                              <div
                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-56 p-2.5 bg-gray-950 text-white text-[11px] rounded-lg shadow-xl border border-gray-700 transition ${
                                  activeRemarkPart === item.partNumber ? 'block' : 'hidden group-hover/balloon:block'
                                }`}
                              >
                                <div className="font-bold text-amber-300 uppercase tracking-wider text-[10px] mb-1">
                                  Remark / Note
                                </div>
                                <p className="text-gray-200 leading-relaxed">{item.remarks}</p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-950" />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-gray-700 border-r border-gray-100 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 font-medium">
                          <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{item.location}</span>
                        </span>
                      </td>

                      {/* Stock Quantity Cell with - / count / + */}
                      <td className="py-2.5 px-3 border-r border-gray-100 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleQuickSub(item)}
                            disabled={item.quantity <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-red-50 hover:border-red-400 border border-gray-300 text-gray-800 hover:text-red-700 font-bold active:scale-90 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title={isAdmin ? 'Withdraw -1 unit' : 'Withdraw Stock (Requires Admin Password)'}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(item)}
                            className={`text-sm sm:text-base font-black px-2.5 py-0.5 rounded min-w-[42px] cursor-pointer transition ${
                              isZero
                                ? 'text-[#c0392b] bg-red-50 hover:bg-red-100'
                                : isLow
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                                : 'text-gray-900 bg-white hover:bg-gray-100'
                            }`}
                            title="Click to adjust stock quantity and threshold"
                          >
                            {item.quantity}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-emerald-50 hover:border-emerald-400 border border-gray-300 text-gray-800 hover:text-emerald-700 font-bold active:scale-90 transition cursor-pointer"
                            title={isAdmin ? 'Add +1 unit' : 'Add Stock (Requires Admin Password)'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          {!isAdmin && (
                            <span title="Action requires Admin Authentication" className="ml-0.5 text-gray-400">
                              <Lock className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 text-center text-gray-700 font-bold border-r border-gray-100 whitespace-nowrap w-16 text-xs">
                        {thresh}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-3 bg-[#f0f4f8] border-t-3 border-black flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs font-semibold text-gray-600">
          <div>
            Showing <strong>{filteredItems.length > 0 ? (currentPage - 1) * 10 + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * 10, filteredItems.length)}</strong> of{' '}
            <strong>{filteredItems.length}</strong> items in <strong>{currentStore.name}</strong>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 rounded border border-gray-300 font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2 font-bold text-gray-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 rounded border border-gray-300 font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUB-STORE SELECTOR MODAL */}
      {showStorePickerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">Switch Wireline Sub-Store</h3>
              </div>
              <button
                onClick={() => setShowStorePickerModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs text-gray-600 font-semibold mb-1">
                Select sub-store or shop location:
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {stores.map(s => {
                  const isCur = s.id === activeStoreId;
                  const count = inventory.filter(i => (i.storeId || 'whe') === s.id).length;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setActiveStoreId(s.id);
                        setShowStorePickerModal(false);
                        onNotify?.(`Switched to ${s.name}`, 'info');
                      }}
                      className={`p-3.5 rounded-xl border-3 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isCur
                          ? 'border-[#0066a1] bg-[#f0f7fd] shadow-md ring-2 ring-[#0066a1]/30'
                          : 'border-black hover:border-[#0066a1] hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm sm:text-base">{s.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#003057] text-white">
                            {s.code}
                          </span>
                          {isCur && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Active Store
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{s.description}</p>
                        <div className="text-[11px] text-gray-500 font-mono">
                          📦 {count} Inventory Items
                        </div>
                      </div>

                      <div className="mt-1">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isCur ? 'border-[#0066a1] bg-[#0066a1] text-white' : 'border-gray-400 bg-white'
                          }`}
                        >
                          {isCur && <Check className="w-3.5 h-3.5 stroke-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStorePickerModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Adjust Stock: {adjustingItem.partNumber}</h3>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                setAdjustError('');
                const val = parseInt(adjustQty, 10);
                if (isNaN(val) || val < 0) {
                  setAdjustError('Please enter a valid non-negative number.');
                  return;
                }
                const thresh = adjustThreshold.trim() === '' ? undefined : parseInt(adjustThreshold, 10);
                const ok = await executeStockAdjustment(
                  adjustingItem.storeId,
                  adjustingItem.partNumber,
                  adjustAction,
                  val,
                  adjustNotes,
                  thresh
                );
                if (ok) setAdjustingItem(null);
              }}
              className="p-5 space-y-4 text-xs sm:text-sm"
            >
              <div className="p-3 bg-[#f0f7fd] border-2 border-[#0066a1]/30 rounded-lg text-xs space-y-1">
                <div className="font-bold text-[#003057]">{adjustingItem.description}</div>
                <div className="text-gray-600 flex justify-between">
                  <span>Location: <strong>{adjustingItem.location}</strong></span>
                  <span>Current Stock: <strong className="text-sm text-black">{adjustingItem.quantity}</strong></span>
                </div>
              </div>

              {adjustError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#c0392b] text-[#c0392b] font-bold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Action
                  </label>
                  <select
                    value={adjustAction}
                    onChange={e => setAdjustAction(e.target.value as any)}
                    className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold bg-white"
                  >
                    <option value="set">Set New Quantity</option>
                    <option value="add">Add (+)</option>
                    <option value="sub">Subtract (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Quantity Value *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    placeholder="Enter count..."
                    className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono font-bold"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Low-Stock Threshold Min (0 = alert when depleted)
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustThreshold}
                  onChange={e => setAdjustThreshold(e.target.value)}
                  placeholder={`Global default is ${globalThreshold}`}
                  className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Reason / Notes for Audit Trail
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Job #421 prep, replenishment, damaged..."
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-200">
                <button
                  type="button"
                  disabled={adjustingItem.quantity <= 0}
                  onClick={async () => {
                    if (window.confirm(`Withdraw all ${adjustingItem.quantity} unit(s) of "${adjustingItem.partNumber}"? Stock will be set to 0.`)) {
                      await executeStockAdjustment(adjustingItem.storeId, adjustingItem.partNumber, 'withdraw', 0, adjustNotes || 'Full withdraw');
                      setAdjustingItem(null);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#c0392b] hover:bg-[#962d22] text-white rounded-lg text-xs font-bold border border-black cursor-pointer disabled:opacity-40"
                >
                  Withdraw All ({adjustingItem.quantity})
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded-lg text-xs font-bold border-2 border-black shadow-xs"
                  >
                    Apply Update
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY & USAGE TRENDS MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base sm:text-lg">Inventory History &amp; Usage Trends</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs sm:text-sm">
              {/* Trends bar chart */}
              <div>
                <h4 className="font-bold text-xs text-[#003057] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Top Consumed &amp; Withdrawn Items ({currentStore.name})</span>
                </h4>

                {(() => {
                  const storeHist = history.filter(h => !h.storeId || h.storeId === currentStore.id);
                  const totals: Record<string, { desc: string; totalWithdrawn: number }> = {};
                  storeHist.forEach(h => {
                    const act = (h.action || '').toLowerCase();
                    if (act.includes('withdraw') || act.includes('sub') || act.includes('-1')) {
                      const pn = h.partNumber;
                      if (!totals[pn]) totals[pn] = { desc: h.description, totalWithdrawn: 0 };
                      const q = typeof h.qty === 'number' ? h.qty : parseInt(String(h.qty), 10) || 0;
                      totals[pn].totalWithdrawn += q;
                    }
                  });

                  const sorted = Object.entries(totals)
                    .sort((a, b) => b[1].totalWithdrawn - a[1].totalWithdrawn)
                    .slice(0, 6);
                  const maxVal = sorted.length > 0 ? Math.max(...sorted.map(s => s[1].totalWithdrawn), 1) : 1;

                  if (sorted.length === 0) {
                    return (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 text-center">
                        No withdrawal or deduction transactions logged yet for this store.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 bg-[#f8fafc] p-3 rounded-lg border-2 border-gray-200">
                      {sorted.map(([pn, dat]) => {
                        const pct = Math.round((dat.totalWithdrawn / maxVal) * 100);
                        return (
                          <div key={pn} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-mono font-bold text-[#003057]">
                                {pn} <span className="font-sans font-normal text-gray-600">— {dat.desc}</span>
                              </span>
                              <span className="font-bold text-[#0066a1]">{dat.totalWithdrawn} units consumed</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden border border-gray-300">
                              <div
                                className="bg-[#0066a1] h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Audit trail */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="font-bold text-xs text-[#003057] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>Transaction &amp; Stock Audit Trail ({history.length})</span>
                  </h4>
                  <input
                    type="text"
                    placeholder="Filter audit log..."
                    value={historyFilter}
                    onChange={e => setHistoryFilter(e.target.value)}
                    className="p-1 px-2 border border-gray-300 rounded text-xs w-48"
                  />
                </div>

                <div className="border-2 border-gray-300 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-200 bg-white text-xs">
                  {history
                    .filter(
                      h =>
                        (!historyFilter.trim() ||
                          h.partNumber.toLowerCase().includes(historyFilter.toLowerCase()) ||
                          h.description.toLowerCase().includes(historyFilter.toLowerCase()) ||
                          h.action.toLowerCase().includes(historyFilter.toLowerCase()) ||
                          (h.note || '').toLowerCase().includes(historyFilter.toLowerCase()))
                    )
                    .map((rec, i) => (
                      <div key={i} className="p-2.5 hover:bg-gray-50 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-black">{rec.partNumber}</span>
                            <span className="font-medium text-gray-700">{rec.description}</span>
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold">
                              {rec.action}
                            </span>
                          </div>
                          <div className="text-gray-500 text-[11px] mt-0.5">
                            {rec.qty !== '' && (
                              <span className="font-semibold text-gray-800">Qty: {rec.qty} · </span>
                            )}
                            <span>{rec.note || 'No notes provided'}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                          {new Date(rec.ts).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center">
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Clear all audit transaction logs?')) {
                    await db.history.clear();
                    setHistory([]);
                    onNotify?.('Audit history cleared.', 'info');
                  }
                }}
                className="px-3 py-1.5 bg-[#c0392b] hover:bg-[#962d22] text-white rounded text-xs font-bold border border-black cursor-pointer"
              >
                Clear History
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN AUTHENTICATION MODAL */}
      {showAdminAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Admin Authentication</h3>
              </div>
              <button
                onClick={() => {
                  setShowAdminAuthModal(false);
                  setPendingAction(null);
                }}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Enter administrator password for <strong>{currentStore.name}</strong> (or master administrator password) to authorize this action.
                </span>
              </div>

              {adminAuthError && (
                <div className="p-2.5 bg-red-50 border border-red-300 text-[#c0392b] font-bold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminAuthError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPasswordEye ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={e => {
                      setAdminPasswordInput(e.target.value);
                      setAdminAuthError('');
                    }}
                    placeholder={`Password (Default: ${currentStore.code}Admin2025)`}
                    className="w-full pl-3 pr-10 py-2 border-2 border-black rounded-lg text-sm font-mono font-bold focus:border-[#0066a1] outline-none"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordEye(!showAdminPasswordEye)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black cursor-pointer"
                  >
                    {showAdminPasswordEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminAuthModal(false);
                    setPendingAction(null);
                  }}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs active:scale-95"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL ADMIN MANAGEMENT PANEL MODAL */}
      {showAdminPanelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">
                    Wireline Lab Admin Panel
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Managing Store: <strong className="text-white">{currentStore.name}</strong> ({currentStore.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminPanelModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b-2 border-gray-300 bg-gray-100 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdminTab('adjust')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'adjust' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                📋 Adjust Stock
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('edit')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'edit' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                ✏️ Edit Parts ({storeItems.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('add')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'add' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                ➕ Add Part
              </button>
              {isMaster && (
                <button
                  type="button"
                  onClick={() => setAdminTab('stores')}
                  className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                    adminTab === 'stores' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                  }`}
                >
                  🏢 Sub-Stores ({stores.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setAdminTab('import')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'import' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                📥 Import / Export
              </button>
              {isMaster && (
                <button
                  type="button"
                  onClick={() => setAdminTab('settings')}
                  className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                    adminTab === 'settings' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                  }`}
                >
                  🔑 Master Settings
                </button>
              )}
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* TAB: ADJUST */}
              {adminTab === 'adjust' && (
                <div className="space-y-3">
                  <div className="font-bold text-[#003057] uppercase tracking-wide">
                    Select a part to adjust in {currentStore.name}:
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                    {storeItems.map(item => (
                      <div
                        key={item.partNumber}
                        className="p-2 hover:bg-[#f0f7fd] rounded flex items-center justify-between border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <span className="font-mono font-bold text-black">{item.partNumber}</span>
                          <span className="text-gray-600 ml-2">{item.description}</span>
                          <span className="text-gray-400 font-mono text-[11px] ml-2">({item.location})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">Stock: {item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAdminPanelModal(false);
                              handleOpenAdjust(item);
                            }}
                            className="px-2.5 py-1 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded font-bold text-xs"
                          >
                            Adjust
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: EDIT / DELETE PARTS */}
              {adminTab === 'edit' && (
                <div className="space-y-3">
                  <div className="font-bold text-[#003057] uppercase tracking-wide flex justify-between items-center">
                    <span>Manage parts in {currentStore.name}:</span>
                  </div>
                  <div className="border border-gray-300 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-200 bg-white">
                    {storeItems.map(item => (
                      <div key={item.partNumber} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <div className="font-mono font-bold text-black">{item.partNumber}</div>
                          <div className="text-xs text-gray-600">
                            {item.description} · 📍{item.location} · Qty: <strong>{item.quantity}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditPartNumber(item.partNumber);
                              setEditDescription(item.description);
                              setEditLocation(item.location);
                              setEditQty(item.quantity);
                              setEditThreshold(item.threshold !== undefined && item.threshold !== null ? String(item.threshold) : '');
                              setEditRemarks(item.remarks || '');
                              setEditError('');
                            }}
                            className="p-1.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded text-xs font-bold"
                            title="Edit part details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Delete part "${item.partNumber}" from ${currentStore.name}?`)) {
                                await db.inventory.delete(item.id);
                                await logHistory('Deleted', item.partNumber, item.description, 0, 'Part deleted by admin', currentStore.id);
                                await refreshFromDb();
                                onNotify?.(`Deleted ${item.partNumber}`, 'warn');
                              }
                            }}
                            className="p-1.5 bg-[#c0392b] hover:bg-[#962d22] text-white rounded text-xs font-bold"
                            title="Delete part"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: ADD NEW ITEM */}
              {adminTab === 'add' && (
                <form
                  onSubmit={async e => {
                    e.preventDefault();
                    if (!newPartNumber.trim() || !newDescription.trim() || !newLocation.trim()) {
                      alert('Part Number, Description, and Location are required.');
                      return;
                    }
                    const q = parseInt(newQty, 10);
                    if (isNaN(q) || q < 0) {
                      alert('Enter a valid non-negative quantity.');
                      return;
                    }
                    const exists = storeItems.some(i => i.partNumber.toLowerCase() === newPartNumber.trim().toLowerCase());
                    if (exists) {
                      alert(`Part ${newPartNumber} already exists in ${currentStore.name}.`);
                      return;
                    }

                    const newItem: InventoryItem = {
                      id: `${currentStore.id}:${newPartNumber.trim()}`,
                      storeId: currentStore.id,
                      partNumber: newPartNumber.trim(),
                      description: newDescription.trim(),
                      location: newLocation.trim(),
                      quantity: q,
                      threshold: newThreshold.trim() === '' ? 0 : Math.max(0, parseInt(newThreshold, 10) || 0),
                      remarks: newRemarks.trim() || 'DemoParts only/raynor',
                      updatedAt: new Date().toISOString()
                    };

                    await db.inventory.put(newItem);
                    await logHistory('New Item Added', newItem.partNumber, newItem.description, newItem.quantity, newItem.remarks || '', currentStore.id);
                    await refreshFromDb();

                    setNewPartNumber('');
                    setNewDescription('');
                    setNewLocation('');
                    setNewQty('');
                    setNewThreshold('');
                    setNewRemarks('');
                    onNotify?.(`Added part ${newItem.partNumber} to ${currentStore.name}!`, 'success');
                  }}
                  className="space-y-3"
                >
                  <div className="font-bold text-[#003057] uppercase tracking-wide">
                    Add New Inventory Item to {currentStore.name}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Part Number *
                      </label>
                      <input
                        type="text"
                        value={newPartNumber}
                        onChange={e => setNewPartNumber(e.target.value)}
                        placeholder="e.g. WL-2040-HD"
                        className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Location / Bin *
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={e => setNewLocation(e.target.value)}
                        placeholder="e.g. Shelf B-4, Drawer 2"
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      placeholder={STORE_PLACEHOLDERS[currentStore.id] || 'e.g. Part description'}
                      className="w-full p-2 border-2 border-black rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newQty}
                        onChange={e => setNewQty(e.target.value)}
                        placeholder="0"
                        className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Low-Stock Alert Min
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newThreshold}
                        onChange={e => setNewThreshold(e.target.value)}
                        placeholder={`Global default is ${globalThreshold}`}
                        className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={newRemarks}
                      onChange={e => setNewRemarks(e.target.value)}
                      placeholder="DemoParts only/raynor"
                      className="w-full p-2 border-2 border-black rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs"
                  >
                    Add Part to {currentStore.name}
                  </button>
                </form>
              )}

              {/* TAB: SUB-STORES (MASTER ADMIN) */}
              {isMaster && adminTab === 'stores' && (
                <div className="space-y-5">
                  <div>
                    <div className="font-bold text-[#003057] uppercase tracking-wide mb-2">
                      Configured Wireline Sub-Stores ({stores.length})
                    </div>
                    <div className="space-y-2.5">
                      {stores.map(s => (
                        <div
                          key={s.id}
                          className="p-3 bg-gray-50 border-2 border-gray-300 rounded-lg flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              <span>{s.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#003057] text-white font-mono">
                                {s.code}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                          </div>
                          {stores.length > 1 && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete sub-store "${s.name}" and all its parts?`)) {
                                  await db.stores.delete(s.id);
                                  const itemsToDelete = inventory.filter(i => (i.storeId || 'whe') === s.id).map(i => i.id);
                                  if (itemsToDelete.length > 0) {
                                    await db.inventory.bulkDelete(itemsToDelete);
                                  }
                                  await refreshFromDb();
                                  if (activeStoreId === s.id) {
                                    const rem = stores.find(x => x.id !== s.id);
                                    if (rem) setActiveStoreId(rem.id);
                                  }
                                  onNotify?.(`Store ${s.name} removed.`, 'warn');
                                }
                              }}
                              className="p-1.5 text-red-600 hover:text-red-800 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Create New Store Form */}
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      if (!newStoreName.trim() || !newStoreCode.trim() || !newStorePass.trim()) {
                        alert('Store Name, Code, and Password are required.');
                        return;
                      }
                      if (newStorePass.length < 6) {
                        alert('Password must be at least 6 characters.');
                        return;
                      }
                      const id = newStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      const salt = generateSaltHex(16);
                      const hash = sha256Sync(salt + ':' + newStorePass);

                      const newStore: StoreDef = {
                        id,
                        name: newStoreName.trim(),
                        code: newStoreCode.trim().toUpperCase(),
                        description: newStoreDesc.trim() || `${newStoreName.trim()} Store`,
                        adminPasswordHash: { hash, salt },
                        createdAt: new Date().toISOString()
                      };

                      await db.stores.put(newStore);
                      await refreshFromDb();
                      setNewStoreName('');
                      setNewStoreCode('');
                      setNewStoreDesc('');
                      setNewStorePass('');
                      onNotify?.(`Created sub-store ${newStore.name}!`, 'success');
                    }}
                    className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl space-y-3"
                  >
                    <div className="font-bold text-xs text-[#003057] uppercase tracking-wide">
                      Create New Sub-Store
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Store Name *
                        </label>
                        <input
                          type="text"
                          value={newStoreName}
                          onChange={e => setNewStoreName(e.target.value)}
                          placeholder="e.g. Perforating Lab"
                          className="w-full p-2 border-2 border-black rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                          Store Code * (Short)
                        </label>
                        <input
                          type="text"
                          value={newStoreCode}
                          onChange={e => setNewStoreCode(e.target.value)}
                          placeholder="e.g. PERF"
                          className="w-full p-2 border-2 border-black rounded-lg text-xs uppercase font-mono font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Store Admin Password *
                      </label>
                      <input
                        type="password"
                        value={newStorePass}
                        onChange={e => setNewStorePass(e.target.value)}
                        placeholder="Min 6 characters..."
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs"
                    >
                      Create Store
                    </button>
                  </form>
                </div>
              )}

              {/* TAB: IMPORT / EXPORT */}
              {adminTab === 'import' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                    Export or import stock records for <strong>{currentStore.name}</strong> as CSV.
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={exportStoreCsv}
                      className="px-4 py-2 bg-[#1a7a3c] hover:bg-[#145a2c] text-white font-bold rounded-lg border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV for {currentStore.name}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Clear all inventory items in "${currentStore.name}"?`)) {
                          const ids = storeItems.map(i => i.id);
                          await db.inventory.bulkDelete(ids);
                          await logHistory('Clear All', 'SYSTEM', `All inventory cleared for ${currentStore.name}`, 0, 'Store emptied', currentStore.id);
                          await refreshFromDb();
                          onNotify?.(`Inventory cleared for ${currentStore.name}.`, 'warn');
                        }
                      }}
                      className="px-4 py-2 bg-[#c0392b] hover:bg-[#962d22] text-white font-bold rounded-lg border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Store Inventory</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: MASTER SETTINGS */}
              {isMaster && adminTab === 'settings' && (
                <div className="space-y-5">
                  {/* Change master password */}
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      setPassChangeError('');
                      if (newMasterPass.length < 6) {
                        setPassChangeError('New password must be at least 6 characters.');
                        return;
                      }
                      if (newMasterPass !== confMasterPass) {
                        setPassChangeError('Passwords do not match.');
                        return;
                      }
                      const salt = generateSaltHex(16);
                      const hash = sha256Sync(salt + ':' + newMasterPass);
                      await db.settings.put({
                        key: 'adminPassHash',
                        value: { hash, salt, lastUpdated: new Date().toISOString() }
                      });
                      setCurrMasterPass('');
                      setNewMasterPass('');
                      setConfMasterPass('');
                      onNotify?.('Master admin password updated successfully!', 'success');
                    }}
                    className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl space-y-3 max-w-sm"
                  >
                    <div className="font-bold text-xs text-[#003057] uppercase tracking-wide">
                      Change Master Administrator Password
                    </div>

                    {passChangeError && (
                      <div className="p-2 bg-red-50 text-[#c0392b] font-bold rounded text-xs">
                        {passChangeError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        New Password *
                      </label>
                      <input
                        type="password"
                        value={newMasterPass}
                        onChange={e => setNewMasterPass(e.target.value)}
                        placeholder="Min 6 characters..."
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        value={confMasterPass}
                        onChange={e => setConfMasterPass(e.target.value)}
                        placeholder="Re-enter password..."
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#8e44ad] hover:bg-[#732d91] text-white font-bold rounded-lg text-xs border-2 border-black cursor-pointer shadow-xs"
                    >
                      Update Master Password
                    </button>
                  </form>

                  {/* Reset Demo Parts */}
                  <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl space-y-2">
                    <div className="font-bold text-xs text-[#003057] uppercase tracking-wide">
                      Reset Demo Sample Parts
                    </div>
                    <p className="text-xs text-gray-600">
                      Reload factory demo parts for Sonde Lab, E-Lab, and WHE in IndexedDB.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Reset all stores to default demo dataset?')) {
                          await db.inventory.clear();
                          await db.stores.clear();
                          await db.stores.bulkPut(DEFAULT_STORES);
                          const initial = [
                            ...INITIAL_INVENTORY_ITEMS['sonde-lab'],
                            ...INITIAL_INVENTORY_ITEMS['e-lab'],
                            ...INITIAL_INVENTORY_ITEMS['whe']
                          ];
                          await db.inventory.bulkPut(initial);
                          await refreshFromDb();
                          onNotify?.('Default Wireline items reloaded!', 'success');
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border-2 border-black cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reload Default Demo Dataset</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-mono">
                Store ID: {currentStore.id}
              </span>
              <button
                type="button"
                onClick={() => setShowAdminPanelModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Close Admin Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <h3 className="font-bold text-base">Edit Part: {editingItem.partNumber}</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                setEditError('');
                if (!editPartNumber.trim() || !editDescription.trim() || !editLocation.trim()) {
                  setEditError('Part Number, Description, and Location are required.');
                  return;
                }
                const q = Number(editQty);
                if (isNaN(q) || q < 0) {
                  setEditError('Quantity must be a valid non-negative number.');
                  return;
                }

                // If renamed
                if (editPartNumber.trim() !== editingItem.partNumber) {
                  await db.inventory.delete(editingItem.id);
                }

                const updated: InventoryItem = {
                  id: `${editingItem.storeId}:${editPartNumber.trim()}`,
                  storeId: editingItem.storeId,
                  partNumber: editPartNumber.trim(),
                  description: editDescription.trim(),
                  location: editLocation.trim(),
                  quantity: q,
                  threshold: editThreshold.trim() === '' ? 0 : Math.max(0, parseInt(editThreshold, 10) || 0),
                  remarks: editRemarks.trim(),
                  updatedAt: new Date().toISOString()
                };

                await db.inventory.put(updated);
                await logHistory('Edit', updated.partNumber, updated.description, updated.quantity, 'Part updated by admin', editingItem.storeId);
                await refreshFromDb();
                setEditingItem(null);
                onNotify?.(`Updated part ${updated.partNumber}!`, 'success');
              }}
              className="p-5 space-y-3 text-xs sm:text-sm"
            >
              {editError && (
                <div className="p-2 bg-red-50 text-[#c0392b] font-bold rounded text-xs">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Part Number *
                  </label>
                  <input
                    type="text"
                    value={editPartNumber}
                    onChange={e => setEditPartNumber(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    className="w-full p-2 border-2 border-black rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editQty}
                    onChange={e => setEditQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Threshold Min
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editThreshold}
                    onChange={e => setEditThreshold(e.target.value)}
                    placeholder={`Global: ${globalThreshold}`}
                    className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALL ALERTS MODAL */}
      {showAllAlertsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">
                  All Low-Stock Alerts ({lowStockItems.length}) — {currentStore.name}
                </h3>
              </div>
              <button
                onClick={() => setShowAllAlertsModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium">
              Parts below have stock counts less than or equal to their safety threshold.
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-200 text-xs sm:text-sm">
              {lowStockItems.map(item => {
                const isZero = item.quantity <= 0;
                return (
                  <div key={item.partNumber} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${isZero ? 'bg-[#c0392b]' : 'bg-[#d97706]'}`} />
                        <span className="font-mono font-bold text-black">{item.partNumber}</span>
                        <span className="font-medium text-gray-800">{item.description}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {item.location}
                        </span>
                        {item.remarks && <span>· {item.remarks}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isZero ? 'bg-red-100 text-[#c0392b]' : 'bg-amber-100 text-amber-800'}`}>
                          {isZero ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                        <div className="text-xs font-bold text-gray-800 mt-0.5">
                          Qty: <span className={isZero ? 'text-[#c0392b]' : 'text-amber-800'}>{item.quantity}</span> / Min: {getItemThreshold(item)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAllAlertsModal(false);
                          handleOpenAdjust(item);
                        }}
                        className="px-3 py-1.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded text-xs font-bold border border-black shadow-xs cursor-pointer"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllAlertsModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
