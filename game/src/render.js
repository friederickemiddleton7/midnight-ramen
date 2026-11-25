// Rendering entry point for Midnight Ramen: a thin orchestrator. It paints the night backdrop,
// looks at world.screen and hands the frame to the part renderers — render_hud.js draws the HUD,
// title and game-over panels, render_board.js the order tickets, render_kitchen.js the stations,
// bowl and serve pass, render_pantry.js the ingredient crates. This file holds no drawing of its
// own beyond the backdrop, so every visual lives next to the state it depicts.
import { FIELD, PALETTE } from './config.js';
import { drawBoard } from './render_board.js';
import { drawHud, drawOver, drawTitle } from './render_hud.js';
import { drawKitchen } from './render_kitchen.js';
import { drawPantry } from './render_pantry.js';

// Screen names. world.js flips world.screen between these as the shift starts and ends; the
// values are kept identical on both sides.
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** Shared rounded-rectangle path helper for any renderer that needs a soft-cornered shape. */
export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Paint one frame of `world` onto `ctx`: backdrop first, then the parts for the current screen. */
export function render(ctx, world) {
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const state = world.state;

  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, state);
    return;
  }
  if (world.screen === SCREEN_OVER) {
    drawOver(ctx, state);
    return;
  }

  // Play (and anything unrecognised): the live kitchen scene, layered back to front so the HUD
  // always sits on top of the board, kitchen and pantry.
  drawKitchen(ctx, state, world);
  drawBoard(ctx, state);
  drawPantry(ctx, state);
  drawHud(ctx, state);
}
