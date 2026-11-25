// Pantry drawing: the wooden shelf wall on the right of the kitchen, holding six ingredient
// crates. Names, colours, prep flags and bin rectangles all come from config.js — this file
// only paints. The bin the current ticket needs next gets a teal highlight.

import { BIN_RECTS, FONT, INGREDIENTS, PALETTE, PANTRY } from './config.js';

const SHELF_BOARDS = [314, 568];
const EGG_YOLK = '#efb83c';

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
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

/** One crate: wooden body, tinted front panel, the ingredient's glyph, name and status tag. */
function crate(ctx, rect, meta, needed) {
  const cx = rect.x + rect.w / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, rect.x + 3, rect.y + 5, rect.w, rect.h, 10);
  ctx.fill();

  ctx.fillStyle = PALETTE.wood;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();
  if (needed) {
    ctx.save();
    ctx.shadowColor = 'rgba(63,216,199,0.9)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = PALETTE.teal;
    ctx.lineWidth = 3;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 3;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = meta.color;
  roundRect(ctx, rect.x + 7, rect.y + 7, rect.w - 14, rect.h - 14, 7);
  ctx.fill();
  ctx.restore();

  glyph(ctx, rect.key, cx, rect.y + 62, meta);
  text(ctx, meta.name, cx, rect.y + rect.h - 24, 11, PALETTE.cream);
  tag(ctx, rect, meta);
}

/** Tiny ingredient icons built from primitives, tinted with the ingredient's own colours. */
function glyph(ctx, key, cx, cy, meta) {
  ctx.save();
  if (key === 'broth') {
    ctx.fillStyle = meta.dark;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,234,217,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 4, 5, Math.PI, Math.PI * 1.6);
    ctx.stroke();
  } else if (key === 'noodles') {
    ctx.strokeStyle = meta.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const y = cy - 12 + i * 11;
      ctx.beginPath();
      ctx.moveTo(cx - 18, y);
      ctx.quadraticCurveTo(cx - 7, y - 8, cx + 1, y);
      ctx.quadraticCurveTo(cx + 10, y + 7, cx + 18, y - 2);
      ctx.stroke();
    }
  } else if (key === 'chashu') {
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = meta.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,234,217,0.85)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.dark;
    ctx.beginPath();
    ctx.arc(cx + 7, cy + 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'egg') {
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = meta.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = EGG_YOLK;
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (key === 'scallion') {
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + i * 9 - 2, cy + 16);
      ctx.lineTo(cx + i * 9, cy - 14);
      ctx.stroke();
      ctx.strokeStyle = meta.dark;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + i * 9, cy - 14);
      ctx.lineTo(cx + i * 9 + i, cy - 20);
      ctx.stroke();
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(cx + i * 9 - 3, cy + 12, 6, 8);
    }
  } else {
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = meta.dark;
    ctx.lineWidth = 2;
    roundRect(ctx, cx - 16, cy - 20, 32, 40, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,234,217,0.14)';
    ctx.fillRect(cx - 10, cy - 14, 5, 5);
    ctx.fillRect(cx + 3, cy - 2, 5, 5);
    ctx.fillRect(cx - 8, cy + 8, 5, 5);
  }
  ctx.restore();
}

/** A tiny padlock plus the PREP tag for ingredients that need a station first. */
function tag(ctx, rect, meta) {
  const w = 60;
  const h = 17;
  const x = rect.x + rect.w - w - 6;
  const y = rect.y + 7;
  const prep = Boolean(meta.prep);
  ctx.fillStyle = prep ? 'rgba(63,216,199,0.16)' : 'rgba(99,212,113,0.14)';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = prep ? PALETTE.teal : PALETTE.good;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (prep) {
    const lx = x + 12;
    const ly = y + 9;
    ctx.strokeStyle = PALETTE.teal;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(lx, ly - 1.5, 3, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = PALETTE.teal;
    ctx.fillRect(lx - 4, ly - 1.5, 8, 6);
    text(ctx, 'PREP', x + 20, y + h / 2 + 0.5, 9, PALETTE.teal, 'left');
  } else {
    text(ctx, 'READY', x + w / 2, y + h / 2 + 0.5, 9, PALETTE.good);
  }
}

/** The whole pantry wall: cork backdrop, plank seams, two shelf boards and the six crates. */
export function drawPantry(ctx, state) {
  ctx.fillStyle = PALETTE.cork;
  ctx.fillRect(PANTRY.x, PANTRY.y, PANTRY.w, PANTRY.h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = PANTRY.x + 46; x < PANTRY.x + PANTRY.w; x += 46) {
    ctx.fillRect(x - 1, PANTRY.y, 2, PANTRY.h);
  }

  text(ctx, 'PANTRY', PANTRY.x + PANTRY.w / 2, 112, 15, PALETTE.cream);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(PANTRY.x + PANTRY.w / 2 - 22, 122, 44, 2);

  for (const y of SHELF_BOARDS) {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(PANTRY.x + 8, y, PANTRY.w - 16, 12);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(PANTRY.x + 8, y, PANTRY.w - 16, 2);
  }

  const ticket = state && state.tickets ? state.tickets[state.selected] : null;
  const needed = ticket && state.bowl ? ticket.layers[state.bowl.length] : null;
  for (const rect of BIN_RECTS) {
    crate(ctx, rect, INGREDIENTS[rect.key], rect.key === needed);
  }
}
