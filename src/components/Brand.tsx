'use client';

import { useTheme } from './ThemeContext';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, { wrap: string; mark: string; text: string; sub: string }> = {
  sm: { wrap: 'gap-2', mark: 'h-7 w-7', text: 'text-base', sub: 'text-[10px]' },
  md: { wrap: 'gap-3', mark: 'h-9 w-9', text: 'text-lg', sub: 'text-xs' },
  lg: { wrap: 'gap-3', mark: 'h-12 w-12', text: 'text-2xl', sub: 'text-xs' },
  xl: { wrap: 'gap-4', mark: 'h-16 w-16', text: 'text-4xl', sub: 'text-sm' },
};

/**
 * Brand mark — a glyph from the active theme inside a colored rounded square.
 * The 3rd Space theme renders an orbital ring + dot; the Eco Delight theme
 * renders a leaf accent. The accent color comes from CSS vars so theme swap
 * recolors automatically.
 */
export function BrandMark({ size = 'md', spin = false }: { size?: Size; spin?: boolean }) {
  const theme = useTheme();
  const s = sizeMap[size];

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 ${s.mark} shadow-[0_0_30px_rgb(var(--color-accent-500)/0.35)]`}
    >
      <span
        className="font-display font-bold text-surface-950"
        style={{ fontSize: 'calc(60%)' }}
      >
        {theme.brand.markGlyph}
      </span>

      {theme.markStyle === 'orbital' ? (
        <>
          <span
            className="pointer-events-none absolute inset-1 rounded-full border border-ink/30"
            style={{ transform: 'rotate(-20deg)' }}
          />
          <span
            className="pointer-events-none absolute"
            style={{
              left: '50%',
              top: '6%',
              transform: 'translateX(-50%)',
              animation: spin ? 'orbit 8s linear infinite' : undefined,
              transformOrigin: 'center 200%',
            }}
          >
            <span className="block h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
        </>
      ) : (
        // leaf
        <span
          className="pointer-events-none absolute"
          style={{ top: '-15%', right: '-10%' }}
        >
          <svg width="40%" height="40%" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 18 Q4 4, 22 4 Q22 18, 8 22 Q4 22, 4 18 Z"
              fill="rgb(var(--color-accent-300))"
              stroke="rgb(var(--color-surface-950))"
              strokeWidth="1"
            />
            <path
              d="M6 18 L18 6"
              stroke="rgb(var(--color-surface-950))"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
    </span>
  );
}

export function BrandWordmark({
  size = 'md',
  align = 'left',
  withTagline = false,
}: {
  size?: Size;
  align?: 'left' | 'center';
  withTagline?: boolean;
}) {
  const theme = useTheme();
  const s = sizeMap[size];
  const { lead, middle, trail } = theme.brand.wordmark;

  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center' : ''}`}>
      <span className={`font-display font-bold tracking-tight ${s.text}`}>
        <span className="text-accent-400">{lead}</span>{' '}
        <span className="text-ink">{middle}</span>{' '}
        <span className="text-ink-dark">{trail}</span>
      </span>
      {withTagline && (
        <span
          className={`font-mono uppercase tracking-[0.25em] text-ink-dark/60 ${s.sub}`}
        >
          {theme.brand.tagline}
        </span>
      )}
    </div>
  );
}

export function Brand({
  size = 'md',
  withTagline = false,
  spin = false,
  align = 'left',
}: {
  size?: Size;
  withTagline?: boolean;
  spin?: boolean;
  align?: 'left' | 'center';
}) {
  const s = sizeMap[size];
  return (
    <div
      className={`flex items-center ${s.wrap} ${
        align === 'center' ? 'justify-center' : ''
      }`}
    >
      <BrandMark size={size} spin={spin} />
      <BrandWordmark size={size} withTagline={withTagline} align={align} />
    </div>
  );
}
