type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, { wrap: string; mark: string; text: string; sub: string }> = {
  sm: { wrap: 'gap-2', mark: 'h-7 w-7', text: 'text-base', sub: 'text-[10px]' },
  md: { wrap: 'gap-3', mark: 'h-9 w-9', text: 'text-lg', sub: 'text-xs' },
  lg: { wrap: 'gap-3', mark: 'h-12 w-12', text: 'text-2xl', sub: 'text-xs' },
  xl: { wrap: 'gap-4', mark: 'h-16 w-16', text: 'text-4xl', sub: 'text-sm' },
};

/**
 * 3rd Space Coffee brand mark — a numeric "3" with an orbiting dot inside a
 * rounded square. Pairs with the wordmark in the display font.
 */
export function BrandMark({ size = 'md', spin = false }: { size?: Size; spin?: boolean }) {
  const s = sizeMap[size];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saturn-500 to-saturn-700 ${s.mark} shadow-[0_0_30px_rgba(255,107,53,0.35)]`}
    >
      <span
        className="font-display font-bold text-space-950"
        style={{ fontSize: 'calc(60%)' }}
      >
        3
      </span>
      <span
        className="pointer-events-none absolute inset-1 rounded-full border border-cream/30"
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
        <span className="block h-1.5 w-1.5 rounded-full bg-cream" />
      </span>
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
  const s = sizeMap[size];
  return (
    <div className={`flex flex-col ${align === 'center' ? 'items-center' : ''}`}>
      <span className={`font-display font-bold tracking-tight ${s.text}`}>
        <span className="text-saturn-400">3rd</span>{' '}
        <span className="text-cream">Space</span>{' '}
        <span className="text-cream-dark">Coffee</span>
      </span>
      {withTagline && (
        <span
          className={`font-mono uppercase tracking-[0.25em] text-cream-dark/60 ${s.sub}`}
        >
          The Third Place — In Orbit
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
