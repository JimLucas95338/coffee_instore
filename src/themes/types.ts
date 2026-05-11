import type { ComponentType } from 'react';

export type ThemeId = '3rd-space' | 'eco-delight';

export interface ThemePalette {
  /** Surface scale (page bg → cards) — RGB strings without commas, e.g. "5 7 26". */
  surface: {
    950: string;
    900: string;
    800: string;
    700: string;
    600: string;
  };
  /** Brand primary (buttons, highlights). 5 stops cover most uses. */
  accent: {
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
  };
  /** Text colors. */
  ink: {
    DEFAULT: string;
    dark: string;
  };
  /** Decorative accents (3 stops for variation). */
  glow: {
    1: string;
    2: string;
    3: string;
  };
}

export interface BrandText {
  /** Three-part wordmark: "<lead> <middle> <trail>" — e.g. "3rd Space Coffee". */
  wordmark: { lead: string; middle: string; trail: string };
  /** Single-line short tagline. */
  tagline: string;
  /** Friendly full name used in metadata, page titles. */
  fullName: string;
  /** All-caps single line printed at the top of receipts and cup labels. */
  receiptHeader: string;
  /** Single line under receipt header (address). */
  receiptAddress?: string[];
  /** CTA button label on the kiosk welcome screen. */
  startOrderLabel: string;
  /** Single character or short string used in the brand mark, e.g. "3" or "E". */
  markGlyph: string;
}

export interface StatusLabels {
  RECEIVED: string;
  IN_PROGRESS: string;
  READY: string;
  PICKED_UP: string;
}

export interface HubConfig {
  /** Big heading at the top of /instore/home (e.g. "Mission Control"). */
  title: string;
  /** One-line subtitle under the heading. */
  subtitle: string;
  /** Footer CTA on each tile (e.g. "Engage →" / "Open →"). */
  engageLabel: string;
  /** Emoji shown on each tile. */
  tileEmoji: {
    pos: string;
    bar: string;
    queue: string;
    display: string;
    kiosk: string;
    help: string;
    menuAdmin: string;
    users: string;
  };
}

export interface Theme {
  id: ThemeId;
  /** Human-friendly theme name shown in the admin picker. */
  name: string;
  /** One-sentence description shown in the admin picker. */
  description: string;
  palette: ThemePalette;
  brand: BrandText;
  status: StatusLabels;
  hub: HubConfig;
  /** Component rendered on the customer Display when the queue is empty. */
  EmptyDisplay: ComponentType;
  /**
   * Whether the brand mark should render with an orbital ring (3rd-space style)
   * or a different decorative motif (set per theme).
   */
  markStyle: 'orbital' | 'leaf';
}
