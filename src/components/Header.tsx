import React from 'react';
import { RigLogo } from './RigLogo';
import {
  Calculator,
  Search,
  Package,
  HelpCircle,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';

export type TabKey = 'home' | 'arp' | 'kitfinder' | 'inventory' | 'faqs';

interface HeaderProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenHelp
}) => {
  return (
    <header className="bg-[#003057] text-white p-2.5 sm:px-5 sm:py-3.5 border-b-4 border-black flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 select-none relative z-30">
      {/* Brand area */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <RigLogo
          size="md"
          onClick={() => onSelectTab('home')}
          className="shrink-0"
        />

        <div className="border-l-2 border-white/25 pl-2.5 sm:pl-3.5 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              onClick={() => onSelectTab('home')}
              className="text-base sm:text-xl font-bold tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer hover:text-blue-100 transition"
              title="Personal Toolkit - raynorcsuruelos@gmail.com"
            >
              Personal Toolkit
            </h1>
            <span className="hidden md:inline-block text-[11px] font-mono text-blue-200/90 font-medium">
              raynorcsuruelos@gmail.com
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-blue-200/80 font-medium flex items-center gap-2 flex-wrap">
            <span>Kuwait IC ARP Calc · WL Kit Finder · WL Lab Inventory · WL Tool FAQs</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
            activeTab === 'home'
              ? 'bg-white text-[#003057] border-black shadow-md'
              : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
          }`}
          title="Toolkit Overview & Dashboard"
        >
          <LayoutGrid className="w-4 h-4 shrink-0 text-amber-300" />
          <span className="hidden sm:inline">Home</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('arp')}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
            activeTab === 'arp'
              ? 'bg-white text-[#003057] border-black shadow-md'
              : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
          }`}
          title="Kuwait IC ARP Calculator"
        >
          <Calculator className="w-4 h-4 shrink-0 text-blue-300" />
          <span>ARP Calc</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('kitfinder')}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
            activeTab === 'kitfinder'
              ? 'bg-white text-[#003057] border-black shadow-md'
              : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
          }`}
          title="WL Kit Finder & Bill of Materials"
        >
          <Search className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>Kit Finder</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('inventory')}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
            activeTab === 'inventory'
              ? 'bg-white text-[#003057] border-black shadow-md'
              : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
          }`}
          title="WL Lab Inventory (Sonde Lab, E-Lab, WHE)"
        >
          <Package className="w-4 h-4 shrink-0 text-sky-300" />
          <span>Inventory</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('faqs')}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ${
            activeTab === 'faqs'
              ? 'bg-white text-[#003057] border-black shadow-md'
              : 'bg-[#002240] text-white border-black/40 hover:bg-[#001830]'
          }`}
          title="WL Tool FAQs - Kuwait"
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-300" />
          <span>Tool FAQs</span>
        </button>

        {/* Global Help Button */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg border-2 border-black/40 bg-[#576574] hover:bg-[#6c7a89] text-white text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95 shadow-sm ml-1"
          title="Help & Contact information"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden lg:inline">Help</span>
        </button>
      </nav>
    </header>
  );
};
