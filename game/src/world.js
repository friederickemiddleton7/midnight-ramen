// The simulation: tickets, the one assembly bowl, the three prep stations, the shift clock,
// scoring, combo and accuracy. Rendering and input never touch this state directly — they call
// the methods here. step() advances the world one fixed step and returns a bitmask of events
// (ORDER_IN, SERVED, LEFT_ANGRY, SHIFT_OVER, ...) so the caller can drive sound and popups.

import {
  ANGRY_PENALTY, COMBO_START, INGREDIENT_ORDER, PATIENCE_EARLY, PATIENCE_LATE, RECIPES,
  RECIPE_WEIGHTS, SHIFT_LENGTH, SPAWN_EARLY, SPAWN_LATE, STATION_ORDER, TIP_SHARE,
  WRONG_LOCKOUT,
} from './config.js';

export const EVENT_ORDER_IN = 1;
export const EVENT_ADDED = 2;
export const EVENT_WRONG = 4;
export const EVENT_SERVED = 8;
export const EVENT_LEFT_ANGRY = 16;
export const EVENT_PREP_DONE = 32;
export const EVENT_SHIFT_OVER = 64;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const PREP_TIMES = { board: 2.5, pot: 4.0, grill: 3.5 };
const STATION_INGREDIENT = { board: 'scallion', pot: 'noodles', grill: 'chashu' };
const MAX_BOWL = 6;

/** Patience at this fraction of the shift: about 40 s early in the shift, 22 s late. */
function patienceFor(progress) {
  return PATIENCE_EARLY + (PATIENCE_LATE - PATIENCE_EARLY) * progress;
}

/** Seconds between order arrivals at this fraction of the shift: about 12 s early, 6 s late. */
function spawnIntervalFor(progress) {
  return SPAWN_EARLY + (SPAWN_LATE - SPAWN_EARLY) * progress;
}

