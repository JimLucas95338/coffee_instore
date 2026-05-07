import type { Theme } from './types';
import RocketEmptyDisplay from './scenes/RocketEmptyDisplay';

const theme: Theme = {
  id: '3rd-space',
  name: '3rd Space Coffee',
  description: 'Retro mid-century space age — Saturn orange, deep navy, rocket and ringed planet.',
  palette: {
    surface: {
      950: '5 7 26',
      900: '10 14 39',
      800: '16 22 51',
      700: '26 32 70',
      600: '37 43 94',
    },
    accent: {
      300: '255 158 92',
      400: '255 122 51',
      500: '255 107 53',
      600: '229 84 33',
      700: '184 64 27',
    },
    ink: {
      DEFAULT: '244 229 194',
      dark: '216 199 155',
    },
    glow: {
      1: '34 211 238', // cyan
      2: '217 70 239', // magenta
      3: '139 92 246', // violet
    },
  },
  brand: {
    wordmark: { lead: '3rd', middle: 'Space', trail: 'Coffee' },
    tagline: 'The Third Place — In Orbit',
    fullName: '3rd Space Coffee',
    receiptHeader: '3RD SPACE COFFEE',
    receiptAddress: ['9731 Dino Dr, Suite 130', 'Elk Grove, CA 95624'],
    startOrderLabel: 'Launch Order',
    markGlyph: '3',
  },
  status: {
    RECEIVED: 'On the Pad',
    IN_PROGRESS: 'T-minus & Counting',
    READY: 'Lift-off',
    PICKED_UP: 'In Orbit',
  },
  EmptyDisplay: RocketEmptyDisplay,
  markStyle: 'orbital',
};

export default theme;
