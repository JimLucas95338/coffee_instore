'use client';

export default function EmptyDisplay() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Warm radial gradient backdrop */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(217, 119, 6, 0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.12), transparent 55%)',
        }}
      />

      {/* Floating coffee beans (subtle) */}
      <FloatingBean style={{ top: '12%', left: '15%', animationDelay: '0s' }} />
      <FloatingBean style={{ top: '78%', left: '22%', animationDelay: '1.4s' }} />
      <FloatingBean style={{ top: '20%', right: '14%', animationDelay: '2.6s' }} />
      <FloatingBean style={{ bottom: '18%', right: '10%', animationDelay: '0.8s' }} />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Steam wisps */}
        <div className="relative mb-2 h-20 w-32">
          <Steam left="38%" delay="0s" />
          <Steam left="50%" delay="0.6s" />
          <Steam left="62%" delay="1.2s" />
        </div>

        {/* Cup illustration */}
        <svg
          viewBox="0 0 200 160"
          className="w-56 h-44 drop-shadow-[0_10px_30px_rgba(217,119,6,0.25)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cupBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="cupRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <radialGradient id="brew" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#1c0a04" />
            </radialGradient>
          </defs>

          {/* Saucer */}
          <ellipse cx="100" cy="142" rx="78" ry="9" fill="#0a0a0a" opacity="0.5" />
          <ellipse cx="100" cy="138" rx="74" ry="8" fill="url(#cupRim)" />

          {/* Handle */}
          <path
            d="M150 76 Q186 78, 184 100 Q182 122, 150 122"
            stroke="url(#cupBody)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />

          {/* Cup body */}
          <path
            d="M40 70 Q40 130, 70 134 L130 134 Q160 130, 160 70 Z"
            fill="url(#cupBody)"
          />
          {/* Cup highlight */}
          <path
            d="M48 76 Q48 122, 70 128"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Rim */}
          <ellipse cx="100" cy="70" rx="60" ry="10" fill="url(#cupRim)" />

          {/* Brew surface */}
          <ellipse cx="100" cy="70" rx="54" ry="8" fill="url(#brew)" />
          {/* Crema highlight */}
          <ellipse
            cx="92"
            cy="68"
            rx="22"
            ry="3"
            fill="rgba(255, 220, 170, 0.22)"
          />
        </svg>

        {/* Tagline */}
        <h2 className="mt-6 text-3xl font-bold tracking-tight">
          <span className="text-amber-300">Welcome</span>{' '}
          <span className="text-neutral-200">to Eco Delight</span>
        </h2>
        <p className="mt-3 max-w-sm text-base text-neutral-400">
          Freshly brewed, slowly roasted. Take a look at our menu →
        </p>

        {/* Decorative dotted divider */}
        <div className="mt-8 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-amber-400/40"
              style={{
                animation: `pulse-dot 2.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes steam-rise {
          0% {
            transform: translate(-50%, 10px) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          80% {
            opacity: 0.4;
          }
          100% {
            transform: translate(calc(-50% + 12px), -70px) scale(1.4);
            opacity: 0;
          }
        }
        @keyframes float-bean {
          0%,
          100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.25;
          }
          50% {
            transform: translate(6px, -10px) rotate(15deg);
            opacity: 0.5;
          }
        }
        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 0.25;
            transform: scale(0.8);
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

function Steam({ left, delay }: { left: string; delay: string }) {
  return (
    <span
      className="pointer-events-none absolute bottom-0 block h-12 w-3 rounded-full bg-white/70 blur-sm"
      style={{
        left,
        animation: `steam-rise 2.4s ease-out ${delay} infinite`,
      }}
    />
  );
}

function FloatingBean({ style }: { style: React.CSSProperties }) {
  return (
    <span
      className="pointer-events-none absolute"
      style={{
        ...style,
        animation: `float-bean 5s ease-in-out ${style.animationDelay} infinite`,
      }}
    >
      <svg width="24" height="32" viewBox="0 0 24 32" aria-hidden="true">
        <ellipse cx="12" cy="16" rx="9" ry="14" fill="#78350f" />
        <path
          d="M12 4 Q8 16, 12 28"
          stroke="#1c0a04"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
