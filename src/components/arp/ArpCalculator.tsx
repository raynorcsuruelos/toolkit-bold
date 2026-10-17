import React, { useState, useEffect, useRef } from 'react';
import {
  hashHardenedPassword,
  constantTimeEqual,
  evaluatePasswordStrength
} from '../../utils/crypto';
import {
  Lock,
  Unlock,
  KeyRound,
  ExternalLink,
  Download,
  Info,
  Calendar,
  DollarSign,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';

const STORAGE_KEY = 'kuwait_ic_arp_calc_v4';
const AUTH_KEY = 'kuwait_ic_arp_argon2_auth';
const PW_LOCK_KEY = 'kuwait_ic_arp_pw_lock';

const MONTHS = [
  { name: 'January', index: 0 },
  { name: 'February', index: 1 },
  { name: 'March', index: 2 },
  { name: 'April', index: 3 },
  { name: 'May', index: 4 },
  { name: 'June', index: 5 },
  { name: 'July', index: 6 },
  { name: 'August', index: 7 },
  { name: 'September', index: 8 },
  { name: 'October', index: 9 },
  { name: 'November', index: 10 },
  { name: 'December', index: 11 }
];

const H1_RANGE = [0, 5];
const H2_RANGE = [6, 11];
const NEUTRAL_CAP = 60;
const CELEBRATE_AMOUNT = 500;
const FIRST_YEAR = 2026;
const YEAR_COUNT = 10;

interface MonthEntry {
  on: string;
  neutral: string;
}

interface StoredAuth {
  algorithm: string;
  salt: string;
  hash: string;
  memorySize?: number;
  iterations?: number;
  updatedAt: string;
}

interface LockoutData {
  fails: number;
  until: number;
}

interface ArpCalculatorProps {
  onNotify?: (msg: string, type?: 'info' | 'error' | 'success' | 'warn') => void;
}

export const ArpCalculator: React.FC<ArpCalculatorProps> = ({ onNotify }) => {
  const [selectedHalf, setSelectedHalf] = useState<'H1' | 'H2'>('H1');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return Math.max(FIRST_YEAR, new Date().getFullYear());
  });
  const [isPersonalOn, setIsPersonalOn] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState('');
  const [entries, setEntries] = useState<Record<string, Record<string, Record<string, MonthEntry>>>>({});

  // Modals
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockEye, setShowUnlockEye] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Change password modal
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentEye, setShowCurrentEye] = useState(false);
  const [showNewEye, setShowNewEye] = useState(false);
  const [showConfirmEye, setShowConfirmEye] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');
  const [isHashing, setIsHashing] = useState(false);

  // Tooltips
  const [hoveredTip, setHoveredTip] = useState<string | null>(null);

  // Animation mood
  const [partyMood, setPartyMood] = useState<'party' | 'sad' | null>(null);
  const moodTimeoutRef = useRef<any>(null);

  const personalBarRef = useRef<HTMLDivElement>(null);
  const personalBtnRef = useRef<HTMLButtonElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.selectedHalf) setSelectedHalf(parsed.selectedHalf);
        if (parsed.year) setSelectedYear(Number(parsed.year));
        if (parsed.monthlySalary) setMonthlySalary(parsed.monthlySalary);
        if (parsed.entries) setEntries(parsed.entries);
      }
    } catch {}
  }, []);

  // Save to localStorage
  const saveState = (half = selectedHalf, yr = selectedYear, sal = monthlySalary, ents = entries) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedHalf: half,
          year: yr,
          monthlySalary: sal,
          entries: ents
        })
      );
    } catch {}
  };

  // Auto-lock when clicking outside Personal controls
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isPersonalOn) return;
      if (showUnlockModal || showChangeModal) return;

      if (
        personalBarRef.current?.contains(e.target as Node) ||
        personalBtnRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsPersonalOn(false);
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isPersonalOn, showUnlockModal, showChangeModal]);

  // Auth getters and setters
  const getStoredAuth = (): StoredAuth | null => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getLockout = (): LockoutData => {
    try {
      const raw = localStorage.getItem(PW_LOCK_KEY);
      return raw ? JSON.parse(raw) : { fails: 0, until: 0 };
    } catch {
      return { fails: 0, until: 0 };
    }
  };

  const setLockout = (v: LockoutData) => {
    try {
      localStorage.setItem(PW_LOCK_KEY, JSON.stringify(v));
    } catch {}
  };

  // Calculations
  const getDaysInMonth = (year: number, monthIndex: number): number => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const currentYearEntries = entries[selectedHalf]?.[String(selectedYear)] || {};

  const handleEntryChange = (monthIdx: number, field: 'on' | 'neutral', val: string) => {
    const cleaned = val.replace(/\D+/g, '');
    const currentHalf = entries[selectedHalf] || {};
    const currentYr = currentHalf[String(selectedYear)] || {};
    const monthData = currentYr[String(monthIdx)] || { on: '', neutral: '' };

    const updatedMonth = { ...monthData, [field]: cleaned };
    const updatedEntries = {
      ...entries,
      [selectedHalf]: {
        ...currentHalf,
        [String(selectedYear)]: {
          ...currentYr,
          [String(monthIdx)]: updatedMonth
        }
      }
    };

    setEntries(updatedEntries);
    saveState(selectedHalf, selectedYear, monthlySalary, updatedEntries);
  };

  const range = selectedHalf === 'H1' ? H1_RANGE : H2_RANGE;
  let sumOn = 0;
  let sumNeutral = 0;
  let sumCalendar = 0;

  for (let m = range[0]; m <= range[1]; m++) {
    sumCalendar += getDaysInMonth(selectedYear, m);
    const mData = currentYearEntries[String(m)] || { on: '', neutral: '' };
    sumOn += mData.on ? parseInt(mData.on, 10) : 0;
    sumNeutral += mData.neutral ? parseInt(mData.neutral, 10) : 0;
  }

  const calendarDays = Math.max(0, sumCalendar - sumNeutral);
  const expectedDaysOn = calendarDays * 0.67;
  const arpDays = sumOn - expectedDaysOn;
  const arpDaysRounded = Math.round(arpDays * 100) / 100;

  const ms = parseFloat(monthlySalary || '0');
  const dailyRate = isFinite(ms) && ms > 0 ? (ms * 12) / 365 : 0;

  let arpAmount = 0;
  if (arpDaysRounded > 0) {
    arpAmount = arpDays * dailyRate * 1.5;
  } else if (arpDaysRounded >= -7 && arpDaysRounded <= 0) {
    arpAmount = 0;
  } else {
    arpAmount = (arpDays + 7) * dailyRate;
  }

  const isNeutralCapExceeded = sumNeutral > NEUTRAL_CAP;

  // Mood trigger
  useEffect(() => {
    if (isNeutralCapExceeded) {
      setPartyMood(null);
      return;
    }
    clearTimeout(moodTimeoutRef.current);
    if (arpAmount > CELEBRATE_AMOUNT) {
      setPartyMood('party');
      moodTimeoutRef.current = setTimeout(() => setPartyMood(null), 4000);
    } else if (sumOn > 0 && (arpAmount < 0 || (arpAmount === 0 && arpDaysRounded <= 0))) {
      setPartyMood('sad');
      moodTimeoutRef.current = setTimeout(() => setPartyMood(null), 4000);
    } else {
      setPartyMood(null);
    }
  }, [arpAmount, sumOn, arpDaysRounded, isNeutralCapExceeded]);

  const formatUSD = (n: number) => {
    const v = isFinite(n) ? n : 0;
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    return `${sign}$${abs.toFixed(2)}`;
  };

  // Personal mode unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const lock = getLockout();
    if (lock.until > Date.now()) return;

    if (!unlockPassword) return;
    setIsVerifying(true);

    const auth = getStoredAuth();
    let ok = false;
    if (auth && auth.salt && auth.hash) {
      const derived = await hashHardenedPassword(unlockPassword, auth.salt);
      ok = constantTimeEqual(derived.hash, auth.hash);
    } else {
      // Legacy default
      const LEGACY_SALT = 'd76be65ba0baf52b83b385b288cd1a8d';
      const LEGACY_HASH = 'b1b153cd25e89b29c64bc63c2e073023abdbaf913f971ae0d2653ebad17b5844';
      const derived = await hashHardenedPassword(unlockPassword, LEGACY_SALT);
      ok = constantTimeEqual(derived.hash, LEGACY_HASH);
    }

    setIsVerifying(false);

    if (!ok) {
      lock.fails += 1;
      if (lock.fails >= 3) {
        lock.until = Date.now() + 30000 * Math.pow(2, lock.fails - 3);
      }
      setLockout(lock);
      setUnlockError(
        lock.until > Date.now()
          ? `Incorrect password. Locked for ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.`
          : 'Incorrect password. Please try again.'
      );
      return;
    }

    localStorage.removeItem(PW_LOCK_KEY);
    setShowUnlockModal(false);
    setUnlockPassword('');
    setUnlockError('');
    setIsPersonalOn(true);
    onNotify?.('Personal mode unlocked.', 'success');
  };

  // Change password submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    const auth = getStoredAuth();
    if (auth && !currentPw) {
      setChangeError('Please enter your current password.');
      return;
    }

    if (newPw.length < 6) {
      setChangeError('New password must be at least 6 characters long.');
      return;
    }

    if (newPw !== confirmPw) {
      setChangeError('Passwords do not match.');
      return;
    }

    setIsHashing(true);

    if (auth) {
      const check = await hashHardenedPassword(currentPw, auth.salt);
      if (!constantTimeEqual(check.hash, auth.hash)) {
        setIsHashing(false);
        setChangeError('Current password incorrect.');
        return;
      }
    }

    const result = await hashHardenedPassword(newPw);
    const newAuth: StoredAuth = {
      algorithm: result.algorithm,
      salt: result.salt,
      hash: result.hash,
      memorySize: 19456,
      iterations: 3,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(newAuth));
    localStorage.removeItem(PW_LOCK_KEY);
    setIsHashing(false);
    setChangeSuccess('Password successfully hardened with Argon2id / PBKDF2!');

    setTimeout(() => {
      setShowChangeModal(false);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setChangeSuccess('');
    }, 1200);
  };

  const strength = evaluatePasswordStrength(newPw);

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1200px] mx-auto">
      {/* Module Title / Section Head */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-gray-300 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#003057] uppercase tracking-wide flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0066a1]" />
            <span>ARP for the half-year (Kuwait IC)</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Select H1 or H2 to populate the months. Numeric inputs only.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={personalBtnRef}
            onClick={() => {
              if (isPersonalOn) setIsPersonalOn(false);
              else {
                setUnlockPassword('');
                setUnlockError('');
                setShowUnlockModal(true);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold cursor-pointer transition shadow-xs active:scale-95 ${
              isPersonalOn
                ? 'bg-[#1a7a3c] text-white border-black'
                : 'bg-[#002240] hover:bg-[#001830] text-white border-black/40'
            }`}
            title="Securely enter your monthly salary here. Click outside to auto-lock."
          >
            {isPersonalOn ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-300" />}
            <span>Personal</span>
          </button>
        </div>
      </div>

      {/* Salary Bar (Inside Personal Mode) */}
      {isPersonalOn && (
        <div
          ref={personalBarRef}
          className="p-3 bg-[#f0f4f8] border-3 border-black rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm animate-pop-in"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <label htmlFor="salary-input" className="font-bold text-gray-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span>Monthly Salary:</span>
            </label>
            <input
              id="salary-input"
              type="text"
              inputMode="decimal"
              value={monthlySalary}
              onChange={e => {
                let v = e.target.value.replace(/[^\d.]/g, '');
                const parts = v.split('.');
                if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                setMonthlySalary(v);
                saveState(selectedHalf, selectedYear, v, entries);
              }}
              placeholder="Enter amount..."
              className="w-36 p-1.5 border-2 border-black rounded-lg text-xs font-mono font-bold bg-white"
            />
            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-semibold border border-gray-300">
              Daily Rate:
            </span>
            <span className="font-mono font-bold text-[#003057] text-sm">
              {dailyRate > 0 ? dailyRate.toFixed(4) : '0.0000'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCurrentPw('');
                setNewPw('');
                setConfirmPw('');
                setChangeError('');
                setChangeSuccess('');
                setShowChangeModal(true);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 rounded-lg border border-gray-400 font-bold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#0066a1]" />
              <span>Change Password</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPersonalOn(false)}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Lock
            </button>
          </div>
        </div>
      )}

      {/* Grid: 2 Windows side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* WINDOW 1: WORKING DAYS */}
        <div className="bg-white border-3 sm:border-4 border-black rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[540px]">
          {/* Titlebar */}
          <div className="bg-[#003057] text-white p-3 sm:px-4 sm:py-3 border-b-3 border-black flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <span>Working Days</span>
            </h3>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedHalf('H1');
                  saveState('H1', selectedYear, monthlySalary, entries);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold border cursor-pointer transition ${
                  selectedHalf === 'H1'
                    ? 'bg-white text-[#003057] border-black'
                    : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
                }`}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedHalf('H2');
                  saveState('H2', selectedYear, monthlySalary, entries);
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold border cursor-pointer transition ${
                  selectedHalf === 'H2'
                    ? 'bg-white text-[#003057] border-black'
                    : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
                }`}
              >
                H2
              </button>

              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-md border border-white/20 text-xs">
                <span className="text-white/80 font-semibold">Year:</span>
                <select
                  value={selectedYear}
                  onChange={e => {
                    const y = Number(e.target.value);
                    setSelectedYear(y);
                    saveState(selectedHalf, y, monthlySalary, entries);
                  }}
                  className="bg-white text-gray-900 font-bold p-1 rounded text-xs border border-black cursor-pointer"
                >
                  {Array.from({ length: YEAR_COUNT }, (_, i) => FIRST_YEAR + i).map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Working Days Table */}
          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
            <div className="overflow-x-auto border-2 border-black rounded-lg">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#002B49] text-white select-none">
                    <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Month</th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] sm:text-xs text-right">
                      Total Days
                    </th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] sm:text-xs relative">
                      <div
                        className="inline-flex items-center gap-1 cursor-help"
                        onMouseEnter={() => setHoveredTip('daysOn')}
                        onMouseLeave={() => setHoveredTip(null)}
                      >
                        <span>Days On</span>
                        <Info className="w-3.5 h-3.5 text-blue-300" />
                      </div>
                      {hoveredTip === 'daysOn' && (
                        <div className="absolute left-0 top-full mt-1 z-30 w-52 p-2.5 bg-white text-gray-800 border-2 border-black rounded-lg shadow-xl text-xs normal-case font-normal">
                          <strong className="block text-[#003057] mb-1">Days On include:</strong>
                          <ol className="list-decimal pl-4 space-y-0.5">
                            <li>Wellsite / Job</li>
                            <li>Office / Base / Lab</li>
                            <li>Training in assignment (max 5d)</li>
                          </ol>
                        </div>
                      )}
                    </th>
                    <th className="py-2 px-3 font-bold uppercase tracking-wider text-[11px] sm:text-xs relative">
                      <div
                        className="inline-flex items-center gap-1 cursor-help"
                        onMouseEnter={() => setHoveredTip('neutral')}
                        onMouseLeave={() => setHoveredTip(null)}
                      >
                        <span>Neutral Days</span>
                        <Info className="w-3.5 h-3.5 text-blue-300" />
                      </div>
                      {hoveredTip === 'neutral' && (
                        <div className="absolute right-0 top-full mt-1 z-30 w-64 p-2.5 bg-white text-gray-800 border-2 border-black rounded-lg shadow-xl text-xs normal-case font-normal">
                          <strong className="block text-[#003057] mb-1">Neutral Days include:</strong>
                          <ol className="list-decimal pl-4 space-y-0.5">
                            <li>Training in SLB Center</li>
                            <li>Stand-by Administrative</li>
                            <li>Compassionate Leave</li>
                            <li>Leave of Absence (LOA)</li>
                            <li>Medical Leave</li>
                            <li>Maternity / Paternity</li>
                            <li>Salary Cont. Plan</li>
                            <li>No Show / Suspended</li>
                          </ol>
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {MONTHS.slice(range[0], range[1] + 1).map(m => {
                    const days = getDaysInMonth(selectedYear, m.index);
                    const entry = currentYearEntries[String(m.index)] || { on: '', neutral: '' };
                    return (
                      <tr key={m.index} className="hover:bg-[#f0f7fd] transition-colors">
                        <td className="py-2 px-3 font-bold text-[#003057]">{m.name}</td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-600 text-right">{days}</td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={entry.on}
                            onChange={e => handleEntryChange(m.index, 'on', e.target.value)}
                            className="w-20 p-1.5 border-2 border-black rounded-lg font-mono font-bold text-xs text-[#003057] bg-white text-center focus:border-[#0066a1] outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={entry.neutral}
                            onChange={e => handleEntryChange(m.index, 'neutral', e.target.value)}
                            className="w-20 p-1.5 border-2 border-black rounded-lg font-mono font-bold text-xs text-[#003057] bg-white text-center focus:border-[#0066a1] outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Totals */}
            <div className="mt-3 pt-3 border-t-3 border-black flex items-center justify-between gap-3 flex-wrap text-xs font-semibold text-gray-600 bg-[#f0f4f8] p-2.5 rounded-lg">
              <div>
                Selected Half: <span className="font-mono font-bold text-[#0066a1]">{selectedHalf}</span>
              </div>
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="text-gray-500 text-[11px] uppercase mr-1">Total On:</span>
                  <span className="font-mono font-black text-xl text-[#c0392b]">{sumOn}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[11px] uppercase mr-1">Total Neutral:</span>
                  <span className="font-mono font-black text-xl text-[#c0392b]">{sumNeutral}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WINDOW 2: ARP CALCULATION */}
        <div
          className={`bg-white border-3 sm:border-4 border-black rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[540px] relative transition-all ${
            partyMood === 'party' ? 'ring-4 ring-amber-400 shadow-2xl' : partyMood === 'sad' ? 'grayscale-25' : ''
          }`}
        >
          {/* Party or Sad Animation Layer */}
          {partyMood === 'party' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center">
              <div className="bg-white/95 border-3 border-black p-3 rounded-xl shadow-2xl text-center animate-bounce">
                <div className="text-2xl">🎉 🥳 💰 🍾</div>
                <div className="font-black text-lg text-[#0066a1]">Party time! ARP Earned!</div>
              </div>
            </div>
          )}

          {partyMood === 'sad' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center">
              <div className="bg-white/95 border-3 border-black p-3 rounded-xl shadow-2xl text-center animate-pulse">
                <div className="text-2xl">🌧️ 😢 🥺</div>
                <div className="font-black text-base text-[#c0392b]">No ARP this period</div>
              </div>
            </div>
          )}

          {/* Titlebar */}
          <div className="bg-[#003057] text-white p-3 sm:px-4 sm:py-3 border-b-3 border-black flex items-center justify-between gap-2">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <span>ARP Calculation</span>
            </h3>
            <span className="text-[11px] bg-[#0066a1] text-white px-2 py-0.5 rounded border border-white/20 font-bold">
              67% · Days ON target
            </span>
          </div>

          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-4">
            {/* Highlighted Result Card */}
            <div className="border-3 border-black rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="bg-[#003057] text-white px-3 py-2 border-b-2 border-black flex items-center justify-between text-xs font-bold">
                <span>ARP Amount</span>
                <span className="text-gray-300 font-mono text-[11px]">Days × Daily Rate</span>
              </div>

              <div className="p-4 text-center">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Calculated ARP Amount
                </div>

                {isNeutralCapExceeded ? (
                  <div className="mt-2 p-3 bg-red-50 border-2 border-[#c0392b] rounded-lg text-left text-xs font-bold text-[#c0392b] leading-relaxed">
                    <AlertTriangle className="w-4 h-4 inline-block mr-1 text-[#c0392b]" />
                    If in a given 6-month period an active employee has more than 60 days reported that are classified as "Neutral Days", then the ARP days are NOT paid/deducted at the end of that period. Instead, they will be added to the next ARP assessment period and the sum of the two halves will then be processed at the end of this following period.
                  </div>
                ) : (
                  <>
                    <div
                      className={`text-3xl sm:text-4xl font-mono font-black tracking-tight mt-1 ${
                        arpAmount > 0
                          ? 'text-[#0066a1]'
                          : arpDaysRounded >= -7
                          ? 'text-gray-700'
                          : 'text-[#c0392b]'
                      }`}
                    >
                      {formatUSD(arpAmount)}
                    </div>
                    <div className="text-xs text-gray-500 italic mt-1">
                      Calculated from ARP Days &amp; Daily Rate
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Breakdown Formulas List */}
            <div className="border-2 border-black rounded-xl overflow-hidden bg-white divide-y divide-gray-200 text-xs sm:text-sm">
              <div className="bg-[#f0f4f8] p-2.5 font-bold text-gray-700 border-b-2 border-black text-xs uppercase tracking-wide">
                Breakdown &amp; Formulas
              </div>

              {/* Total Calendar Days */}
              <div className="p-2.5 flex items-center justify-between hover:bg-[#f0f7fd] transition">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-[#003057] text-white flex items-center justify-center text-[10px]">
                    i
                  </span>
                  <span>Total Calendar Days</span>
                </div>
                <div className="font-mono font-bold text-[#003057]">{sumCalendar}</div>
              </div>

              {/* Calendar Days */}
              <div className="p-2.5 flex items-center justify-between hover:bg-[#f0f7fd] transition">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-[#003057] text-white flex items-center justify-center text-[10px]">
                    i
                  </span>
                  <span>Calendar Days</span>
                </div>
                <div className="font-mono font-bold text-[#003057]">
                  {isNeutralCapExceeded ? '—' : calendarDays}
                </div>
              </div>

              {/* Expected Days ON */}
              <div className="p-2.5 flex items-center justify-between hover:bg-[#f0f7fd] transition">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-[#003057] text-white flex items-center justify-center text-[10px]">
                    i
                  </span>
                  <span>Expected Days ON (67%)</span>
                </div>
                <div className="font-mono font-bold text-[#003057]">
                  {isNeutralCapExceeded ? '—' : expectedDaysOn.toFixed(2)}
                </div>
              </div>

              {/* ARP Days */}
              <div className="p-3 bg-[#e8f4fd] border-y-2 border-black flex items-center justify-between hover:bg-[#dbeefb] transition">
                <div className="flex items-center gap-1.5 font-black text-[#003057]">
                  <span className="w-4 h-4 rounded-full bg-[#003057] text-white flex items-center justify-center text-[10px]">
                    i
                  </span>
                  <span>ARP Days</span>
                </div>
                <div
                  className={`font-mono font-black text-xl px-3 py-1 rounded-lg border-2 border-black bg-white shadow-xs ${
                    arpDaysRounded > 0
                      ? 'text-[#0066a1]'
                      : arpDaysRounded >= -7
                      ? 'text-gray-700'
                      : 'text-[#c0392b] animate-shake'
                  }`}
                >
                  {isNeutralCapExceeded ? '—' : arpDays.toFixed(2)}
                </div>
              </div>

              {/* ARP Amount Details */}
              <div className="p-2.5 flex items-center justify-between hover:bg-[#f0f7fd] transition">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-[#003057] text-white flex items-center justify-center text-[10px]">
                    i
                  </span>
                  <span>ARP Amount (Details)</span>
                </div>
                <div
                  className={`font-mono font-bold ${
                    arpAmount > 0
                      ? 'text-[#0066a1]'
                      : arpDaysRounded >= -7
                      ? 'text-gray-700'
                      : 'text-[#c0392b]'
                  }`}
                >
                  {isNeutralCapExceeded ? '—' : formatUSD(arpAmount)}
                </div>
              </div>
            </div>

            {/* Formula legend helper */}
            <div className="p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-[11px] text-gray-600 space-y-0.5">
              <div>• If ARP Days &gt; 0: Amount = ARP Days × Daily Rate × 150%</div>
              <div>• If −7 ≤ ARP Days ≤ 0: Amount = $0.00</div>
              <div>• If ARP Days &lt; −7: Amount = (ARP Days − (−7)) × Daily Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links & Download */}
      <div className="p-3 bg-[#f0f4f8] border-3 border-black rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-gray-600 font-medium">
          <strong>Kuwait IC ARP Calc</strong> · Data saved locally on this device.
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://loadchart.slb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg border-2 border-black font-bold cursor-pointer transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Load Chart</span>
          </a>
          <a
            href="https://mystatements.slb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded-lg border-2 border-black font-bold cursor-pointer transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Payslip</span>
          </a>
        </div>
      </div>

      {/* UNLOCK PASSWORD MODAL */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div>
                <h3 className="font-bold text-base">Unlock Personal Mode</h3>
                <div className="text-[11px] text-blue-200">Protected by Argon2id / PBKDF2</div>
              </div>
              <button
                onClick={() => setShowUnlockModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnlock} className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-gray-600">
                Enter password to view and edit your confidential Monthly Salary.
              </p>

              {unlockError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#c0392b] text-[#c0392b] rounded-lg font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showUnlockEye ? 'text' : 'password'}
                    value={unlockPassword}
                    onChange={e => {
                      setUnlockPassword(e.target.value);
                      setUnlockError('');
                    }}
                    placeholder="Enter password..."
                    className="w-full pl-3 pr-10 py-2 border-2 border-black rounded-lg text-sm font-mono font-bold focus:border-[#0066a1] outline-none"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockEye(!showUnlockEye)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black cursor-pointer"
                  >
                    {showUnlockEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[#0066a1] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  WebAssembly Hardened
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockModal(false);
                    setShowChangeModal(true);
                  }}
                  className="text-[#0066a1] hover:underline font-bold cursor-pointer"
                >
                  Change or set password
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div>
                <h3 className="font-bold text-base">Change Password</h3>
                <div className="text-[11px] text-blue-200">Personal Mode · Memory-Hard Argon2id</div>
              </div>
              <button
                onClick={() => setShowChangeModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div className="p-2.5 bg-[#e8f4fd] border border-[#0066a1] rounded-lg text-xs text-[#003057] leading-relaxed">
                <strong>Memory-Hard Security:</strong> Uses 19 MiB RAM memory-hardness &amp; 3 passes to defend against brute-force cracking.
              </div>

              {changeError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#c0392b] text-[#c0392b] rounded-lg font-bold">
                  {changeError}
                </div>
              )}

              {changeSuccess && (
                <div className="p-2.5 bg-emerald-50 border-2 border-[#1a7a3c] text-[#1a7a3c] rounded-lg font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {getStoredAuth() && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentEye ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Enter current password..."
                      className="w-full pl-3 pr-10 py-2 border-2 border-black rounded-lg text-sm font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentEye(!showCurrentEye)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black cursor-pointer"
                    >
                      {showCurrentEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  New Password * (Min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewEye ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full pl-3 pr-10 py-2 border-2 border-black rounded-lg text-sm font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewEye(!showNewEye)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black cursor-pointer"
                  >
                    {showNewEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength Meter */}
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${strength.pct}%`, backgroundColor: strength.color }}
                  />
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Strength: {strength.text}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmEye ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password..."
                    className="w-full pl-3 pr-10 py-2 border-2 border-black rounded-lg text-sm font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmEye(!showConfirmEye)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-black cursor-pointer"
                  >
                    {showConfirmEye ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset password? This will restore the initial password.')) {
                      localStorage.removeItem(AUTH_KEY);
                      localStorage.removeItem(PW_LOCK_KEY);
                      setShowChangeModal(false);
                      onNotify?.('Password reset to default.', 'info');
                    }
                  }}
                  className="text-xs text-[#c0392b] font-bold hover:underline cursor-pointer"
                >
                  Reset password?
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangeModal(false)}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border border-black cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isHashing}
                    className="px-4 py-1.5 bg-[#0066a1] hover:bg-[#004e7c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isHashing ? 'Hashing...' : 'Save & Harden'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
