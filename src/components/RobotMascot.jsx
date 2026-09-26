export default function RobotMascot({ size = 88, className = '' }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${className}`} style={{ width: size, height: size }}>
      {/* Floating Sparkles */}
      <span className="absolute -top-1 -right-1 text-xs animate-bounce opacity-80" style={{ animationDuration: '2.5s' }}>✨</span>
      <span className="absolute bottom-2 -left-2 text-[10px] animate-pulse opacity-60">✦</span>
      <span className="absolute top-2 -left-1 text-[9px] animate-pulse opacity-50" style={{ animationDelay: '0.8s' }}>✧</span>

      {/* 3D-Styled AI Mascot SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_8px_16px_rgba(99,102,241,0.25)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Head & Body Gradients */}
          <linearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>

          <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>

          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="antennaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient Shadow */}
        <ellipse cx="60" cy="112" rx="28" ry="6" fill="#6366f1" opacity="0.15" />

        {/* Floating Body */}
        <g style={{ transformOrigin: 'center', animation: 'float 3.5s ease-in-out infinite' }}>
          {/* Antenna */}
          <path d="M 60 25 L 60 14" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="12" r="5" fill="url(#antennaGrad)" />
          <circle cx="60" cy="12" r="2" fill="#a5f3fc" />

          {/* Left Ear / Audio Node */}
          <rect x="23" y="44" width="6" height="14" rx="3" fill="#cbd5e1" />
          <circle cx="26" cy="51" r="2" fill="#818cf8" />

          {/* Right Ear / Audio Node */}
          <rect x="91" y="44" width="6" height="14" rx="3" fill="#cbd5e1" />
          <circle cx="94" cy="51" r="2" fill="#818cf8" />

          {/* Head Capsule */}
          <rect
            x="27"
            y="26"
            width="66"
            height="50"
            rx="20"
            fill="url(#robotBodyGrad)"
            stroke="#ffffff"
            strokeWidth="2"
          />

          {/* Face Screen Display */}
          <rect
            x="34"
            y="33"
            width="52"
            height="36"
            rx="14"
            fill="url(#screenGrad)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Cute Cyan Glowing Eyes */}
          {/* Left Eye */}
          <rect
            x="43"
            y="43"
            width="12"
            height="16"
            rx="6"
            fill="url(#eyeGrad)"
            filter="url(#eyeGlow)"
          />
          <circle cx="47" cy="47" r="2" fill="#ffffff" />

          {/* Right Eye */}
          <rect
            x="65"
            y="43"
            width="12"
            height="16"
            rx="6"
            fill="url(#eyeGrad)"
            filter="url(#eyeGlow)"
          />
          <circle cx="69" cy="47" r="2" fill="#ffffff" />

          {/* Subtle Pink Cheeks */}
          <circle cx="39" cy="56" r="3" fill="#f43f5e" opacity="0.35" />
          <circle cx="81" cy="56" r="3" fill="#f43f5e" opacity="0.35" />

          {/* Torso */}
          <path
            d="M 40 76 C 40 76, 44 100, 60 100 C 76 100, 80 76, 80 76 Z"
            fill="url(#robotBodyGrad)"
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Chest Core Badge */}
          <circle cx="60" cy="86" r="5" fill="#e0e7ff" stroke="#a5b4fc" strokeWidth="1" />
          <circle cx="60" cy="86" r="2.5" fill="#6366f1" />

          {/* Left Arm (Floating wave) */}
          <path
            d="M 37 80 C 27 82, 22 75, 18 69"
            stroke="#e2e8f0"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="17" cy="68" r="4.5" fill="#cbd5e1" />

          {/* Right Arm (Floating wave) */}
          <path
            d="M 83 80 C 93 82, 98 75, 102 69"
            stroke="#e2e8f0"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="103" cy="68" r="4.5" fill="#cbd5e1" />
        </g>
      </svg>
    </div>
  )
}
