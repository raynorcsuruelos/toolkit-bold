import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_FAQ_TOOLS,
  DEFAULT_FAQS_DATA,
  DEFAULT_FAQ_CREDENTIALS,
  FaqTool,
  FaqItem,
  FaqCredentials
} from '../../data/faqData';
import { KpodSearch } from '../kpod/KpodSearch';
import {
  HelpCircle,
  Search,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  X,
  Check,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  KeyRound,
  FileText
} from 'lucide-react';
import {
  sha256Sync,
  generateSaltHex,
  constantTimeEqual
} from '../../utils/crypto';

const STORAGE_KEY_TOOLS = 'wl_tool_faqs_tools_kuwait_v3';
const STORAGE_KEY_FAQS = 'wl_tool_faqs_data_kuwait_v3';
const STORAGE_KEY_CREDS = 'wl_tool_faqs_creds_salted_v3';

interface ToolFaqsProps {
  onNotify?: (msg: string, type?: 'info' | 'error' | 'success' | 'warn') => void;
}

export const ToolFaqs: React.FC<ToolFaqsProps> = ({ onNotify }) => {
  // Data State
  const [tools, setTools] = useState<FaqTool[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOOLS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_FAQ_TOOLS;
  });

  const [faqs, setFaqs] = useState<Record<string, FaqItem[]>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FAQS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_FAQS_DATA;
  });

  const [creds, setCreds] = useState<FaqCredentials>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CREDS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_FAQ_CREDENTIALS;
  });

  // Current selections
  const [selectedToolKey, setSelectedToolKey] = useState<string>('');
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<string>('');

  // Search query & Live suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Admin state
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdminPortalModal, setShowAdminPortalModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  // Admin Tab
  const [adminTab, setAdminTab] = useState<'questions' | 'tools' | 'csv' | 'password'>('questions');
  const [adminToolFilter, setAdminToolFilter] = useState<string>('usis');

  // Question Add/Edit modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionItem, setEditingQuestionItem] = useState<{
    id?: string;
    toolKey: string;
    q: string;
    a: string;
    remarks: string;
    notes: string;
  } | null>(null);

  // New Tool inputs
  const [newToolKey, setNewToolKey] = useState('');
  const [newToolName, setNewToolName] = useState('');

  // Password change
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // CSV Validation preview
  const [parsedCsvRecords, setParsedCsvRecords] = useState<any[] | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImportMode, setCsvImportMode] = useState<'merge' | 'replace'>('merge');

  // Persist helpers
  const persistData = (newTools = tools, newFaqs = faqs) => {
    setTools(newTools);
    setFaqs(newFaqs);
    try {
      localStorage.setItem(STORAGE_KEY_TOOLS, JSON.stringify(newTools));
      localStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(newFaqs));
    } catch {}
  };

  const persistCreds = (newCreds: FaqCredentials) => {
    setCreds(newCreds);
    try {
      localStorage.setItem(STORAGE_KEY_CREDS, JSON.stringify(newCreds));
    } catch {}
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Questions for active tool
  const currentQuestions = useMemo(() => {
    if (!selectedToolKey || !faqs[selectedToolKey]) return [];
    return faqs[selectedToolKey];
  }, [faqs, selectedToolKey]);

  // Selected FAQ item
  const selectedFaq = useMemo(() => {
    if (!selectedToolKey || selectedQuestionIdx === '' || !faqs[selectedToolKey]) return null;
    return faqs[selectedToolKey][Number(selectedQuestionIdx)] || null;
  }, [faqs, selectedToolKey, selectedQuestionIdx]);

  const activeToolObj = useMemo(() => {
    return tools.find(t => t.key === selectedToolKey) || null;
  }, [tools, selectedToolKey]);

  // Auto-select if tool has only 1 question
  useEffect(() => {
    if (selectedToolKey && currentQuestions.length === 1) {
      setSelectedQuestionIdx('0');
    }
  }, [selectedToolKey, currentQuestions]);

  // Live Autocomplete Suggestions
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 1) return [];

    const tokens = q.split(/\s+/).filter(Boolean);
    const results: Array<{
      toolKey: string;
      toolName: string;
      questionIndex: number;
      faq: FaqItem;
      score: number;
      matchSource: string;
    }> = [];

    tools.forEach(tool => {
      const list = faqs[tool.key] || [];
      list.forEach((faq, idx) => {
        const qText = (faq.q || '').toLowerCase();
        const aText = (faq.a || '').toLowerCase();
        const remText = (faq.remarks || '').toLowerCase();
        const noteText = (faq.notes || '').toLowerCase();
        const tName = tool.name.toLowerCase();
        const tKey = tool.key.toLowerCase();

        let matchesAll = true;
        let score = 0;
        let source = '';

        tokens.forEach(tok => {
          let matched = false;
          if (aText.includes(tok)) {
            matched = true;
            score += 15;
            if (!source) source = 'Answer';
          }
          if (qText.includes(tok)) {
            matched = true;
            score += 12;
            if (!source) source = 'Question';
          }
          if (tName.includes(tok) || tKey.includes(tok)) {
            matched = true;
            score += 8;
            if (!source) source = 'Tool';
          }
          if (remText.includes(tok) || noteText.includes(tok)) {
            matched = true;
            score += 5;
            if (!source) source = 'Remarks/Notes';
          }
          if (!matched) matchesAll = false;
        });

        if (matchesAll) {
          results.push({
            toolKey: tool.key,
            toolName: tool.name,
            questionIndex: idx,
            faq,
            score,
            matchSource: source || 'Keyword'
          });
        }
      });
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 15);
  }, [tools, faqs, searchQuery]);

  const selectSuggestionItem = (item: (typeof suggestions)[0]) => {
    setSelectedToolKey(item.toolKey);
    setSelectedQuestionIdx(String(item.questionIndex));
    setShowSuggestions(false);
  };

  // Admin authentication
  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockoutUntil) return;

    const computed = sha256Sync(creds.salt + adminPasswordInput);
    if (constantTimeEqual(computed, creds.hash)) {
      setIsAdminUnlocked(true);
      setShowPasswordModal(false);
      setAdminPasswordInput('');
      setAdminError('');
      setFailedAttempts(0);
      setShowAdminPortalModal(true);
      onNotify?.('Admin portal authenticated.', 'success');
    } else {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 5) {
        const until = Date.now() + 30000;
        setLockoutUntil(until);
        setAdminError('Security lockout active for 30 seconds.');
      } else {
        setAdminError(`Incorrect password (${5 - nextFail} attempts remaining).`);
      }
    }
  };

  // CSV Export
  const exportAllFaqsCsv = () => {
    const headers = ['Tool Key', 'Tool Name', 'Question ID', 'Question', 'Answer', 'Remarks', 'Notes'];
    const rows = [headers];

    tools.forEach(tool => {
      const list = faqs[tool.key] || [];
      list.forEach((item, idx) => {
        rows.push([
          tool.key,
          tool.name,
          item.id || `${tool.key}-${idx + 1}`,
          item.q || '',
          item.a || '',
          item.remarks || '',
          item.notes || ''
        ]);
      });
    });

    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WL_Tool_FAQs_Kuwait_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('Exported FAQs to CSV!', 'success');
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-[1250px] mx-auto">
      {/* Title & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-gray-300 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#003057] uppercase tracking-wide flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#0066a1]" />
            <span>Wireline Tool FAQs — Kuwait</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Quick operational reference for wireline tool specifications, torque settings, oils, and motor tolerances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (isAdminUnlocked) setShowAdminPortalModal(true);
              else {
                setAdminPasswordInput('');
                setAdminError('');
                setShowPasswordModal(true);
              }
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

      {/* Live Search Panel with Quick Chips */}
      <div ref={searchContainerRef} className="bg-white p-4 sm:p-5 border-3 sm:border-4 border-black rounded-xl shadow-xs space-y-3 relative">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#003057] uppercase tracking-wide">
            Live Search Across Questions &amp; Answers
          </label>
          <span className="text-[11px] text-gray-500 font-mono">
            Searches Answers, Notes, Tools &amp; Part #s
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={e => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search answers, questions, torque, oils (e.g. DD-27, 24.5mm, Spirol, 88Ω, Retainer Nut)..."
            className="w-full pl-4 pr-10 py-2.5 text-sm sm:text-base border-3 border-black rounded-lg font-medium focus:border-[#0066a1] outline-none shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="font-bold text-gray-500 mr-1 text-[11px] uppercase">Quick Search:</span>
          {['Oil', 'Torque', 'Resistance', 'DD-27', 'Spirol', 'Centralizer', 'P222602'].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setSearchQuery(chip);
                setShowSuggestions(true);
              }}
              className="px-2.5 py-1 bg-[#f0f4f8] hover:bg-[#003057] hover:text-white text-[#003057] rounded-md font-semibold border border-gray-300 transition cursor-pointer shadow-2xs"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Live Suggestions Dropdown Container */}
        {showSuggestions && searchQuery.trim() && (
          <div className="border-3 border-black rounded-xl overflow-hidden bg-white shadow-xl max-h-96 overflow-y-auto divide-y divide-gray-200 animate-pop-in z-20">
            {suggestions.length === 0 ? (
              <div className="p-5 text-center text-xs text-gray-500 italic">
                No FAQs or answers found matching "<strong>{searchQuery}</strong>".
              </div>
            ) : (
              suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestionItem(item)}
                  className="p-3.5 hover:bg-[#f0f7fd] transition cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#003057] text-white font-bold text-[10px] tracking-wider uppercase">
                      {item.toolName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#0066a1] border border-blue-200">
                      Matched in {item.matchSource}
                    </span>
                  </div>

                  <div className="font-bold text-[#003057] text-sm group-hover:underline">
                    {item.faq.q}
                  </div>

                  <div className="p-2 bg-red-50 border border-red-200 border-l-4 border-l-[#c0392b] rounded text-xs">
                    <div className="text-[10px] font-bold text-red-800 uppercase tracking-wide">
                      Answer
                    </div>
                    <div className="font-black text-sm text-[#c0392b]">{item.faq.a}</div>
                  </div>

                  {item.faq.remarks && (
                    <div className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-200">
                      <strong>Remarks:</strong> {item.faq.remarks}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Dropdown Selectors */}
      <div className="bg-[#f7f9fb] p-4 sm:p-5 border-3 sm:border-4 border-black rounded-xl shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tool Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">
              Select Tool
            </label>
            <select
              value={selectedToolKey}
              onChange={e => {
                setSelectedToolKey(e.target.value);
                setSelectedQuestionIdx('');
              }}
              className="w-full p-3 border-3 border-black rounded-lg text-sm sm:text-base font-bold bg-white cursor-pointer focus:border-[#0066a1] outline-none shadow-xs"
            >
              <option value="">-- Select a Tool --</option>
              {tools.map(t => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>Select Question</span>
              {currentQuestions.length === 1 && (
                <span className="text-[10px] bg-[#0066a1] text-white font-mono px-2 py-0.5 rounded font-bold">
                  AUTO-SELECTED
                </span>
              )}
            </label>
            <select
              value={selectedQuestionIdx}
              disabled={!selectedToolKey}
              onChange={e => setSelectedQuestionIdx(e.target.value)}
              className="w-full p-3 border-3 border-black rounded-lg text-sm font-semibold bg-white cursor-pointer focus:border-[#0066a1] outline-none shadow-xs disabled:bg-gray-100 disabled:cursor-not-allowed truncate"
            >
              <option value="">-- Select a Question --</option>
              {currentQuestions.map((q, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {q.q}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Answer Result Display Card */}
      {selectedFaq ? (
        <div className="bg-white border-3 sm:border-4 border-black rounded-xl p-5 sm:p-6 shadow-sm space-y-4 animate-pop-in">
          <div>
            <span className="inline-block px-3 py-1 rounded bg-[#003057] text-white text-xs font-black tracking-wider uppercase">
              {activeToolObj?.name || selectedToolKey}
            </span>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              Question:
            </div>
            <div className="text-lg sm:text-xl font-black text-[#003057] leading-snug">
              {selectedFaq.q}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              Answer:
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#c0392b] leading-tight break-all">
              {selectedFaq.a}
            </div>
          </div>

          {selectedFaq.remarks && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Remarks:
              </div>
              <div className="p-3.5 bg-[#fff8e1] border-2 border-black border-l-6 border-l-[#e67e22] rounded-lg text-sm text-gray-900 leading-relaxed font-medium">
                {selectedFaq.remarks}
              </div>
            </div>
          )}

          {selectedFaq.notes && (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Notes:
              </div>
              <div className="p-3.5 bg-[#f0f7fd] border-2 border-black border-l-6 border-l-[#0066a1] rounded-lg text-sm text-gray-900 leading-relaxed font-medium">
                {selectedFaq.notes}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-[#f8fafc] border-2 border-dashed border-gray-300 rounded-xl text-gray-500 space-y-1">
          <HelpCircle className="w-8 h-8 text-gray-400 mx-auto" />
          <div className="font-bold text-sm text-gray-700">
            {selectedToolKey
              ? 'Select a question from the dropdown above to view the answer.'
              : 'Select a Wireline Tool above or type a keyword in the live search box.'}
          </div>
          <div className="text-xs text-gray-400">
            Example: Choose "Resolve-iX" to inspect coupling sleeve retaining ring part numbers and torque.
          </div>
        </div>
      )}

      {/* kPod PDF Search */}
      <KpodSearch onNotify={onNotify} />

      {/* ADMIN PASSWORD UNLOCK MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-base">WL Tool FAQs — Admin Auth</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminVerify} className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-gray-600">
                Enter administrator password. Authentication verified with salted SHA-256.
              </p>

              {adminError && (
                <div className="p-2.5 bg-red-50 border-2 border-[#c0392b] text-[#c0392b] font-bold rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={e => {
                    setAdminPasswordInput(e.target.value);
                    setAdminError('');
                  }}
                  placeholder="Password (Default: Pogiako1980!)"
                  className="w-full p-2 border-2 border-black rounded-lg text-sm font-mono font-bold focus:border-[#0066a1] outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold border border-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs active:scale-95"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN PORTAL MODAL */}
      {showAdminPortalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base sm:text-lg">WL Tool FAQs — Admin Portal</h3>
              </div>
              <button
                onClick={() => setShowAdminPortalModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b-2 border-gray-300 bg-gray-100 px-4 pt-2 gap-1 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdminTab('questions')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'questions' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Manage Questions
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('tools')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'tools' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Manage Tools ({tools.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('csv')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'csv' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Bulk Data (CSV)
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('password')}
                className={`px-3 py-2 rounded-t-md transition border-t-2 border-x-2 -mb-[2px] cursor-pointer ${
                  adminTab === 'password' ? 'bg-white border-black text-[#003057]' : 'border-transparent text-gray-600 hover:text-black'
                }`}
              >
                Security &amp; Password
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* TAB 1: QUESTIONS */}
              {adminTab === 'questions' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-700">Filter by Tool:</label>
                      <select
                        value={adminToolFilter}
                        onChange={e => setAdminToolFilter(e.target.value)}
                        className="p-1.5 border-2 border-black rounded-lg text-xs font-semibold bg-white"
                      >
                        {tools.map(t => (
                          <option key={t.key} value={t.key}>
                            {t.name} ({t.key})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuestionItem({
                          toolKey: adminToolFilter,
                          q: '',
                          a: '',
                          remarks: '',
                          notes: ''
                        });
                        setShowQuestionModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  <div className="border border-gray-300 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-200 bg-white">
                    {(faqs[adminToolFilter] || []).length === 0 ? (
                      <div className="p-6 text-center text-gray-400 italic">
                        No questions registered for this tool yet.
                      </div>
                    ) : (
                      (faqs[adminToolFilter] || []).map((faq, i) => (
                        <div key={faq.id || i} className="p-3 hover:bg-[#f0f7fd] flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="font-bold text-[#003057]">
                              {i + 1}. {faq.q}
                            </div>
                            <div className="text-red-700 font-bold text-xs">
                              Ans: {faq.a}
                            </div>
                            {faq.remarks && <div className="text-gray-500 text-[11px]">Remarks: {faq.remarks}</div>}
                            {faq.notes && <div className="text-gray-500 text-[11px]">Notes: {faq.notes}</div>}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuestionItem({
                                  id: faq.id,
                                  toolKey: adminToolFilter,
                                  q: faq.q,
                                  a: faq.a,
                                  remarks: faq.remarks || '',
                                  notes: faq.notes || ''
                                });
                                setShowQuestionModal(true);
                              }}
                              className="p-1 text-gray-600 hover:text-black rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this question?')) {
                                  const updated = {
                                    ...faqs,
                                    [adminToolFilter]: (faqs[adminToolFilter] || []).filter((_, idx) => idx !== i)
                                  };
                                  persistData(tools, updated);
                                  onNotify?.('Question deleted.', 'warn');
                                }
                              }}
                              className="p-1 text-red-600 hover:text-red-800 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TOOLS */}
              {adminTab === 'tools' && (
                <div className="space-y-4">
                  {/* Add tool */}
                  <div className="p-3.5 bg-gray-50 border-2 border-gray-300 rounded-xl space-y-2">
                    <div className="font-bold text-xs text-[#003057] uppercase tracking-wide">
                      Add New Tool
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Tool Key (e.g. xpt)"
                        value={newToolKey}
                        onChange={e => setNewToolKey(e.target.value)}
                        className="p-2 border-2 border-black rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Tool Display Name (e.g. XPT)"
                        value={newToolName}
                        onChange={e => setNewToolName(e.target.value)}
                        className="p-2 border-2 border-black rounded-lg text-xs flex-1 min-w-[140px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const k = newToolKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                          const n = newToolName.trim();
                          if (!k || !n) return;
                          if (tools.some(t => t.key === k)) {
                            alert('Tool key already exists.');
                            return;
                          }
                          const updatedTools = [...tools, { key: k, name: n }];
                          const updatedFaqs = { ...faqs, [k]: [] };
                          persistData(updatedTools, updatedFaqs);
                          setNewToolKey('');
                          setNewToolName('');
                          onNotify?.(`Added tool ${n}!`, 'success');
                        }}
                        className="px-3 py-2 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs"
                      >
                        Add Tool
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {tools.map(t => {
                      const count = (faqs[t.key] || []).length;
                      return (
                        <div
                          key={t.key}
                          className="p-3 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-bold text-gray-900 text-sm">{t.name}</span>
                            <span className="text-gray-500 font-mono text-xs ml-2">[key: {t.key}]</span>
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                              {count} questions
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const newName = prompt('Enter new display name for tool:', t.name);
                                if (newName && newName.trim()) {
                                  const updatedTools = tools.map(item =>
                                    item.key === t.key ? { ...item, name: newName.trim() } : item
                                  );
                                  persistData(updatedTools, faqs);
                                }
                              }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-400 text-xs font-semibold"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete tool ${t.name} and all its questions?`)) {
                                  const updatedTools = tools.filter(item => item.key !== t.key);
                                  const updatedFaqs = { ...faqs };
                                  delete updatedFaqs[t.key];
                                  persistData(updatedTools, updatedFaqs);
                                  onNotify?.(`Deleted tool ${t.name}`, 'warn');
                                }
                              }}
                              className="p-1 text-red-600 hover:text-red-800 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CSV IMPORT / EXPORT */}
              {adminTab === 'csv' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border-2 border-black rounded-lg space-y-2">
                      <div className="font-bold text-sm text-[#003057]">Export Entire FAQ Database</div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Download all tool questions, answers, remarks, and notes as a standardized CSV file.
                      </p>
                      <button
                        type="button"
                        onClick={exportAllFaqsCsv}
                        className="w-full py-2 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="p-4 bg-white border-2 border-black rounded-lg space-y-2">
                      <div className="font-bold text-sm text-[#003057]">Bulk Import &amp; Merge CSV</div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Upload a CSV file to inspect, validate, and merge into the active database.
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        id="csv-file-faq-input"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setCsvFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = evt => {
                            const text = evt.target?.result as string;
                            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                            if (lines.length < 2) return;
                            const parsed: any[] = [];
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                              if (cols[0] && cols[3]) {
                                parsed.push({
                                  toolKey: cols[0].toLowerCase(),
                                  toolName: cols[1] || cols[0].toUpperCase(),
                                  qId: cols[2] || '',
                                  q: cols[3],
                                  a: cols[4] || '',
                                  remarks: cols[5] || '',
                                  notes: cols[6] || ''
                                });
                              }
                            }
                            setParsedCsvRecords(parsed);
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('csv-file-faq-input')?.click()}
                        className="w-full py-2 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Select CSV File</span>
                      </button>
                    </div>
                  </div>

                  {parsedCsvRecords && (
                    <div className="p-4 bg-gray-50 border-2 border-[#003057] rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-[#003057]">
                          Inspecting CSV: {csvFileName} ({parsedCsvRecords.length} records)
                        </span>
                        <div className="flex gap-2">
                          <label className="text-xs font-bold flex items-center gap-1">
                            <input
                              type="radio"
                              name="mode"
                              checked={csvImportMode === 'merge'}
                              onChange={() => setCsvImportMode('merge')}
                            />
                            Merge
                          </label>
                          <label className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <input
                              type="radio"
                              name="mode"
                              checked={csvImportMode === 'replace'}
                              onChange={() => setCsvImportMode('replace')}
                            />
                            Replace All
                          </label>
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded bg-white text-xs divide-y divide-gray-100">
                        {parsedCsvRecords.slice(0, 20).map((r, i) => (
                          <div key={i} className="p-2 flex justify-between">
                            <div>
                              <strong className="text-[#003057]">{r.toolName}:</strong> {r.q}
                            </div>
                            <span className="font-bold text-red-600 truncate max-w-xs">{r.a}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setParsedCsvRecords(null)}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            let updatedTools = [...tools];
                            let updatedFaqs = csvImportMode === 'replace' ? {} : { ...faqs };

                            parsedCsvRecords.forEach(rec => {
                              if (!updatedTools.some(t => t.key === rec.toolKey)) {
                                updatedTools.push({ key: rec.toolKey, name: rec.toolName });
                              }
                              if (!updatedFaqs[rec.toolKey]) updatedFaqs[rec.toolKey] = [];
                              const list = updatedFaqs[rec.toolKey];
                              const idx = list.findIndex(item => item.q.toLowerCase() === rec.q.toLowerCase());
                              if (idx !== -1) {
                                list[idx] = { ...list[idx], a: rec.a, remarks: rec.remarks, notes: rec.notes };
                              } else {
                                list.push({
                                  id: rec.qId || `q_${Date.now()}_${Math.random()}`,
                                  q: rec.q,
                                  a: rec.a,
                                  remarks: rec.remarks,
                                  notes: rec.notes
                                });
                              }
                            });

                            persistData(updatedTools, updatedFaqs);
                            setParsedCsvRecords(null);
                            onNotify?.(`Merged ${parsedCsvRecords.length} records!`, 'success');
                          }}
                          className="px-3 py-1 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded text-xs font-bold shadow-xs"
                        >
                          Execute Import
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PASSWORD */}
              {adminTab === 'password' && (
                <div className="space-y-4 max-w-md">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                    <strong>Salted SHA-256 Credentials:</strong> Stored cryptographically with random 16-byte salt.
                  </div>

                  {passError && (
                    <div className="p-2.5 bg-red-50 text-[#c0392b] font-bold rounded text-xs">
                      {passError}
                    </div>
                  )}

                  {passSuccess && (
                    <div className="p-2.5 bg-emerald-50 text-[#1a7a3c] font-bold rounded text-xs">
                      {passSuccess}
                    </div>
                  )}

                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      setPassError('');
                      setPassSuccess('');
                      const currHash = sha256Sync(creds.salt + currPass);
                      if (!constantTimeEqual(currHash, creds.hash)) {
                        setPassError('Current password incorrect.');
                        return;
                      }
                      if (newPass.length < 8) {
                        setPassError('New password must be at least 8 characters.');
                        return;
                      }
                      if (newPass !== confPass) {
                        setPassError('Passwords do not match.');
                        return;
                      }
                      const newSalt = generateSaltHex(16);
                      const newHash = sha256Sync(newSalt + newPass);
                      persistCreds({ salt: newSalt, hash: newHash });
                      setCurrPass('');
                      setNewPass('');
                      setConfPass('');
                      setPassSuccess('Salted password updated successfully!');
                      onNotify?.('Password updated.', 'success');
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        value={currPass}
                        onChange={e => setCurrPass(e.target.value)}
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        New Password * (Min 8 chars)
                      </label>
                      <input
                        type="password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
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
                        value={confPass}
                        onChange={e => setConfPass(e.target.value)}
                        className="w-full p-2 border-2 border-black rounded-lg text-xs"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#003057] hover:bg-[#002240] text-white rounded-lg text-xs font-bold border-2 border-black cursor-pointer shadow-xs"
                    >
                      Update Password
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-mono">
                Admin Session: <strong>RAYNOR</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPortalModal(false);
                  setIsAdminUnlocked(false);
                  onNotify?.('Admin session signed out.', 'info');
                }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
              >
                Sign Out &amp; Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION EDIT / ADD MODAL */}
      {showQuestionModal && editingQuestionItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in">
          <div className="bg-white border-4 border-black rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
              <h3 className="font-bold text-base">
                {editingQuestionItem.id ? 'Edit FAQ Entry' : 'Add New FAQ Entry'}
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="p-1 hover:bg-white/20 rounded cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!editingQuestionItem.q.trim() || !editingQuestionItem.a.trim()) {
                  alert('Question and Answer are required.');
                  return;
                }
                const targetKey = editingQuestionItem.toolKey;
                const toolFaqs = faqs[targetKey] || [];
                let updatedList = [...toolFaqs];

                if (editingQuestionItem.id) {
                  const idx = updatedList.findIndex(item => item.id === editingQuestionItem.id);
                  if (idx !== -1) {
                    updatedList[idx] = {
                      ...updatedList[idx],
                      q: editingQuestionItem.q,
                      a: editingQuestionItem.a,
                      remarks: editingQuestionItem.remarks,
                      notes: editingQuestionItem.notes
                    };
                  }
                } else {
                  updatedList.push({
                    id: `q_${Date.now()}`,
                    q: editingQuestionItem.q,
                    a: editingQuestionItem.a,
                    remarks: editingQuestionItem.remarks,
                    notes: editingQuestionItem.notes
                  });
                }

                const updatedFaqs = { ...faqs, [targetKey]: updatedList };
                persistData(tools, updatedFaqs);
                setShowQuestionModal(false);
                onNotify?.('Saved FAQ entry!', 'success');
              }}
              className="p-5 space-y-3.5 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Tool *
                </label>
                <select
                  value={editingQuestionItem.toolKey}
                  onChange={e => setEditingQuestionItem({ ...editingQuestionItem, toolKey: e.target.value })}
                  className="w-full p-2 border-2 border-black rounded-lg text-xs bg-white font-bold"
                >
                  {tools.map(t => (
                    <option key={t.key} value={t.key}>
                      {t.name} ({t.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={editingQuestionItem.q}
                  onChange={e => setEditingQuestionItem({ ...editingQuestionItem, q: e.target.value })}
                  placeholder="e.g. What is the oil needed to fill this tool?"
                  className="w-full p-2 border-2 border-black rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Answer * (High Visibility)
                </label>
                <input
                  type="text"
                  value={editingQuestionItem.a}
                  onChange={e => setEditingQuestionItem({ ...editingQuestionItem, a: e.target.value })}
                  placeholder="e.g. 103063625 - DD-27 Oil"
                  className="w-full p-2 border-2 border-black rounded-lg text-xs font-mono font-bold text-[#c0392b]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Remarks
                </label>
                <textarea
                  rows={2}
                  value={editingQuestionItem.remarks}
                  onChange={e => setEditingQuestionItem({ ...editingQuestionItem, remarks: e.target.value })}
                  placeholder="Operational caution or package appearance note..."
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={editingQuestionItem.notes}
                  onChange={e => setEditingQuestionItem({ ...editingQuestionItem, notes: e.target.value })}
                  placeholder="Fill port location, tool specific instructions..."
                  className="w-full p-2 border-2 border-black rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1a7a3c] hover:bg-[#145a2c] text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
