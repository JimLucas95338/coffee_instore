import type { Theme } from './types';
import CoffeeCupEmptyDisplay from './scenes/CoffeeCupEmptyDisplay';

const theme: Theme = {
  id: 'eco-delight',
  name: 'Eco Delight Coffee',
  description: 'Warm coffeehouse — forest green, espresso brown, steaming cup and floating beans.',
  palette: {
    surface: {
      950: '20 14 9', // espresso black
      900: '34 22 14',
      800: '46 32 22',
      700: '62 45 33',
      600: '82 61 47',
    },
    accent: {
      300: '141 195 89', // sage
      400: '113 174 60',
      500: '88 145 38', // eco-green core
      600: '70 121 28',
      700: '54 96 22',
    },
    ink: {
      DEFAULT: '253 248 232', // warm cream
      dark: '218 205 169',
    },
    glow: {
      1: '236 168 90', // warm amber
      2: '193 122 58', // toasted caramel
      3: '120 53 15', // espresso brown
    },
  },
  brand: {
    wordmark: { lead: 'Eco', middle: 'Delight', trail: 'Coffee' },
    tagline: 'Fresh roasted, sustainably sourced',
    fullName: 'Eco Delight Coffee',
    receiptHeader: 'ECO DELIGHT COFFEE',
    receiptAddress: ['9731 Dino Dr, Suite 130', 'Elk Grove, CA 95624'],
    startOrderLabel: 'Start Order',
    markGlyph: 'E',
  },
  status: {
    RECEIVED: 'Received',
    IN_PROGRESS: 'In Progress',
    READY: 'Ready',
    PICKED_UP: 'Picked Up',
  },
  hub: {
    title: 'Café Hub',
    subtitle: 'Pick a station to begin your shift.',
    engageLabel: 'Open →',
    tileEmoji: {
      pos: '🧾',
      queue: '☕',
      display: '📺',
      kiosk: '🛒',
      help: '📖',
      menuAdmin: '📋',
      users: '👥',
    },
  },
  EmptyDisplay: CoffeeCupEmptyDisplay,
  markStyle: 'leaf',
};

export default theme;
