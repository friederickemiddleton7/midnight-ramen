// Every tuning number, colour and layout rectangle in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on the
// screen size. Ingredients and recipes are data, not code: the world reads them, the renderer
// draws them, and INGREDIENT_ORDER is also the 1..6 keyboard order.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this many seconds, then the books close. */
export const SHIFT_LENGTH = 150;

/** Ticket patience shrinks from `early` seconds at shift start to `late` at its end. */
export const PATIENCE_EARLY = 40;
export const PATIENCE_LATE = 22;

/** Orders arrive about every `early` seconds early in the shift, `late` seconds late. */
export const SPAWN_EARLY = 12;
export const SPAWN_LATE = 6;

export const ANGRY_PENALTY = 10;
/** Seconds the bowl refuses input after a wrong add. */
export const WRONG_LOCKOUT = 2;
/** A serve's time tip: this share of the dish value, scaled by remaining patience, times combo. */
export const TIP_SHARE = 0.4;
export const COMBO_START = 1;

export const INGREDIENTS = {
  broth: { name: 'BROTH', prep: null, prepTime: 0, color: '#e08a3c', dark: '#8a4d1c' },
  noodles: { name: 'NOODLES', prep: 'pot', prepTime: 4.0, color: '#f2e2ae', dark: '#b09a55' },
  chashu: { name: 'CHASHU', prep: 'grill', prepTime: 3.5, color: '#d99a78', dark: '#8f5a3c' },
  egg: { name: 'EGG', prep: null, prepTime: 0, color: '#f8f2e2', dark: '#cfc4a0' },
  scallion: { name: 'SCALLION', prep: 'board', prepTime: 2.5, color: '#7ec96a', dark: '#3f7d3a' },
  nori: { name: 'NORI', prep: null, prepTime: 0, color: '#33513f', dark: '#1d3327' },
};

/** Pantry order, top shelf left to right then bottom shelf — also the digits 1..6. */
export const INGREDIENT_ORDER = ['broth', 'noodles', 'chashu', 'egg', 'scallion', 'nori'];

export const RECIPES = {
  shoyu: { name: 'SHOYU RAMEN', layers: ['broth', 'noodles', 'scallion', 'nori'], points: 30, unlock: 0 },
  miso: { name: 'MISO RAMEN', layers: ['broth', 'noodles', 'egg', 'scallion'], points: 30, unlock: 0 },
  spicy: { name: 'SPICY RAMEN', layers: ['broth', 'noodles', 'chashu', 'nori'], points: 35, unlock: 0.18 },
  tonkotsu: { name: 'TONKOTSU RAMEN', layers: ['broth', 'noodles', 'chashu', 'egg', 'scallion'], points: 45, unlock: 0.42 },
  midnight: { name: 'MIDNIGHT SPECIAL', layers: ['broth', 'noodles', 'chashu', 'egg', 'nori'], points: 50, unlock: 0.62 },
};

/** Relative draw weight of each recipe once the shift has progressed past its `unlock` point. */
export const RECIPE_WEIGHTS = { shoyu: 3, miso: 3, spicy: 3, tonkotsu: 2, midnight: 2 };

export const STATIONS = {
  board: { key: 'board', label: 'CUTTING BOARD', verb: 'CHOP', ingredient: 'scallion', time: 2.5 },
  pot: { key: 'pot', label: 'STOVE POT', verb: 'BOIL', ingredient: 'noodles', time: 4.0 },
  grill: { key: 'grill', label: 'GRILL', verb: 'SEAR', ingredient: 'chashu', time: 3.5 },
};
export const STATION_ORDER = ['board', 'pot', 'grill'];

// ---- Layout, in logical pixels (x grows right, y grows down) -------------------------------

export const HUD = { x: 0, y: 0, w: 1280, h: 84 };
export const BOARD = { x: 0, y: 84, w: 300, h: 636 };
export const TICKET_SLOTS = [0, 1, 2].map((i) => ({ x: 18, y: 106 + i * 202, w: 264, h: 186 }));
export const KITCHEN = { x: 300, y: 84, w: 650, h: 636 };
export const STATION_RECTS = {
  board: { x: 310, y: 104, w: 202, h: 158 },
  pot: { x: 524, y: 104, w: 202, h: 158 },
  grill: { x: 738, y: 104, w: 202, h: 158 },
};
export const BOWL = { x: 620, y: 452, rx: 150, ry: 96 };
export const COUNTER = { x: 300, y: 560, w: 650, h: 160 };
export const SERVE = { x: 820, y: 300, w: 130, h: 240 };
export const PANTRY = { x: 950, y: 84, w: 330, h: 636 };
export const BIN_RECTS = [
  { key: 'broth', x: 962, y: 148, w: 98, h: 152 },
  { key: 'noodles', x: 1066, y: 148, w: 98, h: 152 },
  { key: 'chashu', x: 1170, y: 148, w: 98, h: 152 },
  { key: 'egg', x: 962, y: 402, w: 98, h: 152 },
  { key: 'scallion', x: 1066, y: 402, w: 98, h: 152 },
  { key: 'nori', x: 1170, y: 402, w: 98, h: 152 },
];

export const PALETTE = {
  night: '#14101f',
  nightDeep: '#0b0814',
  nightHi: '#1d1731',
  panel: '#241d33',
  panelEdge: '#3a2f52',
  amber: '#ffb347',
  teal: '#3fd8c7',
  noren: '#d9455f',
  cream: '#f5ead9',
  wood: '#7a5233',
  woodDark: '#5b3c24',
  woodLight: '#93683f',
  cork: '#3c2b23',
  ink: '#2b2033',
  paper: '#f5ead9',
  good: '#63d471',
  warn: '#ffb347',
  bad: '#e5534b',
  muted: '#8f85a8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-ramen.best';

/** Centre of a layout rectangle — used for popups and click anchors. */
export const centerOf = (rect) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
