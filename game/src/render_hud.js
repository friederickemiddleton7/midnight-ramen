// HUD, title and game-over drawing for Midnight Ramen. Plain canvas primitives and the shared
// system font: no images, no network. Everything shown is read from world.state, so these
// functions stay stateless and cheap enough to call every frame.

import { BEST_KEY, FIELD, FONT, HUD, PALETTE, SHIFT_LENGTH } from './config.js';

const CLOCK_BAR = { x: 512, y: 56, w: 256, h: 8 };
const FLASH = { x: 640, y: 73 };

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function glowText(ctx, str, x, y, size, color, glow, align = 'center') {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  text(ctx, str, x, y, size, color, align);
  text(ctx, str, x, y, size, color, align);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function clockLabel(secondsLeft) {
  const total = Math.max(0, Math.ceil(secondsLeft));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function bestScore() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** A hanging paper lantern: glowing red body, dark caps, a tassel. */
function lantern(ctx, x, y, t) {
  const sway = Math.sin(t * 1.3) * 5;
  ctx.save();
  ctx.translate(x + sway, y);
  ctx.shadowColor = 'rgba(217,69,95,0.8)';
  ctx.shadowBlur = 26;
  ctx.fillStyle = PALETTE.noren;
  roundRect(ctx, -24, -30, 48, 60, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let i = -16; i <= 16; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, -28);
    ctx.quadraticCurveTo(i * 1.3, 0, i, 28);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(-14, -36, 28, 7);
  ctx.fillRect(-14, 29, 28, 7);
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(0, 50);
  ctx.stroke();
  ctx.restore();
}

/** The top bar: wordmark, draining shift clock, score and combo, plus event flashes. */
export function drawHud(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(HUD.x, HUD.y, HUD.w, HUD.h);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(HUD.x, HUD.y + HUD.h - 3, HUD.w, 3);

  glowText(ctx, 'MIDNIGHT RAMEN', 24, HUD.h / 2, 24, PALETTE.amber, 'rgba(255,179,71,0.55)', 'left');

  const urgent = state.shiftLeft <= 15;
  text(ctx, clockLabel(state.shiftLeft), 640, 30, 30, urgent ? PALETTE.bad : PALETTE.cream);
  ctx.fillStyle = PALETTE.nightHi;
  ctx.fillRect(CLOCK_BAR.x, CLOCK_BAR.y, CLOCK_BAR.w, CLOCK_BAR.h);
  const left = Math.max(0, Math.min(1, state.shiftLeft / SHIFT_LENGTH));
  ctx.fillStyle = left > 0.5 ? PALETTE.good : left > 0.22 ? PALETTE.warn : PALETTE.bad;
  ctx.fillRect(CLOCK_BAR.x, CLOCK_BAR.y, CLOCK_BAR.w * left, CLOCK_BAR.h);

  text(ctx, `SCORE ${state.score}`, HUD.w - 24, 28, 22, PALETTE.cream, 'right');
  text(ctx, `COMBO x${state.combo}`, HUD.w - 24, 58, 17, state.combo > 1 ? PALETTE.teal : PALETTE.muted, 'right');

  if (state.lockout > 0) {
    glowText(ctx, 'WRONG', FLASH.x, FLASH.y, 14, PALETTE.bad, 'rgba(229,83,75,0.8)');
  } else if (state.serveFlash > 0) {
    glowText(ctx, 'SERVED!', FLASH.x, FLASH.y, 14, PALETTE.teal, 'rgba(63,216,199,0.8)');
  }
}

/** Title screen: night backdrop, two swaying lanterns, wordmark and a pulsing start prompt. */
export function drawTitle(ctx, state) {
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const t = now() / 1000;
  lantern(ctx, 420, 168, t);
  lantern(ctx, 860, 168, t + 1.7);

  glowText(ctx, 'MIDNIGHT RAMEN', 640, 316, 76, PALETTE.amber, 'rgba(255,179,71,0.5)');
  text(ctx, 'run the ramen bar before the shift ends', 640, 386, 20, PALETTE.muted, 'center', '500');
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(520, 420, 240, 2);

  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 3);
  glowText(ctx, 'click to start', 640, 520, 24, PALETTE.teal, 'rgba(63,216,199,0.6)');
  ctx.restore();
}

/** Shift-over panel: final score, the run's stats and a play-again pill. */
export function drawOver(ctx, state) {
  ctx.fillStyle = PALETTE.nightDeep;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 360, 96, 560, 524, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();

  glowText(ctx, 'SHIFT OVER', 640, 160, 38, PALETTE.amber, 'rgba(255,179,71,0.45)');
  text(ctx, 'FINAL SCORE', 640, 214, 15, PALETTE.muted, 'center', '600');
  glowText(ctx, String(state.score), 640, 266, 64, PALETTE.cream, 'rgba(245,234,217,0.35)');

  const accuracy = state.adds > 0 ? `${Math.round((100 * state.correctAdds) / state.adds)}%` : '—';
  const rows = [
    ['DISHES SERVED', String(state.served)],
    ['BEST COMBO', `x${state.bestCombo}`],
    ['ACCURACY', accuracy],
    ['BEST SCORE', String(Math.max(bestScore(), state.score))],
  ];
  rows.forEach(([label, value], i) => {
    const y = 336 + i * 32;
    text(ctx, label, 432, y, 16, PALETTE.muted, 'left', '600');
    text(ctx, value, 848, y, 16, PALETTE.cream, 'right');
  });

  ctx.fillStyle = 'rgba(63,216,199,0.12)';
  ctx.strokeStyle = PALETTE.teal;
  roundRect(ctx, 516, 528, 248, 56, 28);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'PLAY AGAIN', 640, 556, 21, PALETTE.teal);
}
