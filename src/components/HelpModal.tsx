import React from 'react';
import { Mail, Clock, HelpCircle, X, ExternalLink } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-pop-in"
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-black rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#003057] text-white px-5 py-3.5 flex items-center justify-between border-b-3 border-black">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-300" />
            <h3 className="font-bold text-base sm:text-lg">Personal Toolkit Help &amp; Contact</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded cursor-pointer transition text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="p-4 bg-[#e8f4fd] border-2 border-[#0066a1] rounded-xl text-center space-y-2">
            <div className="text-3xl">📬</div>
            <div className="font-bold text-gray-900 text-sm">
              For help, updates, corrections, contributions, questions, answers, advice, money, complaints, etc., send your message to:
            </div>
            <a
              href="mailto:raynorcsuruelos@gmail.com"
              className="inline-block text-[#0066a1] text-base font-bold font-mono underline hover:text-[#004e7c] break-all"
            >
              raynorcsuruelos@gmail.com
            </a>
            <div className="text-gray-700 font-semibold text-xs pt-1">
              or just come, I’m always here for <strong>6 weeks</strong>.
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="font-bold text-[#003057] uppercase text-xs tracking-wider">
              Integrated Modules in this Toolkit
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-300">
                <div className="font-bold text-[#003057] flex items-center gap-1.5">
                  <span>🧮 Kuwait IC ARP Calc</span>
                </div>
                <div className="text-gray-600 mt-1">
                  Half-year working days, expected 67% days ON, neutral cap (60d), personal salary mode with daily rate and payout calculation.
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-300">
                <div className="font-bold text-[#003057] flex items-center gap-1.5">
                  <span>🔍 WL Kit Finder</span>
                </div>
                <div className="text-gray-600 mt-1">
                  70+ maintenance kits, bill of materials (BOM), reverse part search, kPod attachment browser, CSV/JSON admin upload.
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-300">
                <div className="font-bold text-[#003057] flex items-center gap-1.5">
                  <span>📦 WL Lab Inventory</span>
                </div>
                <div className="text-gray-600 mt-1">
                  Multi-store inventory manager (Sonde Lab, E-Lab, WHE), Dexie IndexedDB offline storage, quick stock adjustments and trends.
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-300">
                <div className="font-bold text-[#003057] flex items-center gap-1.5">
                  <span>❓ WL Tool FAQs</span>
                </div>
                <div className="text-gray-600 mt-1">
                  Tool operational FAQs (USIT, Resolve-iX, Spear, etc.), high-contrast answers, remarks/notes, live query autocomplete, and kPod links.
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>100% Offline Capable &amp; Local:</strong> All data is securely kept in your browser's persistent storage (IndexedDB &amp; localStorage).
            </div>
          </div>
        </div>

        <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center">
          <a
            href="mailto:raynorcsuruelos@gmail.com?subject=Personal%20Toolkit%20Feedback"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#0066a1] hover:underline"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send Direct Email</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-lg border border-black cursor-pointer shadow-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
