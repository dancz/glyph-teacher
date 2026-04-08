// SVG Geometry Constants
export const HEX_PTS = "50,5 95,28 95,72 50,95 5,72 5,28";
export const RT3 = Math.sqrt(3);

export const NODE_POS = [
  [0, -1], [RT3 / 2, -1 / 2], [RT3 / 2, 1 / 2], [0, 1], [-RT3 / 2, 1 / 2], [-RT3 / 2, -1 / 2],
  [RT3 / 4, -1 / 4], [RT3 / 4, 1 / 4], [-RT3 / 4, 1 / 4], [-RT3 / 4, -1 / 4],
  [0, 0]
];

export const HEXAGON_PTS = [
  [0, -1], [RT3 / 2, -1 / 2], [RT3 / 2, 1 / 2], [0, 1], [-RT3 / 2, 1 / 2], [-RT3 / 2, -1 / 2]
].map(p => `${p[0]},${p[1]}`).join(' ');

// Training Screen UI Constants
export const TRAINING_RADIUS = 54;
export const TRAINING_CIRC = 2 * Math.PI * TRAINING_RADIUS;
export const TRAINING_SEG_OFFSET = -Math.PI / 2; // start at top

// GlyphGrid Interaction Constants
export const SNAP_THRESHOLD = 0.15;
export const MINI_NODE_RADIUS = 0.04;
export const STD_NODE_RADIUS = 0.055;

// Game States
export const APP_STATES = {
  IDLE: 'IDLE',
  PREPARE: 'PREPARE',
  DISPLAYING: 'DISPLAYING',
  INPUT: 'INPUT',
  RESULTS: 'RESULTS',
  FEEDBACK: 'FEEDBACK'
} as const;

// Types for State
export type AppState = typeof APP_STATES[keyof typeof APP_STATES];

// Re-export for compatibility
export const TRAINING_STATES = APP_STATES;
export const GAME_STATES = APP_STATES;

// Storage Keys & Core Constants
export const WEEKLY_SCORE_KEY = 'glyph_trainer_weekly_score';
export const SEQ_KEY = 'glyph_trainer_progress';
export const GLYPH_KEY = 'glyph_trainer_glyphs';
export const MODES = ['visual', 'text', 'level'];
export const DEFAULT_RECORD = { weight: 1.0, attempts: 0, correct: 0 };
export const GLYPH_BOOST = 0.5;
