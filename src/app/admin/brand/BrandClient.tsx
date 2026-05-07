'use client';

import { useEffect, useState } from 'react';

interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  brand: {
    wordmark: { lead: string; middle: string; trail: string };
    tagline: string;
    markGlyph: string;
  };
  palette: {
    surface: { 950: string; 900: string; 800: string; 700: string; 600: string };
    accent: { 300: string; 400: string; 500: string; 600: string; 700: string };
    ink: { DEFAULT: string; dark: string };
    glow: { 1: string; 2: string; 3: string };
  };
}

export default function BrandClient() {
  const [themes, setThemes] = useState<ThemeMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/theme');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setThemes(data.themes);
      setActiveId(data.activeThemeId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function apply(themeId: string) {
    if (themeId === activeId) return;
    if (!confirm(`Switch the active theme to "${themes.find((t) => t.id === themeId)?.name}"? The page will reload to apply.`)) {
      return;
    }
    setApplying(themeId);
    const res = await fetch('/api/admin/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    if (!res.ok) {
      alert((await res.json()).error || 'Failed');
      setApplying(null);
      return;
    }
    // Hard reload so the root layout fetches the new theme and CSS vars
    // repaint without a flash.
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Brand &amp; Theme</h1>
        <p className="text-ink-dark/70 mt-1 text-sm">
          Pick the active theme. Changes apply across the kiosk, POS, queue,
          customer display, login, hub, receipts, and cup labels. The brand
          mark, wordmark, palette, status labels, and decorative scene all swap
          together.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-ink-dark/60">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              isActive={t.id === activeId}
              isApplying={applying === t.id}
              onApply={() => apply(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  isActive,
  isApplying,
  onApply,
}: {
  theme: ThemeMeta;
  isActive: boolean;
  isApplying: boolean;
  onApply: () => void;
}) {
  const { palette, brand } = theme;
  const swatchSurface = palette.surface[900];
  const swatchAccent = palette.accent[500];
  const swatchInk = palette.ink.DEFAULT;
  const swatchGlow1 = palette.glow[1];

  // Render a self-contained card preview using inline styles so the active
  // theme's CSS variables don't override the swatches.
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        background: `rgb(${swatchSurface})`,
        borderColor: isActive ? `rgb(${swatchAccent})` : 'rgb(38,40,60)',
        boxShadow: isActive ? `0 0 0 2px rgb(${swatchAccent} / 0.4)` : 'none',
      }}
    >
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-2xl"
            style={{
              background: `linear-gradient(135deg, rgb(${swatchAccent}), rgb(${palette.accent[700]}))`,
              color: `rgb(${palette.surface[950]})`,
            }}
          >
            {brand.markGlyph}
          </div>
          <div>
            <div
              className="font-display font-bold text-xl"
              style={{ color: `rgb(${swatchInk})` }}
            >
              <span style={{ color: `rgb(${palette.accent[400]})` }}>{brand.wordmark.lead}</span>{' '}
              <span style={{ color: `rgb(${swatchInk})` }}>{brand.wordmark.middle}</span>{' '}
              <span style={{ color: `rgb(${palette.ink.dark})` }}>{brand.wordmark.trail}</span>
            </div>
            <div
              className="text-[10px] font-mono uppercase tracking-[0.25em]"
              style={{ color: `rgb(${palette.ink.dark} / 0.6)` }}
            >
              {brand.tagline}
            </div>
          </div>
        </div>

        <p className="text-sm" style={{ color: `rgb(${palette.ink.dark} / 0.85)` }}>
          {theme.description}
        </p>

        <div className="flex gap-1.5">
          {[
            palette.surface[950],
            palette.surface[700],
            palette.accent[500],
            palette.accent[300],
            palette.ink.DEFAULT,
            palette.glow[1],
            palette.glow[2],
            palette.glow[3],
          ].map((rgb, i) => (
            <span
              key={i}
              className="block h-6 w-6 rounded-md"
              style={{ background: `rgb(${rgb})` }}
              title={rgb}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          {isActive ? (
            <span
              className="font-mono text-xs uppercase tracking-[0.25em] rounded-full px-3 py-1"
              style={{
                background: `rgb(${swatchAccent} / 0.15)`,
                color: `rgb(${swatchAccent})`,
                border: `1px solid rgb(${swatchAccent} / 0.4)`,
              }}
            >
              ● Active
            </span>
          ) : (
            <span
              className="font-mono text-xs uppercase tracking-[0.25em] text-ink-dark/40"
            >
              Available
            </span>
          )}
          <button
            onClick={onApply}
            disabled={isActive || isApplying}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: isActive ? 'transparent' : `rgb(${swatchAccent})`,
              color: isActive ? `rgb(${swatchInk} / 0.5)` : `rgb(${palette.surface[950]})`,
              border: isActive ? `1px solid rgb(${swatchInk} / 0.2)` : 'none',
            }}
          >
            {isActive ? 'In use' : isApplying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
