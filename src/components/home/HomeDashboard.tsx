import React from 'react';
import { TabKey } from '../Header';
import {
  Calculator,
  Search,
  Package,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Database,
  Calendar,
  Layers,
  FileText,
  Mail,
  Zap
} from 'lucide-react';

interface HomeDashboardProps {
  onSelectTab: (tab: TabKey) => void;
  onOpenHelp: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onSelectTab,
  onOpenHelp
}) => {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px] mx-auto">
      {/* Welcome Hero Banner */}
      <div className="bg-[#003057] text-white p-5 sm:p-7 rounded-xl border-4 border-black shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0066a1] text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Interactive Tools Hub</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            Personal Toolkit
          </h2>

          <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed font-normal">
            A cohesive collection combining all four specialized applications.
            Work with any tool seamlessly, retain local offline data in your browser, and switch back and forth with consistent styling.
          </p>

          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded border border-white/20">
              raynorcsuruelos@gmail.com
            </span>
            <span className="text-xs text-blue-200">
              • 100% Offline &amp; Client-Side Resilient
            </span>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none select-none hidden sm:block">
          <svg className="w-64 h-64" viewBox="0 0 48 48" fill="none">
            <path d="M24 4 L14 38 M24 4 L34 38" stroke="currentColor" strokeWidth="2" />
            <path d="M21.4 13 H26.6 M18.8 22 H29.2 M16.2 31 H31.8" stroke="currentColor" strokeWidth="2" />
            <rect x="8" y="37" width="32" height="4" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* 4 Core Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Module 1: Kuwait IC ARP Calc */}
        <div className="bg-white border-3 border-black rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#003057] text-white flex items-center justify-center shrink-0 border-2 border-black">
                <Calculator className="w-5 h-5 text-amber-300" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#0066a1] border border-blue-200 font-mono">
                H1/H2 · 67% TARGET
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#003057] group-hover:text-[#0066a1] transition flex items-center gap-1.5">
                <span>Kuwait IC ARP Calc</span>
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
                Calculate working days, expected 67% days ON, 60-day neutral cap rules, and payout amounts for H1 or H2. Includes Argon2-protected Personal Mode for confidential salary inputs and festive celebration animations.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                2026–2035 Years
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Personal Mode
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">Module 1</span>
            <button
              type="button"
              onClick={() => onSelectTab('arp')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white text-xs font-bold rounded-lg border-2 border-black cursor-pointer shadow-xs active:scale-95 transition"
            >
              <span>Open Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module 2: WL Kit Finder */}
        <div className="bg-white border-3 border-black rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#003057] text-white flex items-center justify-center shrink-0 border-2 border-black">
                <Search className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                70+ KITS · LIVE BOM
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#003057] group-hover:text-[#0066a1] transition flex items-center gap-1.5">
                <span>WL Kit Finder</span>
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
                Quick 4-step selector for Sonde tools, maintenance type (SLS/WA/PM), and levels. Features comprehensive Bills of Materials (BOM), reverse part-number lookup, kPod PDF attachment search, and CSV import/export.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                14 Tool Families
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                kPod PDF Browser
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">Module 2</span>
            <button
              type="button"
              onClick={() => onSelectTab('kitfinder')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white text-xs font-bold rounded-lg border-2 border-black cursor-pointer shadow-xs active:scale-95 transition"
            >
              <span>Launch Kit Finder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module 3: WL Lab Inventory */}
        <div className="bg-white border-3 border-black rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#003057] text-white flex items-center justify-center shrink-0 border-2 border-black">
                <Package className="w-5 h-5 text-sky-300" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono">
                DEXIE INDEXEDDB · MULTI-STORE
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#003057] group-hover:text-[#0066a1] transition flex items-center gap-1.5">
                <span>WL Lab Inventory</span>
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
                Stock &amp; parts manager tailored for Sonde Lab, E-Lab, and WHE. Direct stock increments/deductions, low-stock threshold triggers, usage trend charts, and password-protected admin actions.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                Persistent IndexedDB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sub-Store Access
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">Module 3</span>
            <button
              type="button"
              onClick={() => onSelectTab('inventory')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white text-xs font-bold rounded-lg border-2 border-black cursor-pointer shadow-xs active:scale-95 transition"
            >
              <span>Open Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module 4: WL Tool FAQs */}
        <div className="bg-white border-3 border-black rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#003057] text-white flex items-center justify-center shrink-0 border-2 border-black">
                <HelpCircle className="w-5 h-5 text-amber-300" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                SALTED SHA-256 · LIVE QUERY
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#003057] group-hover:text-[#0066a1] transition flex items-center gap-1.5">
                <span>WL Tool FAQs - Kuwait</span>
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
                Wireline tool maintenance FAQs (USIT, HRMS, Resolve-iX, Spear, TuffTRAC, etc.). High-visibility answers, remarks, notes, live query search with autocomplete &amp; quick chips, plus salted SHA-256 admin CSV management.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                Live Answer Search
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                kPod Attachment Search
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">Module 4</span>
            <button
              type="button"
              onClick={() => onSelectTab('faqs')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003057] hover:bg-[#002240] text-white text-xs font-bold rounded-lg border-2 border-black cursor-pointer shadow-xs active:scale-95 transition"
            >
              <span>Explore FAQs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* External Portals Links bar */}
      <div className="bg-[#f0f4f8] border-3 border-black rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-[#003057]">
          <span>🔗 Quick External Portals:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://loadchart.slb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#003057] rounded-lg border-2 border-black font-bold cursor-pointer transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0066a1]" />
            <span>Load Chart</span>
          </a>
          <a
            href="https://mystatements.slb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#003057] rounded-lg border-2 border-black font-bold cursor-pointer transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0066a1]" />
            <span>Payslip</span>
          </a>
          <a
            href="https://imapp.bluemm.gt.slb.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-[#003057] rounded-lg border-2 border-black font-bold cursor-pointer transition shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0066a1]" />
            <span>Check BlueMM</span>
          </a>
        </div>
      </div>
    </div>
  );
};
