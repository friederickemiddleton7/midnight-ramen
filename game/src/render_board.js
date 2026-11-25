// The order board: up to three tickets drawn as paper cards on a dark wood panel.
// Pure drawing: every string, swatch and bar comes from world.state and ./config.js.
import { BOARD, FONT, INGREDIENTS, PALETTE, RECIPES, TICKET_SLOTS } from './config.js';

const CREAM = '#f5ead9';
const CLIP = '#e6d7bd';
const CARD = { inset: 10, tabW: 64, tabH: 9, nameSize: 17, headY: 20, rowH: 20, rowSize: 12, swatch: 12, barH: 7, barBottom: 22, tagW: 62, tagH: 15 };
const ROWINK = '#5b4c3c';
const PLACE_TEXT = 'rgba(245,234,217,0.45)';
const PLACE_LINE = 'rgba(245,234,217,0.22)';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function patienceColor(p) {
  if (p > 0.5) return PALETTE.good;
  if (p >= 0.25) return PALETTE.warn;
  return PALETTE.bad;
}

function drawTicket(ctx, ticket, slot, index, selected) {
  const { x, y, w, h } = slot;
  const cx = x + w / 2;
  const recipe = RECIPES[ticket.dish] ?? RECIPES[ticket.recipeKey];
  const layers = ticket.layers ?? recipe?.layers ?? [];
  const name = ticket.name ?? recipe?.name ?? 'RAMEN';
  const patience = clamp01(ticket.patience ?? 0);

  ctx.save();
  ctx.translate(cx, y + CARD.inset);
  ctx.rotate((index % 2 === 0 ? 1 : -1) * 0.02);
  ctx.translate(-cx, -(y + CARD.inset));

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = CREAM;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // subtle top clip tab
  ctx.fillStyle = CLIP;
  roundRect(ctx, cx - CARD.tabW / 2, y - CARD.tabH, CARD.tabW, CARD.tabH, 4);
  ctx.fill();

  text(ctx, name, cx, y + CARD.headY, CARD.nameSize, PALETTE.ink);

  let ry = y + CARD.headY + 18;
  for (let i = 0; i < layers.length; i += 1) {
    const ing = INGREDIENTS[layers[i]];
    ctx.fillStyle = ing ? ing.color : '#99a0a6';
    roundRect(ctx, x + CARD.inset, ry - CARD.swatch / 2, CARD.swatch, CARD.swatch, 3);
    ctx.fill();
    text(ctx, ing ? ing.name : layers[i], x + CARD.inset + CARD.swatch + 7, ry, CARD.rowSize, ROWINK, 'left', '600');
    ry += CARD.rowH;
  }

  const barX = x + CARD.inset;
  const barW = w - CARD.inset * 2;
  const barY = y + h - CARD.barBottom;
  ctx.fillStyle = '#d9c9ae';
  roundRect(ctx, barX, barY, barW, CARD.barH, 3);
  ctx.fill();
  if (patience > 0) {
    ctx.fillStyle = patienceColor(patience);
    roundRect(ctx, barX, barY, barW * patience, CARD.barH, 3);
    ctx.fill();
  }

  if (selected) {
    ctx.strokeStyle = PALETTE.amber;
    ctx.lineWidth = 2;
    roundRect(ctx, x - 2, y - 6, w + 4, h + 8, 9);
    ctx.stroke();
    ctx.fillStyle = PALETTE.amber;
    roundRect(ctx, x + w - CARD.tagW - 7, y + 3, CARD.tagW, CARD.tagH, 7);
    ctx.fill();
    text(ctx, 'COOKING', x + w - CARD.tagW / 2 - 7, y + 3 + CARD.tagH / 2, 10, '#2b2033', 'center', '700');
  }
  ctx.restore();
}

/** The order board: a dark wood rail with up to three ticket cards. */
export function drawBoard(ctx, state) {
  ctx.fillStyle = '#2b1c14';
  ctx.fillRect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD.x + 1, BOARD.y + 1, BOARD.w - 2, BOARD.h - 2);

  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  for (let gy = BOARD.y + 12; gy < BOARD.y + BOARD.h - 4; gy += 14) {
    ctx.beginPath();
    ctx.moveTo(BOARD.x + 4, gy);
    ctx.lineTo(BOARD.x + BOARD.w - 4, gy);
    ctx.stroke();
  }

  if (!state) return;
  const tickets = state.tickets ?? [];
  for (let i = 0; i < TICKET_SLOTS.length; i += 1) {
    const slot = TICKET_SLOTS[i];
    if (i < tickets.length && tickets[i]) {
      drawTicket(ctx, tickets[i], slot, i, i === state.selected);
      continue;
    }
    ctx.fillStyle = 'rgba(245,234,217,0.03)';
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
    ctx.fill();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = PLACE_LINE;
    ctx.lineWidth = 1.5;
    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 8);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, '+ new order', slot.x + slot.w / 2, slot.y + slot.h / 2, 13, PLACE_TEXT, 'center', '500');
  }
}