'use client';

export default function RocketEmptyDisplay() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-surface-950">
      {/* Starfield backdrop */}
      <div className="absolute inset-0 starfield opacity-90" />

      {/* Distant nebula glow */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 25% 30%, rgba(217, 70, 239, 0.18), transparent 45%), radial-gradient(circle at 75% 70%, rgba(34, 211, 238, 0.14), transparent 50%), radial-gradient(circle at 50% 90%, rgba(255, 107, 53, 0.18), transparent 55%)',
        }}
      />

      {/* Twinkling sparkles */}
      <Sparkle top="14%" left="18%" delay="0s" />
      <Sparkle top="22%" left="78%" delay="1.2s" />
      <Sparkle top="65%" left="12%" delay="0.6s" />
      <Sparkle top="78%" left="68%" delay="1.8s" />
      <Sparkle top="35%" left="45%" delay="2.4s" />
      <Sparkle top="58%" left="85%" delay="0.3s" />

      {/* Saturn-style planet, top-right */}
      <div
        className="absolute"
        style={{
          top: '8%',
          right: '8%',
          animation: 'float-slow 6s ease-in-out infinite',
        }}
      >
        <Planet />
      </div>

      {/* Shooting star (subtle, occasional via long delay) */}
      <ShootingStar />

      {/* Main scene: rocket + tagline */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative mb-6">
          {/* Rocket exhaust glow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-6 h-12 w-16 rounded-full bg-saturn-500/40 blur-2xl"
            style={{ animation: 'twinkle 1.2s ease-in-out infinite' }}
          />
          {/* Floating rocket */}
          <div style={{ animation: 'float-slow 4s ease-in-out infinite' }}>
            <Rocket />
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="font-display text-5xl font-bold tracking-tight">
          <span className="text-saturn-400">3rd</span>{' '}
          <span className="text-cream">Space</span>{' '}
          <span className="text-cream-dark">Coffee</span>
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.4em] text-cream-dark/60">
          The Third Place — In Orbit
        </p>

        <p className="mt-8 max-w-sm text-base text-cream-dark/80">
          Slow-roasted at zero gravity. Order at the kiosk →
        </p>

        {/* Pulse dots */}
        <div className="mt-8 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-saturn-400"
              style={{
                animation: `twinkle 2.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes shoot {
          0% {
            transform: translate(0, 0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          70% {
            opacity: 0.8;
          }
          100% {
            transform: translate(-280px, 200px) scale(0.2);
            opacity: 0;
          }
        }
        @keyframes spark {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.6);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function Sparkle({ top, left, delay }: { top: string; left: string; delay: string }) {
  return (
    <span
      className="pointer-events-none absolute"
      style={{
        top,
        left,
        animation: `spark 2.4s ease-in-out ${delay} infinite`,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14">
        <path
          d="M7 0 L8 6 L14 7 L8 8 L7 14 L6 8 L0 7 L6 6 Z"
          fill="rgba(244,229,194,0.9)"
        />
      </svg>
    </span>
  );
}

function ShootingStar() {
  return (
    <span
      className="pointer-events-none absolute"
      style={{
        top: '15%',
        right: '20%',
        animation: 'shoot 5s ease-in 2s infinite',
      }}
    >
      <svg width="120" height="3" viewBox="0 0 120 3">
        <defs>
          <linearGradient id="ss" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="80%" stopColor="rgba(244,229,194,0.9)" />
            <stop offset="100%" stopColor="rgba(255,107,53,1)" />
          </linearGradient>
        </defs>
        <rect width="120" height="2" rx="1" fill="url(#ss)" />
      </svg>
    </span>
  );
}

function Planet() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="planet-body" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffd6ad" />
          <stop offset="50%" stopColor="#ff7a33" />
          <stop offset="100%" stopColor="#8a3018" />
        </radialGradient>
        <linearGradient id="planet-ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(244,229,194,0.0)" />
          <stop offset="30%" stopColor="rgba(244,229,194,0.7)" />
          <stop offset="50%" stopColor="rgba(255,107,53,0.9)" />
          <stop offset="70%" stopColor="rgba(244,229,194,0.7)" />
          <stop offset="100%" stopColor="rgba(244,229,194,0.0)" />
        </linearGradient>
      </defs>

      {/* Back half of ring */}
      <ellipse
        cx="60"
        cy="60"
        rx="55"
        ry="14"
        fill="none"
        stroke="url(#planet-ring)"
        strokeWidth="6"
        opacity="0.6"
        transform="rotate(-18 60 60)"
        strokeDasharray="40 0"
      />

      {/* Planet sphere */}
      <circle cx="60" cy="60" r="32" fill="url(#planet-body)" />
      {/* Surface bands */}
      <path
        d="M30 56 Q60 50, 90 60"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M32 64 Q60 70, 88 64"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Highlight */}
      <ellipse cx="50" cy="50" rx="8" ry="4" fill="rgba(255,255,255,0.25)" />

      {/* Front half of ring */}
      <path
        d="M 8 65 Q 60 80 112 55"
        stroke="url(#planet-ring)"
        strokeWidth="6"
        fill="none"
        opacity="0.95"
      />
    </svg>
  );
}

function Rocket() {
  return (
    <svg width="160" height="200" viewBox="0 0 160 200" aria-hidden="true">
      <defs>
        <linearGradient id="rocket-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d8c79b" />
          <stop offset="50%" stopColor="#f4e5c2" />
          <stop offset="100%" stopColor="#a8956b" />
        </linearGradient>
        <linearGradient id="rocket-nose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc499" />
          <stop offset="100%" stopColor="#ff6b35" />
        </linearGradient>
        <radialGradient id="window" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="60%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0e7490" />
        </radialGradient>
        <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="40%" stopColor="#ff7a33" />
          <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Flame */}
      <g style={{ transformOrigin: '80px 165px' }}>
        <path
          d="M 65 150 Q 80 195, 95 150 Q 88 175, 80 180 Q 72 175, 65 150 Z"
          fill="url(#flame)"
          opacity="0.95"
        >
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1; 1 1.25; 1 0.9; 1 1.15; 1 1"
            dur="0.7s"
            repeatCount="indefinite"
            additive="sum"
          />
        </path>
        <path
          d="M 70 150 Q 80 175, 90 150"
          fill="#fde68a"
          opacity="0.9"
        />
      </g>

      {/* Fins */}
      <path d="M 50 130 L 30 160 L 55 145 Z" fill="#b8401b" />
      <path d="M 110 130 L 130 160 L 105 145 Z" fill="#b8401b" />

      {/* Body */}
      <path
        d="M 60 60 Q 60 100, 65 145 L 95 145 Q 100 100, 100 60 Z"
        fill="url(#rocket-body)"
      />
      {/* Body shadow */}
      <path
        d="M 88 60 Q 92 100, 90 145 L 95 145 Q 100 100, 100 60 Z"
        fill="rgba(0,0,0,0.18)"
      />
      {/* Body stripes */}
      <rect x="60" y="100" width="40" height="3" fill="#b8401b" />
      <rect x="60" y="120" width="40" height="2" fill="#b8401b" opacity="0.6" />

      {/* Nose cone */}
      <path d="M 60 60 Q 80 5, 100 60 Z" fill="url(#rocket-nose)" />

      {/* Window */}
      <circle cx="80" cy="80" r="11" fill="#1a2046" />
      <circle cx="80" cy="80" r="9" fill="url(#window)" />
      <circle cx="77" cy="77" r="3" fill="rgba(255,255,255,0.7)" />

      {/* Body label */}
      <text
        x="80"
        y="135"
        fontFamily="ui-monospace, monospace"
        fontSize="8"
        fontWeight="700"
        fill="#1a2046"
        textAnchor="middle"
      >
        3SC
      </text>
    </svg>
  );
}
