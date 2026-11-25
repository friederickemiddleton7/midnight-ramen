// Deterministic screenshot scenes behind ?shot=<name>&seed=1. Each scene builds a fresh world,
// then places plain state by hand — real recipe and station keys, coherent counters — so a frame
// can be painted without playing. The same name and seed always stage the same scene, which is
// what makes the screenshots repeatable.
//
// Scenes: kitchen (the cover shot: board, mid-assembly bowl, prep stations, serve pass, clock),
// rush (three impatient tickets), serve (the moment right after a plate goes out) and end
// (the shift-over panel).
import { RECIPES, SHIFT_LENGTH } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY } from './render.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';

/** A paper ticket for `recipeKey`; patience is staged as a 0..1 fraction of the bar. */
function makeTicket(id, recipeKey, patience) {
  const recipe = RECIPES[recipeKey];
  return {
    id,
    recipeKey,
    name: recipe.name,
    layers: recipe.layers.slice(),
    points: recipe.points,
    patience,
    patienceMax: 1,
  };
}

/** Put one prep station into the given state; unmentioned stations stay idle. */
function setStation(world, key, { progress = 0, working = false, ready = false } = {}) {
  const station = world.state.stations[key];
  station.progress = progress;
  station.working = working;
  station.ready = ready;
}

/**
 * THE COVER: every element in one frame — kitchen wall, two tickets (SHOYU RAMEN selected),
 * noodles ready at the pot, scallions mid-chop on the board, a bowl part-built (broth + noodles,
 * hint ADD: SCALLION), a hot plated dish at the serve pass and the shift clock at 01:12.
 */
function sceneKitchen(world) {
  const state = world.state;
  state.tickets = [makeTicket(1, 'shoyu', 0.6), makeTicket(2, 'miso', 0.82)];
  state.selected = 0;
  state.bowl = ['broth', 'noodles'];
  setStation(world, 'board', { progress: 0.45, working: true });
  setStation(world, 'pot', { ready: true });
  setStation(world, 'grill');
  state.shiftLeft = 72;
  state.time = SHIFT_LENGTH - 72;
  state.score = 240;
  state.combo = 3;
  state.bestCombo = 3;
  state.served = 2;
  state.adds = 7;
  state.correctAdds = 6;
  state.steam = 1.4; // wisps rising off the hot bowl
  state.serveFlash = 0.45; // modest glow: the plated dish reads as ready to go out
  state.popups = [];
  world.screen = SCREEN_PLAY;
}

/** The rush: three tickets nearly out of patience, a part-built spicy bowl, stations churning. */
function sceneRush(world) {
  const state = world.state;
  state.tickets = [
    makeTicket(1, 'spicy', 0.3),
    makeTicket(2, 'shoyu', 0.24),
    makeTicket(3, 'miso', 0.18),
  ];
  state.selected = 0;
  state.bowl = ['broth', 'noodles', 'chashu'];
  setStation(world, 'board');
  setStation(world, 'pot', { ready: true });
  setStation(world, 'grill', { progress: 0.62, working: true });
  state.shiftLeft = 35;
  state.time = SHIFT_LENGTH - 35;
  state.score = 610;
  state.combo = 5;
  state.bestCombo = 5;
  state.served = 6;
  state.adds = 21;
  state.correctAdds = 19;
  state.steam = 2.2;
  state.serveFlash = 0;
  state.popups = [{ text: '-10 LEFT ANGRY', x: 620, y: 320, life: 0.9, bad: true }];
  world.screen = SCREEN_PLAY;
}

/** Just served: the +PERFECT popup is still floating, a fresh ticket arrived, a new bowl begun. */
function sceneServe(world) {
  const state = world.state;
  state.tickets = [makeTicket(1, 'midnight', 1), makeTicket(2, 'spicy', 0.55)];
  state.selected = 0;
  state.bowl = ['broth', 'noodles'];
  setStation(world, 'board', { progress: 0.25, working: true });
  setStation(world, 'pot');
  setStation(world, 'grill', { ready: true });
  state.shiftLeft = 95;
  state.time = SHIFT_LENGTH - 95;
  state.score = 465;
  state.combo = 2;
  state.bestCombo = 4;
  state.served = 5;
  state.adds = 14;
  state.correctAdds = 13;
  state.steam = 1.1;
  state.serveFlash = 1;
  state.lastServed = { name: 'TONKOTSU RAMEN', points: 45, tip: 0, total: 45 };
  state.popups = [{ text: '+45 PERFECT!', x: 885, y: 396, life: 1, bad: false }];
  world.screen = SCREEN_PLAY;
}

/** Shift over: the books close on a strong run — 11 dishes, best combo x6, 92% accuracy. */
function sceneEnd(world) {
  const state = world.state;
  state.tickets = [];
  state.selected = -1;
  state.bowl = [];
  state.shiftLeft = 0;
  state.time = SHIFT_LENGTH;
  state.score = 1240;
  state.combo = 1;
  state.bestCombo = 6;
  state.served = 11;
  state.adds = 63;
  state.correctAdds = 58;
  state.steam = 0;
  state.serveFlash = 0;
  state.popups = [];
  world.screen = SCREEN_OVER;
}

const SCENES = { kitchen: sceneKitchen, rush: sceneRush, serve: sceneServe, end: sceneEnd };

/**
 * Build the named scene on a fresh seeded world and return the world with its screen set, ready
 * for render(). An unknown name falls back to the kitchen cover shot.
 */
export function stageShot(name, seed) {
  const world = createWorld(createRandom(seed));
  world.reset();
  (SCENES[name] ?? sceneKitchen)(world);
  return world;
}
