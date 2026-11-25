// Input: pointer hit-testing against the drawn widgets and keyboard shortcuts. Clicks are
// one-shot intents carrying the logical position, so x/y = null means "not a positional click"
// (keyboard). Each intent reads once via takeIntents(), so a press between two frames is never
// lost and never counted twice. Handled keys call preventDefault to keep Space from scrolling.

import { INGREDIENT_ORDER } from './config.js';

/** A click's logical position, or null for keyboard intents. */
export function intent(kind, x = null, y = null) {
  return { kind, x, y };
}

export const INTENT_SELECT = 'select';      // index into world.tickets, or -1 for none
export const INTENT_STATION = 'station';    // prep station key
export const INTENT_BIN = 'bin';            // ingredient key
export const INTENT_SERVE = 'serve';
export const INTENT_MUTE = 'mute';

const DIGITS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5 };
const SERVE_KEYS = new Set(['Space', 'Enter']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(target, logicalSize, handlers) {
  const intents = [];
  let muted = false;

  function push(kind, x, y) {
    intents.push(intent(kind, x, y));
    if (intents.length > 16) intents.shift();
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) {
      if (SERVE_KEYS.has(event.code) || MUTE_KEYS.has(event.code) || event.code in DIGITS) event.preventDefault();
      return;
    }
    if (SERVE_KEYS.has(event.code)) {
      event.preventDefault();
      push(INTENT_SERVE);
    } else if (MUTE_KEYS.has(event.code)) {
      event.preventDefault();
      muted = !muted;
      push(INTENT_MUTE);
    } else if (event.code in DIGITS) {
      event.preventDefault();
      const index = DIGITS[event.code];
      const name = INGREDIENT_ORDER[index];
      if (name) push(INTENT_BIN, null, null, { ingredient: name });
    }
  });
  window.addEventListener('blur', () => { muted = false; });

  // Coarse pointer first, then the exact widget, so a click lands on the topmost thing under it.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const scale = logicalSize.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    push(INTENT_SELECT, x, y, handlers ? handlers(x, y) : -1);
  });

  return {
    /** Called each frame by the loop; returns true when anything changed. */
    takeIntents() {
      if (!intents.length) return false;
      const taken = intents;
      intents.length = 0;
      return taken;
    },
    get muted() { return muted; },
  };
}
