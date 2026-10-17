import React, { useState } from 'react';

interface RigLogoProps {
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  showBalloonOnHover?: boolean;
}

export const RigLogo: React.FC<RigLogoProps> = ({
  size = 'md',
  onClick,
  className = '',
  showBalloonOnHover = true
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none group ${className}`}
      onMouseEnter={() => showBalloonOnHover && setIsOpen(true)}
      onMouseLeave={() => showBalloonOnHover && setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          if (onClick) {
            onClick();
          } else {
            setIsOpen(prev => !prev);
          }
        }}
        className="bg-white rounded-md px-2 py-1 flex items-center justify-center border-2 border-black/30 shadow-sm cursor-pointer transition-all hover:scale-105 hover:border-[#0066a1] outline-none logo-box-glow focus-visible:ring-2 focus-visible:ring-[#0066a1]"
        title="Personal Toolkit - raynorcsuruelos@gmail.com (Hover for info)"
        aria-label="Oil rig logo and contact info"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${dim} overflow-visible block`}
        >
          <g className="rig-animated-group">
            <path
              d="M24 4 L14 38 M24 4 L34 38"
              stroke="#003057"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M21.4 13 H26.6 M18.8 22 H29.2 M16.2 31 H31.8"
              stroke="#003057"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M21.4 13 L29.2 22 L16.2 31 M26.6 13 L18.8 22 L31.8 31"
              stroke="#0066a1"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <rect x="21" y="2" width="6" height="3.5" rx="1" fill="#003057" />
            <rect x="8" y="37" width="32" height="4" rx="1" fill="#003057" />
            <path
              d="M12 41 V46 M36 41 V46"
              stroke="#003057"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              className="flag-wave-element"
              d="M27 4.5 L33 6.5 L27 8.5 Z"
              fill="#e67e22"
            />
          </g>
        </svg>
      </button>

      {/* Floating Hover Balloon / Tooltip */}
      {showBalloonOnHover && (
        <div
          className={`absolute top-[calc(100%+10px)] left-0 z-50 w-80 max-w-[calc(100vw-32px)] transition-all duration-200 pointer-events-auto ${
            isOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
          }`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="relative bg-white text-gray-900 border-3 border-black rounded-xl p-4 shadow-2xl text-xs sm:text-sm font-medium leading-relaxed">
            {/* Arrow beak */}
            <div className="absolute -top-[9px] left-5 w-4 h-4 bg-white border-t-3 border-l-3 border-black rotate-45" />

            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-gray-200 font-bold text-[#003057]">
              <span className="text-base">💬</span>
              <span>Personal Toolkit Help &amp; Updates</span>
            </div>

            <p className="text-gray-800 leading-normal">
              For help, updates, corrections, contributions, questions, answers, advice, money, complaints, etc., send your message to:
            </p>

            <a
              href="mailto:raynorcsuruelos@gmail.com"
              className="block my-2 font-mono font-bold text-[#0066a1] hover:text-[#002240] hover:underline text-sm break-all"
            >
              raynorcsuruelos@gmail.com
            </a>

            <p className="text-gray-700 font-semibold">
              or just come, I’m always here for <strong>6 weeks</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
