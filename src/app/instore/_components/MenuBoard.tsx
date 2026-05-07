'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '@/components/ThemeContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  mediumPrice: number | null;
  largePrice: number | null;
  allowSizes: boolean;
  available: boolean;
}

interface MenuResponse {
  items: MenuItem[];
  grouped: Record<string, MenuItem[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ['ESPRESSO', 'DRIP', 'COLD', 'TEA', 'FOOD'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  ESPRESSO: 'Espresso Drinks',
  DRIP: 'Drip Coffee',
  COLD: 'Cold Beverages',
  TEA: 'Tea',
  FOOD: 'Food & Snacks',
};

const POLL_INTERVAL = 60_000;
const ROTATE_INTERVAL = 15_000;
const FADE_DURATION = 800;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component: CategoryPage
// ---------------------------------------------------------------------------

function CategoryPage({
  category,
  items,
  embedded,
}: {
  category: string;
  items: MenuItem[];
  embedded: boolean;
}) {
  const label = CATEGORY_LABELS[category] ?? category;

  const headerSize = embedded ? 32 : 48;
  const itemNameSize = embedded ? 20 : 28;
  const priceSize = embedded ? 18 : 24;
  const descSize = embedded ? 13 : 16;
  const soldOutSize = embedded ? 16 : 22;
  const px = embedded ? 'px-6' : 'px-16';
  const priceWidth = embedded ? 'w-20' : 'w-28';
  const priceSpanWidth = embedded ? 'w-[240px]' : 'w-[336px]';

  return (
    <div className={`flex h-full w-full flex-col ${px} pb-8 pt-4`}>
      {/* Category header */}
      <h2
        className="mb-4 border-b border-amber-900/40 pb-3 text-center font-semibold tracking-wide"
        style={{ fontSize: headerSize, color: '#fef3c7' }}
      >
        {label}
      </h2>

      {/* Column headers */}
      <div className="mb-3 flex items-center px-2 text-sm uppercase tracking-widest text-neutral-500">
        <span className="flex-1">Item</span>
        {items.some((i) => i.allowSizes) ? (
          <>
            <span className={`${priceWidth} text-center`}>Small</span>
            <span className={`${priceWidth} text-center`}>Medium</span>
            <span className={`${priceWidth} text-center`}>Large</span>
          </>
        ) : (
          <span className={`${priceWidth} text-center`}>Price</span>
        )}
      </div>

      {/* Items list */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {items.map((item, idx) => {
          const hasSizes = item.allowSizes;
          const anySizes = items.some((i) => i.allowSizes);

          return (
            <div key={item.id}>
              {idx > 0 && <div className="mx-2 border-t border-neutral-800" />}
              <div className="flex items-baseline px-2 py-2">
                {/* Name & description */}
                <div className="flex-1 min-w-0">
                  <span
                    className="font-medium"
                    style={{ fontSize: itemNameSize, color: '#fef3c7' }}
                  >
                    {item.name}
                  </span>
                  {!item.available && (
                    <span
                      className="ml-3 font-bold"
                      style={{ fontSize: soldOutSize, color: '#ef4444' }}
                    >
                      SOLD OUT
                    </span>
                  )}
                  {item.description && (
                    <p
                      className="mt-0.5 truncate text-neutral-400"
                      style={{ fontSize: descSize }}
                    >
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Prices */}
                {item.available ? (
                  anySizes ? (
                    hasSizes ? (
                      <>
                        <span
                          className={`${priceWidth} text-center font-medium text-neutral-200`}
                          style={{ fontSize: priceSize }}
                        >
                          {formatPrice(item.basePrice)}
                        </span>
                        <span
                          className={`${priceWidth} text-center font-medium text-neutral-200`}
                          style={{ fontSize: priceSize }}
                        >
                          {item.mediumPrice != null ? formatPrice(item.mediumPrice) : '\u2014'}
                        </span>
                        <span
                          className={`${priceWidth} text-center font-medium text-neutral-200`}
                          style={{ fontSize: priceSize }}
                        >
                          {item.largePrice != null ? formatPrice(item.largePrice) : '\u2014'}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`flex ${priceSpanWidth} items-center justify-center font-medium text-neutral-200`}
                        style={{ fontSize: priceSize }}
                      >
                        {formatPrice(item.basePrice)}
                      </span>
                    )
                  ) : (
                    <span
                      className={`${priceWidth} text-center font-medium text-neutral-200`}
                      style={{ fontSize: priceSize }}
                    >
                      {formatPrice(item.basePrice)}
                    </span>
                  )
                ) : anySizes ? (
                  <span className={priceSpanWidth} />
                ) : (
                  <span className={priceWidth} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: ProgressDots
// ---------------------------------------------------------------------------

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block rounded-full transition-all duration-500 ${
            i === active ? 'h-3 w-3 bg-amber-400' : 'h-2.5 w-2.5 bg-neutral-700'
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuBoard
// ---------------------------------------------------------------------------

interface MenuBoardProps {
  embedded?: boolean;
}

export default function MenuBoard({ embedded = false }: MenuBoardProps) {
  const theme = useTheme();
  const [grouped, setGrouped] = useState<Record<string, MenuItem[]>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);

  const groupedRef = useRef(grouped);
  groupedRef.current = grouped;

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/instore/menu');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MenuResponse = await res.json();
      setGrouped(data.grouped);
      setError(null);
    } catch (err) {
      console.error('Menu fetch failed:', err);
      if (Object.keys(groupedRef.current).length === 0) {
        setError('Unable to load menu. Retrying...');
      }
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    const id = setInterval(fetchMenu, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMenu]);

  useEffect(() => {
    if (categories.length <= 1) return;

    const id = setInterval(() => {
      setVisible(false);

      setTimeout(() => {
        setActiveIndex((prev) => {
          const next = (prev + 1) % categories.length;
          setDisplayIndex(next);
          return next;
        });
        setVisible(true);
      }, FADE_DURATION);
    }, ROTATE_INTERVAL);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  useEffect(() => {
    if (categories.length > 0 && displayIndex >= categories.length) {
      setDisplayIndex(0);
      setActiveIndex(0);
    }
  }, [categories.length, displayIndex]);

  const currentCategory = categories[displayIndex];
  const currentItems = currentCategory ? grouped[currentCategory] ?? [] : [];

  const headerSize = embedded ? 28 : 40;

  return (
    <div
      className={`flex flex-col overflow-hidden bg-black ${embedded ? 'h-full' : 'h-screen w-screen'}`}
      style={embedded ? undefined : { cursor: 'none' }}
    >
      {/* Header / Branding */}
      <header className="flex flex-shrink-0 items-center justify-center gap-3 px-6 pt-6 pb-2">
        <div className="flex items-center gap-3">
          <h1
            className="font-display font-bold tracking-tight"
            style={{ fontSize: headerSize }}
          >
            <span className="text-accent-400">{theme.brand.wordmark.lead}</span>{' '}
            <span className="text-ink">{theme.brand.wordmark.middle}</span>{' '}
            <span className="text-ink-dark">{theme.brand.wordmark.trail}</span>
          </h1>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative flex-1 overflow-hidden">
        {error && categories.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl text-neutral-500">{error}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl text-neutral-600">Loading menu...</p>
          </div>
        ) : (
          <div
            className="h-full w-full"
            style={{
              opacity: visible ? 1 : 0,
              transition: `opacity ${FADE_DURATION}ms ease-in-out`,
            }}
          >
            <CategoryPage category={currentCategory} items={currentItems} embedded={embedded} />
          </div>
        )}
      </main>

      {/* Progress dots */}
      {categories.length > 1 && (
        <footer className="flex-shrink-0 pb-4 pt-2">
          <ProgressDots total={categories.length} active={activeIndex} />
        </footer>
      )}
    </div>
  );
}