export function createWorld(random) {
  const stations = {};
  for (const key of STATION_ORDER) stations[key] = { key, progress: 0, working: false, ready: false };

  const world = {
    random,
    screen: SCREEN_TITLE,
    state: null,
  };

  function reset() {
    world.state = {
      time: 0,
      shiftLeft: SHIFT_LENGTH,
      score: 0,
      combo: COMBO_START,
      bestCombo: COMBO_START,
      served: 0,
      adds: 0,
      correctAdds: 0,
      tickets: [],
      nextTicketId: 1,
      bowl: [],
      selected: -1,
      lockout: 0,
      wrongShake: 0,
      spawnTimer: 1.5,
      stations,
      popups: [],
      steam: 0,
      serveFlash: 0,
      lastServed: null,
    };
    for (const key of STATION_ORDER) {
      stations[key].progress = 0;
      stations[key].working = false;
      stations[key].ready = false;
    }
    spawnOpeningTickets();
  }

  function pickRecipe() {
    const state = world.state;
    const progress = 1 - state.shiftLeft / SHIFT_LENGTH;
    const pool = [];
    for (const [key, recipe] of Object.entries(RECIPES)) {
      if (progress >= recipe.unlock) for (let i = 0; i < RECIPE_WEIGHTS[key]; i += 1) pool.push(key);
    }
    return pool[Math.floor(random() * pool.length)] ?? 'shoyu';
  }

  function makeTicket() {
    const state = world.state;
    const progress = 1 - state.shiftLeft / SHIFT_LENGTH;
    const recipeKey = pickRecipe();
    const recipe = RECIPES[recipeKey];
    return {
      id: state.nextTicketId++,
      recipeKey,
      name: recipe.name,
      layers: recipe.layers.slice(),
      points: recipe.points,
      patience: patienceFor(progress),
      patienceMax: patienceFor(progress),
    };
  }

  function spawnTicket(initial = false) {
    const state = world.state;
    if (state.tickets.length >= 3) return;
    const ticket = makeTicket();
    if (initial) {
      // Opening tickets start with some patience already burned, so the board looks lived-in.
      ticket.patience *= 0.72 + 0.24 * random();
      ticket.patienceMax = Math.max(ticket.patienceMax, ticket.patience);
    }
    state.tickets.push(ticket);
    if (state.selected < 0) state.selected = 0;
  }

  function spawnOpeningTickets() {
    const state = world.state;
    spawnTicket(true);
    spawnTicket(true);
    state.spawnTimer = 3 + random() * 3;
  }

  /** Advance the whole simulation one fixed step. `intents` comes from input.js. */
  function step(dt, intents) {
    const state = world.state;
    if (!state || world.screen !== SCREEN_PLAY) return 0;
    let events = 0;

    state.time += dt;
    state.shiftLeft = Math.max(0, state.shiftLeft - dt);
    state.lockout = Math.max(0, state.lockout - dt);
    state.wrongShake = Math.max(0, state.wrongShake - dt);
    state.serveFlash = Math.max(0, state.serveFlash - dt);
    state.steam += dt;

    for (const key of STATION_ORDER) {
      const station = stations[key];
      if (station.working) {
        station.progress += dt / PREP_TIMES[key];
        if (station.progress >= 1) {
          station.progress = 1;
          station.working = false;
          station.ready = true;
          events |= EVENT_PREP_DONE;
        }
      }
    }

    // Orders arrive on a timer that speeds up as the shift progresses.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.tickets.length < 3 && state.shiftLeft > 2) {
      spawnTicket();
      events |= EVENT_ORDER_IN;
      const progress = 1 - state.shiftLeft / SHIFT_LENGTH;
      state.spawnTimer = spawnIntervalFor(progress) * (0.8 + 0.4 * random());
    }

    // Patience drains; an empty ticket leaves angrily, resetting the combo.
    for (let i = state.tickets.length - 1; i >= 0; i -= 1) {
      const ticket = state.tickets[i];
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        state.tickets.splice(i, 1);
        state.score = Math.max(0, state.score - ANGRY_PENALTY);
        state.combo = COMBO_START;
        events |= EVENT_LEFT_ANGRY;
        state.popups.push({ text: `-${ANGRY_PENALTY} LEFT ANGRY`, x: 620, y: 320, life: 1.6, bad: true });
        if (state.selected >= state.tickets.length) state.selected = state.tickets.length - 1;
      }
    }

    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popup = state.popups[i];
      popup.life -= dt;
      popup.y -= dt * 34;
      if (popup.life <= 0) state.popups.splice(i, 1);
    }

    if (intents.serve) events |= serve();
    if (intents.ingredient) events |= tryAdd(intents.ingredient);

    if (state.shiftLeft <= 0) {
      world.screen = SCREEN_OVER;
      events |= EVENT_SHIFT_OVER;
    }
    return events;
  }

  function startPrep(stationKey) {
    const state = world.state;
    if (world.screen !== SCREEN_PLAY || !state || state.lockout > 0) return 0;
    const station = stations[stationKey];
    if (!station || station.working || station.ready) return 0;
    station.working = true;
    station.progress = 0;
    return 1;
  }

  /** Add an ingredient to the bowl; a wrong add buzzes, shakes and locks the bowl for a moment. */
  function tryAdd(ingredient) {
    const state = world.state;
    if (world.screen !== SCREEN_PLAY || !ingredient) return 0;
    if (state.lockout > 0 || !state.tickets.length) return 0;
    if (state.bowl.length >= MAX_BOWL) return 0;
    if (INGREDIENT_ORDER.indexOf(ingredient) < 0) return 0;
    state.adds += 1;
    const ticket = state.tickets[state.selected];
    if (!ticket || ticket.layers[state.bowl.length] !== ingredient) {
      state.lockout = WRONG_LOCKOUT;
      state.wrongShake = WRONG_LOCKOUT;
      state.combo = COMBO_START;
      return EVENT_WRONG;
    }
    const stationKey = ingredient === 'scallion' ? 'board' : ingredient === 'noodles' ? 'pot' : ingredient === 'chashu' ? 'grill' : null;
    if (stationKey && !stations[stationKey].ready) {
      // The pantry points here, but that item has not been prepped yet: a soft wrong add.
      state.lockout = WRONG_LOCKOUT;
      state.wrongShake = WRONG_LOCKOUT;
      return EVENT_WRONG;
    }
    if (stationKey) {
      stations[stationKey].ready = false;
      stations[stationKey].progress = 0;
    }
    state.bowl.push(ingredient);
    state.correctAdds += 1;
    return EVENT_ADDED;
  }

  /** Serve the bowl when it exactly matches the selected ticket; scores value plus a combo tip. */
  function serve() {
    const state = world.state;
    if (world.screen !== SCREEN_PLAY) return 0;
    const ticket = state.tickets[state.selected];
    if (!ticket || state.bowl.length !== ticket.layers.length) return 0;
    for (let i = 0; i < ticket.layers.length; i += 1) {
      if (state.bowl[i] !== ticket.layers[i]) return 0;
    }
    const tip = Math.round(ticket.points * TIP_SHARE * (ticket.patience / ticket.patienceMax)) * state.combo;
    const total = ticket.points + tip;
    state.score += total;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.lastServed = { name: ticket.name, points: ticket.points, tip, total };
    state.popups.push({ text: `+${total} PERFECT!`, x: 885, y: 396, life: 1.8, bad: false });
    state.tickets.splice(state.selected, 1);
    state.selected = state.tickets.length ? Math.min(state.selected, state.tickets.length - 1) : -1;
    state.bowl = [];
    state.serveFlash = 0.6;
    return EVENT_SERVED;
  }

  function selectTicket(index) {
    const state = world.state;
    if (world.screen !== SCREEN_PLAY) return 0;
    if (index < 0 || index >= state.tickets.length) return 0;
    state.selected = index;
    return 1;
  }

  function isBowlComplete() {
    const state = world.state;
    const ticket = state.tickets[state.selected];
    if (!ticket || state.bowl.length !== ticket.layers.length) return false;
    for (let i = 0; i < ticket.layers.length; i += 1) {
      if (state.bowl[i] !== ticket.layers[i]) return false;
    }
    return true;
  }

  /** The next ingredient the selected ticket needs, or null when the bowl is done or there is no ticket. */
  function nextNeeded() {
    const state = world.state;
    const ticket = state.tickets[state.selected];
    if (!ticket) return null;
    return ticket.layers[state.bowl.length] ?? null;
  }

  world.reset = reset;
  world.step = step;
  world.tryAdd = tryAdd;
  world.startPrep = startPrep;
  world.serve = serve;
  world.selectTicket = selectTicket;
  world.isBowlComplete = isBowlComplete;
  world.nextNeeded = nextNeeded;
  world.stationIngredient = (key) => STATION_INGREDIENT[key];

  reset();
  world.screen = SCREEN_TITLE;
  return world;
}
