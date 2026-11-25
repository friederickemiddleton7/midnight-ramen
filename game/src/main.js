// Boot and the one loop for Midnight Ramen: a window-sized canvas carries the fixed 1280x720
// logical field, letterboxed and scaled through ctx.setTransform (pointer coordinates are mapped
// back in for hit tests). The world advances in fixed 1/60 s steps — several in a slow frame, none
// in a fast one. Input is wired directly here rather than via input.js, whose click mapping assumes
// the flat field and whose key intents carry no ingredient.
//
// ?seed=N fixes the order pattern (the default is fixed too). ?shot=<name>&seed=N stages a
// deterministic scene instead of booting the loop: one frame is painted for capture, then stop.
import {
  BEST_KEY, BIN_RECTS, FIELD, INGREDIENT_ORDER, PALETTE, SERVE, STEP, STATION_ORDER,
  STATION_RECTS, TICKET_SLOTS,
} from './config.js';
import {
  createWorld, EVENT_ADDED, EVENT_LEFT_ANGRY, EVENT_ORDER_IN, EVENT_PREP_DONE, EVENT_SERVED,
  EVENT_SHIFT_OVER, EVENT_WRONG, SCREEN_PLAY,
} from './world.js';
import { createRandom } from './random.js';
import { render } from './render.js';
import { stageShot } from './scenes.js';
import { isMuted, setMuted, sfx, unlockAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** The seed when the URL names none: fixed, so the default shift repeats exactly. */
const DEFAULT_SEED = 1;
/** The sound each prep station makes while it works. */
const STATION_SFX = { board: 'chop', pot: 'bubble', grill: 'sizzle' };
/** Input reaches the world through its methods, so the fixed steps carry no intents of their own. */
const NO_INTENTS = { serve: false, ingredient: null };

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

// The canvas: the page's #game when the document has one, else a new one created and appended.
const canvas = document.getElementById('game') ?? (() => {
  const made = document.createElement('canvas');
  made.id = 'game';
  document.body.appendChild(made);
  return made;
})();
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const world = createWorld(createRandom(seed));
let best = readBest();
let accumulator = 0;
let viewScale = 1;
let viewOx = 0;
let viewOy = 0;

/** Fit the canvas to the window and recompute the letterbox transform's scale and offset. */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(1, window.innerWidth);
  const cssHeight = Math.max(1, window.innerHeight);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  viewScale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  viewOx = (canvas.width - FIELD.width * viewScale) / 2;
  viewOy = (canvas.height - FIELD.height * viewScale) / 2;
}

/** A click's page coordinates to the logical field's 0..1280 x 0..720, letterbox undone. */
function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
  const ox = (rect.width - FIELD.width * scale) / 2;
  const oy = (rect.height - FIELD.height * scale) / 2;
  return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
}

const hits = (x, y, rect) => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;

/** Paint one frame: fill the letterbox bars, then the field through the letterbox transform. */
function draw(target = world) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.nightDeep;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(viewScale, 0, 0, viewScale, viewOx, viewOy);
  render(ctx, target);
}

// ---- best score (this browser only; storage may be off) ---------------------------------------

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private-mode and friends: the best score then lasts this visit only.
  }
}

/** Screen readers (and anyone watching the page's text) hear the screen changes. */
function announce(message) {
  if (status) status.textContent = message;
}

// ---- screen flow ------------------------------------------------------------------------------

function startShift() {
  world.reset();
  world.screen = SCREEN_PLAY;
  accumulator = 0;
  unlockAudio();
  announce('Shift started. Read the tickets and layer each bowl in order.');
}

function endShift() {
  if (world.state.score > best) {
    best = world.state.score;
    saveBest(best);
  }
  announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
}

// ---- input, straight to the world's methods ---------------------------------------------------

function addIngredient(key) {
  const events = world.tryAdd(key);
  if (events & (EVENT_ADDED | EVENT_WRONG)) sfx(events & EVENT_WRONG ? 'error' : 'pop');
}

function serveBowl() {
  if (world.serve() & EVENT_SERVED) sfx('bell');
}

/** A pointer click in logical coordinates: tickets, then stations, pantry bins, the serve pass. */
function handleClick(x, y) {
  if (world.screen !== SCREEN_PLAY) return startShift(); // title/over: a click starts or restarts
  for (let i = 0; i < TICKET_SLOTS.length; i += 1) {
    if (hits(x, y, TICKET_SLOTS[i])) {
      if (world.selectTicket(i)) sfx('order');
      return;
    }
  }
  for (const key of STATION_ORDER) {
    if (hits(x, y, STATION_RECTS[key])) {
      if (world.startPrep(key)) sfx(STATION_SFX[key]);
      return;
    }
  }
  for (const bin of BIN_RECTS) {
    if (hits(x, y, bin)) return addIngredient(bin.key);
  }
  if (hits(x, y, SERVE)) serveBowl();
}

canvas.addEventListener('pointerdown', (event) => {
  unlockAudio();
  const point = toLogical(event.clientX, event.clientY);
  handleClick(point.x, point.y);
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    unlockAudio();
    if (world.screen === SCREEN_PLAY) serveBowl();
    else startShift();
  } else if (event.code === 'KeyM') {
    event.preventDefault();
    setMuted(!isMuted());
  } else if (/^(?:Digit|Numpad)[1-6]$/.test(event.code)) {
    event.preventDefault();
    addIngredient(INGREDIENT_ORDER[Number(event.code.slice(-1)) - 1]);
  }
});

// ---- the fixed-step loop ----------------------------------------------------------------------

let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  while (accumulator >= STEP && world.screen === SCREEN_PLAY) {
    accumulator -= STEP;
    const events = world.step(STEP, NO_INTENTS);
    if (events & EVENT_ORDER_IN) sfx('order');
    if (events & EVENT_PREP_DONE) sfx('prep');
    if (events & (EVENT_LEFT_ANGRY | EVENT_SHIFT_OVER)) sfx(events & EVENT_SHIFT_OVER ? 'over' : 'angry');
    if (events & EVENT_SHIFT_OVER) endShift();
  }
  if (world.screen !== SCREEN_PLAY) accumulator = 0;
  draw();
}

window.addEventListener('resize', resize);
resize();

if (shot) {
  // A capture run: stage the named scene on a fresh seeded world, paint the one frame, stop.
  draw(stageShot(shot, seed));
  window.__shotReady = true;
} else {
  announce('Midnight Ramen. Click or press Space to start the shift.');
  requestAnimationFrame(frame);
}
