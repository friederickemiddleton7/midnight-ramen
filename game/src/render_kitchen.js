// The kitchen: wall + noren + lanterns, three prep stations, the ramen bowl layered with the
// order's ingredients, the serve pass and the wooden counter front. drawKitchen(ctx, state,
// world) reads station objects and the bowl mix from world.state and asks world for the next
// needed ingredient; only ./config.js is imported.
import { BOWL, COUNTER, FONT, INGREDIENTS, KITCHEN, PALETTE, SERVE, STATION_ORDER, STATION_RECTS, STATIONS } from './config.js';

const WALL = '#1b1526', WOODDARK = '#5b3c24', WOODLIGHT = '#93683f', READY = PALETTE.teal;
const STEAM = 0.18, BROTH = '#e08a3c', NOODLE = '#f2e2ae', CHASHU = '#d99a78', EGG = '#f8f2e2', YOLK = '#f2c14e', SCALLION = '#7ec96a', NORI = '#33513f';
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius); ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius); ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(str, x, y);
}
function wisp(ctx, x, y0, h, alpha) {
  if (alpha <= 0.01) return;
  ctx.fillStyle = `rgba(245,234,217,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x - 5, y0);
  ctx.quadraticCurveTo(x + 7, y0 - h * 0.55, x - 2, y0 - h);
  ctx.quadraticCurveTo(x - 9, y0 - h * 0.55, x - 5, y0);
  ctx.closePath();
  ctx.fill();
}
function lantern(ctx, x, y) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 44);
  glow.addColorStop(0, 'rgba(255,179,71,0.30)'); glow.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.noren; roundRect(ctx, x - 14, y - 26, 28, 52, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.5;
  for (let i = -12; i <= 12; i += 6) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 24);
    ctx.quadraticCurveTo(x + i * 1.4, y, x + i, y + 24);
    ctx.stroke();
  }
  ctx.fillStyle = WOODDARK; ctx.fillRect(x - 12, y - 32, 24, 6); ctx.fillRect(x - 12, y + 26, 24, 6);
  ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 32); ctx.lineTo(x, y + 44); ctx.stroke();
}
/** Small pictogram per station: board+knife, pot+lid+steam, grill bars+flame. */
function stationIcon(ctx, key, x, y, bright) {
  const light = bright ? WOODLIGHT : '#6e4b2c', steel = bright ? '#d8dee5' : '#8d99a6';
  if (key === 'board') {
    ctx.fillStyle = light; ctx.fillRect(x - 60, y + 2, 120, 14);
    ctx.fillStyle = steel; ctx.beginPath();
    ctx.moveTo(x - 44, y - 16); ctx.lineTo(x + 16, y - 16); ctx.lineTo(x + 16, y - 2); ctx.lineTo(x - 44, y - 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = WOODDARK; ctx.fillRect(x + 16, y - 14, 16, 10);
  } else if (key === 'pot') {
    ctx.fillStyle = steel; roundRect(ctx, x - 44, y - 12, 88, 40, 12); ctx.fill();
    ctx.fillStyle = bright ? PALETTE.amber : '#7a5233'; roundRect(ctx, x - 50, y - 20, 100, 14, 6); ctx.fill();
    ctx.fillStyle = WOODDARK; ctx.fillRect(x - 60, y + 4, 14, 6); ctx.fillRect(x + 46, y + 4, 14, 6);
    wisp(ctx, x - 20, y - 24, 30, STEAM); wisp(ctx, x + 4, y - 24, 34, STEAM * 0.8); wisp(ctx, x + 26, y - 24, 26, STEAM * 0.6);
  } else {
    ctx.strokeStyle = steel; ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 54, y + i * 12 - 4); ctx.lineTo(x + 54, y + i * 12 - 4);
      ctx.stroke();
    }
    const flame = ctx.createRadialGradient(x, y + 6, 2, x, y + 6, 26);
    flame.addColorStop(0, bright ? 'rgba(255,179,71,0.85)' : 'rgba(255,179,71,0.25)');
    flame.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = flame; ctx.beginPath(); ctx.arc(x, y + 6, 26, 0, Math.PI * 2); ctx.fill();
  }
}
/** One prep station: counter block, small-caps label, icon, IDLE/WORKING/READY state. */
function drawStation(ctx, key, state) {
  const rect = STATION_RECTS[key], station = STATIONS[key];
  const info = (state && state.stations && state.stations[key]) || { progress: 0, working: false, ready: false };
  const bright = info.ready || info.working, cx = rect.x + rect.w / 2;
  ctx.fillStyle = bright ? WOODLIGHT : '#6b4526'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = WOODDARK; ctx.fillRect(rect.x, rect.y + rect.h - 22, rect.w, 22);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  text(ctx, station.label, cx, rect.y + 14, 12, PALETTE.cream);
  if (info.ready) {
    const ing = INGREDIENTS[station.ingredient];
    ctx.fillStyle = ing ? ing.color : '#ddd'; roundRect(ctx, cx - 20, rect.y + 44, 40, 14, 5); ctx.fill();
    ctx.fillStyle = READY; roundRect(ctx, rect.x + 14, rect.y + 72, rect.w - 28, 22, 11); ctx.fill();
    text(ctx, 'READY', cx, rect.y + 83, 12, '#0d2b28');
  } else if (info.working) {
    const p = clamp01(info.progress);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, rect.x + 14, rect.y + 72, rect.w - 28, 12, 6); ctx.fill();
    ctx.fillStyle = PALETTE.amber; roundRect(ctx, rect.x + 14, rect.y + 72, (rect.w - 28) * p, 12, 6); ctx.fill();
    text(ctx, station.verb, cx, rect.y + 104, 13, PALETTE.amber);
    wisp(ctx, cx - 30, rect.y + 116, 26, STEAM); wisp(ctx, cx + 24, rect.y + 116, 22, STEAM * 0.7);
  } else {
    ctx.fillStyle = 'rgba(245,234,217,0.35)'; roundRect(ctx, rect.x + 14, rect.y + 72, rect.w - 28, 12, 6); ctx.fill();
    text(ctx, 'IDLE', cx, rect.y + 104, 13, 'rgba(245,234,217,0.55)', 'center', '600');
  }
  stationIcon(ctx, key, cx, rect.y + 126, bright);
}
/** The assembly bowl: broth, noodles and toppings layered in the order they were added. */
function drawBowl(ctx, state) {
  const bowl = (state && state.bowl) || [], cx = BOWL.x, cy = BOWL.y;
  ctx.fillStyle = PALETTE.cream; ctx.beginPath();
  ctx.ellipse(cx, cy, BOWL.rx, BOWL.ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
  ctx.fillStyle = PALETTE.cream; ctx.beginPath();
  ctx.ellipse(cx, cy, BOWL.rx - 8, BOWL.ry - 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, BOWL.rx - 14, BOWL.ry - 14, 0, 0, Math.PI * 2); ctx.clip();
  let level = 0;
  for (const key of bowl) {
    if (key === 'broth') {
      ctx.fillStyle = BROTH; ctx.fillRect(cx - BOWL.rx, cy + 24 - level * 6, BOWL.rx * 2, BOWL.ry);
    } else if (key === 'noodles') {
      ctx.strokeStyle = NOODLE; ctx.lineWidth = 3;
      for (let n = 0; n < 5; n += 1) {
        const yy = cy - 6 + n * 7 - level * 4;
        ctx.beginPath(); ctx.moveTo(cx - 90, yy);
        ctx.quadraticCurveTo(cx - 40, yy - 14, cx, yy);
        ctx.quadraticCurveTo(cx + 50, yy + 14, cx + 92, yy - 4);
        ctx.stroke();
      }
    } else if (key === 'chashu') {
      ctx.fillStyle = CHASHU;
      for (let n = 0; n < 2; n += 1) {
        ctx.beginPath(); ctx.ellipse(cx - 50 + n * 58, cy - 34 + (n % 2) * 16, 24, 16, 0.2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (key === 'egg') {
      ctx.fillStyle = EGG; ctx.beginPath(); ctx.ellipse(cx + 30, cy - 40, 26, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = YOLK; ctx.beginPath(); ctx.arc(cx + 30, cy - 40, 10, 0, Math.PI * 2); ctx.fill();
    } else if (key === 'scallion') {
      ctx.strokeStyle = SCALLION; ctx.lineWidth = 5;
      for (let n = 0; n < 5; n += 1) {
        ctx.beginPath(); ctx.arc(cx - 60 + n * 26, cy - 52 + (n % 2) * 12, 6, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (key === 'nori') {
      ctx.fillStyle = NORI; ctx.fillRect(cx + 60, cy - 10, 46, 70);
    }
    level += 1;
  }
  ctx.restore();
  const steam = clamp01(((state && state.steam) || 0) * 0.5);
  for (let i = 0; i < 3; i += 1) {
    wisp(ctx, cx - 60 + i * 60, cy - BOWL.ry + 4, 60 + i * 10, STEAM * steam * (1 - i * 0.2));
  }
}
/** The serve pass: ledge, bell, plated bowl with steam; glows amber when ready. */
function drawServe(ctx, state, complete) {
  const px = SERVE.x + SERVE.w / 2, py = SERVE.y + 150;
  ctx.fillStyle = 'rgba(245,234,217,0.06)'; ctx.fillRect(SERVE.x, SERVE.y, SERVE.w, SERVE.h);
  ctx.strokeStyle = 'rgba(245,234,217,0.25)'; ctx.lineWidth = 2;
  ctx.strokeRect(SERVE.x + 1, SERVE.y + 1, SERVE.w - 2, SERVE.h - 2);
  if (complete) {
    const glow = ctx.createRadialGradient(px, SERVE.y + SERVE.h / 2, 10, px, SERVE.y + SERVE.h / 2, 90);
    glow.addColorStop(0, 'rgba(255,179,71,0.28)'); glow.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = glow; ctx.fillRect(SERVE.x, SERVE.y, SERVE.w, SERVE.h);
  }
  ctx.fillStyle = WOODLIGHT; ctx.fillRect(SERVE.x + 8, SERVE.y + SERVE.h - 34, SERVE.w - 16, 12);
  ctx.fillStyle = PALETTE.amber; ctx.beginPath(); ctx.arc(px, SERVE.y + 34, 12, Math.PI, 0); ctx.fill();
  ctx.fillRect(px - 3, SERVE.y + 34, 6, 14);
  ctx.fillStyle = WOODDARK; ctx.fillRect(px - 14, SERVE.y + 46, 28, 5);
  ctx.fillStyle = PALETTE.cream; ctx.beginPath(); ctx.ellipse(px, py, 44, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BROTH; ctx.beginPath(); ctx.ellipse(px, py - 6, 32, 9, 0, 0, Math.PI * 2); ctx.fill();
  if (complete) { wisp(ctx, px - 14, py - 14, 40, STEAM); wisp(ctx, px + 12, py - 14, 34, STEAM * 0.8); }
  text(ctx, 'SERVE', px, SERVE.y + SERVE.h - 10, 12, PALETTE.muted);
}
/** Dish name and "ADD: <next>" hint above the bowl; teal when the order is complete. */
function drawHint(ctx, state, world) {
  const tickets = (state && state.tickets) || [];
  const ticket = state && tickets[state.selected];
  const name = ticket ? (ticket.name ?? ticket.dish) : 'NO ORDER';
  const complete = !!(world && world.isBowlComplete && world.isBowlComplete());
  const needed = !complete && world && world.nextNeeded ? world.nextNeeded() : null;
  const ing = needed ? INGREDIENTS[needed] : null;
  const hy = BOWL.y - BOWL.ry - 18;
  text(ctx, name, BOWL.x, hy - 28, 20, PALETTE.cream);
  if (complete) { text(ctx, 'READY TO SERVE!', BOWL.x, hy, 17, READY); return; }
  if (!ing) return;
  text(ctx, 'ADD:', BOWL.x - 46, hy, 15, PALETTE.muted, 'right', '600');
  ctx.fillStyle = ing.color; roundRect(ctx, BOWL.x - 34, hy - 7, 14, 14, 3); ctx.fill();
  text(ctx, ing.name, BOWL.x - 12, hy, 15, PALETTE.amber, 'left');
}
/** Wooden counter front with plank lines. */
function drawCounter(ctx) {
  ctx.fillStyle = '#7a5233'; ctx.fillRect(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h);
  ctx.fillStyle = '#8a6038'; ctx.fillRect(COUNTER.x, COUNTER.y, COUNTER.w, 14);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
  for (let px = COUNTER.x; px <= COUNTER.x + COUNTER.w; px += COUNTER.w / 6) {
    ctx.beginPath(); ctx.moveTo(px, COUNTER.y + 14); ctx.lineTo(px, COUNTER.y + COUNTER.h); ctx.stroke();
  }
  for (let py = COUNTER.y + 52; py < COUNTER.y + COUNTER.h; py += 52) {
    ctx.beginPath(); ctx.moveTo(COUNTER.x, py); ctx.lineTo(COUNTER.x + COUNTER.w, py); ctx.stroke();
  }
}
/** Paint the whole kitchen panel for one frame. */
export function drawKitchen(ctx, state, world) {
  ctx.fillStyle = WALL; ctx.fillRect(KITCHEN.x, KITCHEN.y, KITCHEN.w, KITCHEN.h);
  ctx.fillStyle = PALETTE.noren; ctx.fillRect(KITCHEN.x + 40, KITCHEN.y, KITCHEN.w - 340, 44);
  ctx.fillStyle = PALETTE.cream; ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('麺', KITCHEN.x + 40 + (KITCHEN.w - 340) / 2, KITCHEN.y + 26);
  lantern(ctx, KITCHEN.x + 90, KITCHEN.y + 130); lantern(ctx, KITCHEN.x + 560, KITCHEN.y + 130);
  for (const key of STATION_ORDER) drawStation(ctx, key, state);
  drawBowl(ctx, state);
  drawHint(ctx, state, world);
  drawServe(ctx, state, !!(world && world.isBowlComplete && world.isBowlComplete()));
  drawCounter(ctx);
  if (state && state.wrongShake > 0) {
    ctx.fillStyle = PALETTE.bad; roundRect(ctx, BOWL.x - 64, BOWL.y - BOWL.ry - 8, 128, 30, 8); ctx.fill();
    text(ctx, 'WRONG!', BOWL.x, BOWL.y - BOWL.ry + 7, 17, '#fff');
  }
  if (state && state.serveFlash > 0) {
    ctx.fillStyle = READY; roundRect(ctx, SERVE.x + 4, SERVE.y + 64, SERVE.w - 8, 30, 8); ctx.fill();
    text(ctx, '+SERVED', SERVE.x + SERVE.w / 2, SERVE.y + 79, 16, '#0d2b28');
  }
}