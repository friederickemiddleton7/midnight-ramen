// The audio module: a tiny WebAudio synth. The AudioContext is created lazily on the first
// gesture (browsers block it before that). Everything is synthesized — a low ambient pad loop,
// a chop tick, a sizzle, a boil bubble, a serve bell, an add pop, an error buzz and an order-in
// paper flick. The master gain stays low; M toggles mute.

let context = null;
let master = null;
let padTimer = null;
let muted = false;
let padStep = 0;

function ensureContext() {
  if (context) return context;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);
  startPad();
  return context;
}

function resume() {
  if (context && context.state === 'suspended') context.resume();
}

/** One synthesized blip: an oscillator with a quick attack and an exponential release. */
function blip({ freq = 440, endFreq = null, type = 'sine', dur = 0.12, gain = 0.5, delay = 0 }) {
  const now = context.currentTime + delay;
  const osc = context.createOscillator();
  const env = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + dur);
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

/** A short filtered noise burst: sizzles, paper flicks and bubbles. */
function noise({ dur = 0.2, gain = 0.3, freq = 1200, q = 1, delay = 0, sweep = null }) {
  const now = context.currentTime + delay;
  const frames = Math.max(1, Math.floor(context.sampleRate * dur));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(freq, now);
  if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), now + dur);
  filter.Q.value = q;
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  source.connect(filter);
  filter.connect(env);
  env.connect(master);
  source.start(now);
}

/**
 * The ambient pad: a slow four-chord drone, one chord every four seconds. A scheduled loop of
 * quiet detuned triangles, restarted whenever the context wakes.
 */
function startPad() {
  if (padTimer) clearInterval(padTimer);
  const chords = [
    [110, 164.81, 220],
    [98, 146.83, 196],
    [123.47, 185, 246.94],
    [87.31, 130.81, 174.61],
  ];
  padStep = 0;
  padTimer = setInterval(() => {
    if (!context || muted) return;
    const chord = chords[padStep % chords.length];
    padStep += 1;
    const now = context.currentTime;
    for (const freq of chord) {
      const osc = context.createOscillator();
      const env = context.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.004);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.05, now + 1.6);
      env.gain.linearRampToValueAtTime(0.0001, now + 4.2);
      osc.connect(env);
      env.connect(master);
      osc.start(now);
      osc.stop(now + 4.4);
    }
  }, 4000);
}

/** Play one named sound effect. Names come from world.js event bits. */
export function sfx(name) {
  if (muted) return;
  if (!ensureContext()) return;
  resume();
  switch (name) {
    case 'chop':
      noise({ dur: 0.09, gain: 0.5, freq: 2400, q: 2 });
      blip({ freq: 220, endFreq: 140, type: 'square', dur: 0.07, gain: 0.18 });
      break;
    case 'sizzle':
      noise({ dur: 0.5, gain: 0.28, freq: 3400, q: 0.7, sweep: 1800 });
      break;
    case 'bubble':
      blip({ freq: 300, endFreq: 520, type: 'sine', dur: 0.18, gain: 0.3 });
      blip({ freq: 260, endFreq: 430, type: 'sine', dur: 0.16, gain: 0.22, delay: 0.12 });
      break;
    case 'bell':
      blip({ freq: 1318.5, type: 'sine', dur: 0.9, gain: 0.5 });
      blip({ freq: 1975.5, type: 'sine', dur: 0.7, gain: 0.22, delay: 0.03 });
      blip({ freq: 659.3, type: 'triangle', dur: 0.5, gain: 0.14, delay: 0.02 });
      break;
    case 'pop':
      blip({ freq: 520, endFreq: 880, type: 'triangle', dur: 0.14, gain: 0.5 });
      break;
    case 'error':
      blip({ freq: 180, endFreq: 90, type: 'sawtooth', dur: 0.3, gain: 0.4 });
      break;
    case 'order':
      noise({ dur: 0.16, gain: 0.35, freq: 900, q: 0.9, sweep: 2400 });
      break;
    case 'prep':
      blip({ freq: 660, endFreq: 990, type: 'sine', dur: 0.16, gain: 0.35 });
      break;
    case 'angry':
      blip({ freq: 200, endFreq: 80, type: 'square', dur: 0.4, gain: 0.4 });
      break;
    case 'over':
      blip({ freq: 440, type: 'triangle', dur: 0.5, gain: 0.4 });
      blip({ freq: 330, type: 'triangle', dur: 0.7, gain: 0.35, delay: 0.25 });
      blip({ freq: 220, type: 'triangle', dur: 1.1, gain: 0.35, delay: 0.5 });
      break;
    default:
      break;
  }
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.16;
  if (!value) resume();
}

export function isMuted() {
  return muted;
}

/** Wake the audio on the first real gesture (a click or a key), as browsers require. */
export function unlockAudio() {
  ensureContext();
  resume();
}
