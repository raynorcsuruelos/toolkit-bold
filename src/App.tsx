/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header, TabKey } from './components/Header';
import { HomeDashboard } from './components/home/HomeDashboard';
import { ArpCalculator } from './components/arp/ArpCalculator';
import { KitFinder } from './components/kitfinder/KitFinder';
import { LabInventory } from './components/inventory/LabInventory';
import { ToolFaqs } from './components/faqs/ToolFaqs';
import { HelpModal } from './components/HelpModal';
import {
  Calculator,
  Search,
  Package,
  HelpCircle,
  LayoutGrid,
  Mail,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warn';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'info' | 'error' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#e9edf2] text-gray-900 font-sans flex flex-col items-center p-0 sm:py-3 sm:px-2 selection:bg-[#0066a1] selection:text-white">
      {/* Main Toolkit Container */}
      <div className="w-full max-w-[1300px] bg-white border-x-0 sm:border-4 border-black min-h-screen sm:min-h-0 sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Unified Header */}
        <Header
          activeTab={activeTab}
          onSelectTab={tab => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        {/* Quick Module Switcher Ribbon (When inside a specific tool) */}
        {activeTab !== 'home' && (
          <div className="bg-[#f0f4f8] border-b-2 border-black px-3 sm:px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold select-none">
            <div className="flex items-center gap-2 text-gray-500 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-[#003057] hover:underline cursor-pointer flex items-center gap-1 font-bold"
              >
                <span>Toolkit Home</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-900 font-bold uppercase tracking-wide">
                {activeTab === 'arp' && 'Kuwait IC ARP Calc'}
                {activeTab === 'kitfinder' && 'WL Kit Finder'}
                {activeTab === 'inventory' && 'WL Lab Inventory'}
                {activeTab === 'faqs' && 'WL Tool FAQs'}
              </span>
            </div>

            {/* Quick jump links */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-gray-400 hidden md:inline text-[11px]">Switch Tool:</span>
              <button
                type="button"
                onClick={() => setActiveTab('arp')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  activeTab === 'arp'
                    ? 'bg-[#003057] text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                ARP Calc
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('kitfinder')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  activeTab === 'kitfinder'
                    ? 'bg-[#003057] text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Kit Finder
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#003057] text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Lab Inventory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('faqs')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  activeTab === 'faqs'
                    ? 'bg-[#003057] text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Tool FAQs
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Tool Content */}
        <main className="flex-1 min-h-[600px] bg-white">
          {activeTab === 'home' && (
            <HomeDashboard
              onSelectTab={setActiveTab}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          )}

          {activeTab === 'arp' && (
            <ArpCalculator onNotify={showToast} />
          )}

          {activeTab === 'kitfinder' && (
            <KitFinder onNotify={showToast} />
          )}

          {activeTab === 'inventory' && (
            <LabInventory onNotify={showToast} />
          )}

          {activeTab === 'faqs' && (
            <ToolFaqs onNotify={showToast} />
          )}
        </main>

        {/* Global Footer */}
        <footer className="border-t-4 border-black p-3.5 sm:p-4 bg-[#f0f4f8] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 select-none">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[#003057]">
              Personal Toolkit — raynorcsuruelos@gmail.com
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-gray-500">
              Kuwait IC ARP Calc · WL Kit Finder · WL Lab Inventory · WL Tool FAQs
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="text-[#0066a1] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact &amp; Help</span>
            </button>
            <span>•</span>
            <span className="text-gray-400 font-mono text-[11px]">
              Offline IndexedDB &amp; LocalStorage
            </span>
          </div>
        </footer>
      </div>

      {/* Universal Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Toast Notification Stream */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          let bg = 'bg-[#003057]';
          if (toast.type === 'success') bg = 'bg-[#1a7a3c]';
          if (toast.type === 'error') bg = 'bg-[#c0392b]';
          if (toast.type === 'warn') bg = 'bg-[#d97706]';
          return (
            <div
              key={toast.id}
              className={`${bg} text-white px-4 py-3 rounded-lg border-2 border-black shadow-xl font-bold text-xs pointer-events-auto flex items-center justify-between gap-3 animate-pop-in`}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-white/80 hover:text-white p-0.5 text-sm leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
