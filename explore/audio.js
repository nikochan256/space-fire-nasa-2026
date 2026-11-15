/* Spacefire Explorer — sound.
   Narration: the browser's own speech engine reads every explanation aloud (Web Speech API), so
   there is nothing to download, and it works with whatever voices the visitor's system has
   (Edge's "Natural" voices and Chrome's Google voices sound best; they are picked first).
   Effects: synthesised live with the Web Audio API, no recordings: rocket rumble, hopper engines,
   rover motors, Ingenuity's rotor hum, lasers, quakes, robot-arm servos, welding, air jets, data.
   The science of hearing it: the Moon has no air, so out there you only hear what reaches you through
   the ground and your suit, low and muffled. Mars's thin CO₂ air carries sound quietly and soaks up
   high pitches (Perseverance's microphones showed it, and recorded Ingenuity's rotors as an 84 Hz
   hum). The repair bay is pressurised, so it sounds like a workshop on Earth. */

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ================================================================ narration
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
function pickVoice() {
  if (!synth) return;
  const vs = synth.getVoices(); if (!vs.length) return;
  const score = (v) => (/^en/i.test(v.lang) ? 20 : 0) + (/en[-_](GB|US|AU|IE|IN)/i.test(v.lang) ? 3 : 0) + (/natural|neural/i.test(v.name) ? 12 : 0) + (/online/i.test(v.name) ? 4 : 0)
    + (/google/i.test(v.name) ? 5 : 0) + (/aria|jenny|guy|sonia|libby|ryan|natasha|william|samantha|daniel|serena|karen/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);
  voice = vs.slice().sort((a, b) => score(b) - score(a))[0];
}
if (synth) { pickVoice(); synth.addEventListener && synth.addEventListener('voiceschanged', pickVoice); }

// Turn the page's text into something a speech engine reads well.
const SUB = [
  [/CO₂/g, 'carbon dioxide'], [/\bLH₂\b/g, 'liquid hydrogen'], [/H₂O/g, 'water'], [/O₂/g, 'oxygen'], [/H₂/g, 'hydrogen'], [/CH₄/g, 'methane'], [/\bLOX\b/g, 'liquid oxygen'],
  [/\bPu-238\b/g, 'plutonium 238'], [/plutonium-238/g, 'plutonium 238'], [/\bSNAP-(\d+)/g, 'SNAP $1'], [/\bRTGs?\b/g, (m) => (m.endsWith('s') ? 'R T Gs' : 'R T G')], [/\bRHUs?\b/g, 'heater units'],
  [/T−0/g, 'Liftoff'], [/T\+/g, 'T plus '], [/−/g, 'minus '],
  [/(\d[\d,.]*)\s?–\s?(\d)/g, '$1 to $2'], [/([A-Za-z])–([A-Za-z])/g, '$1-$2'], [/\s?[–—]\s?/g, ', '], [/≈\s?/g, 'about '], [/~\s?/g, 'about '], [/×\s?10/g, ' times 10'], [/(\d)\s?×/g, '$1 times'], [/×/g, ' by '],
  [/(\d[\d,]*)\+/g, 'more than $1'],
  [/(\d)\s?°C\b/g, '$1 degrees Celsius'], [/(\d)\s?°/g, '$1 degrees'], [/\bkm\/s\b/g, 'kilometres per second'], [/\bcm\/s\b/g, 'centimetres per second'], [/(\d)-km\b/g, '$1-kilometre'], [/(\d)-m\b/g, '$1-metre'], [/\bkm\/h\b/g, 'kilometres per hour'], [/\bm\/s\b/g, 'metres per second'],
  [/(\d)\s?kWe\b/g, '$1 kilowatts'], [/(\d)\s?kW\b/g, '$1 kilowatts'], [/(\d)\s?Wh\b/g, '$1 watt-hours'], [/(\d)\s?W\b/g, '$1 watts'], [/(\d)\s?MW\b/g, '$1 megawatts'],
  [/(\d)\s?km²/g, '$1 square kilometres'], [/(\d)\s?m³/g, '$1 cubic metres'], [/(\d)\s?km\b/g, '$1 kilometres'], [/(\d)\s?cm\b/g, '$1 centimetres'], [/(\d)\s?mm\b/g, '$1 millimetres'], [/(\d)\s?m\b/g, '$1 metres'],
  [/(\d)\s?kg\b/g, '$1 kilograms'], [/(\d)\s?g\b/g, '$1 grams'], [/(\d)\s?t\b/g, '$1 tonnes'], [/(\d)\s?rpm\b/g, '$1 R P M'], [/(\d)\s?Hz\b/g, '$1 hertz'], [/(\d)\s?V\b/g, '$1 volts'], [/(\d)\s?Ah\b/g, '$1 amp-hours'],
  [/(\d)\s?h\b/g, '$1 hours'], [/(\d)\s?min\b/g, '$1 minutes'], [/(\d)\s?s\b/g, '$1 seconds'], [/(\d)\s?%/g, '$1 percent'],
  [/\s·\s/g, '. '], [/\be\.g\./g, 'for example'], [/\bvs\.?\b/g, 'versus'], [/\bUTC\b/g, 'U T C'], [/\bIST\b/g, 'India time'], [/[“”"]/g, ''], [/\s{2,}/g, ' '],
];
export function speakable(t) { let s = String(t || ''); for (const [a, b] of SUB) s = s.replace(a, b); return s.trim(); }
function chunks(t) { // sentences, grouped to about 220 characters (long utterances get cut off in Chrome)
  const parts = t.match(/[^.!?;:]+[.!?;:]+["')\]]*\s*|[^.!?;:]+$/g) || [t], out = [];
  let cur = '';
  for (const p of parts) { if ((cur + p).length > 190 && cur) { out.push(cur.trim()); cur = p; } else cur += p; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
let voiceOn = store.get('sf-voice', '1') === '1', unlocked = false, blocked = null;
const said = []; // what the narrator was asked to say (for automated checks)
const queue = []; let speaking = false, current = null, onChange = () => {}, kick = null;
function next() {
  clearTimeout(kick);
  if (!queue.length) { speaking = false; current = null; duck(false); onChange(false); return; }
  const text = queue.shift(), u = new SpeechSynthesisUtterance(text);
  if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-GB';
  u.rate = 1.0; u.pitch = 1.0; u.volume = 1;
  let done = false; const fin = () => { if (done) return; done = true; if (current === u) next(); };
  said.push(text); if (said.length > 40) said.shift();
  u.onend = fin; u.onerror = (e) => { if (e && e.error === 'not-allowed' && !unlocked) blocked = [text, ...queue]; fin(); };
  current = u; speaking = true; duck(true); onChange(true);
  try { synth.speak(u); } catch (e) { fin(); return; }
  kick = setTimeout(() => { if (current === u && !synth.speaking && !synth.pending) fin(); }, 4000); // no voice available, or blocked before a click
}
/** Read text aloud.  mode: 'replace' cuts in now; 'soft' lets the sentence being spoken finish; 'queue' waits its turn. */
export function narrate(text, { mode = 'soft' } = {}) {
  if (!synth || !voiceOn || !text) return;
  const parts = chunks(speakable(text)); if (!parts.length) return;
  if (mode === 'replace') { queue.length = 0; current = null; synth.cancel(); queue.push(...parts); setTimeout(next, 70); return; }
  if (mode === 'soft') queue.length = 0;
  queue.push(...parts);
  if (!speaking) next();
}
export function stopNarration() { queue.length = 0; current = null; if (synth) synth.cancel(); speaking = false; duck(false); onChange(false); }
export const isSpeaking = () => speaking;

// ================================================================ effects
let meter = null, ctx = null, out = null, envF = null, envG = null, sfxBus = null, ambBus = null, duckG = null, noiseW = null, noiseB = null;
let sfxOn = store.get('sf-sfx', '1') === '1', scene = 'space', amb = null;
const ENV = { // what the air (or the lack of it) does to sound in each place
  space: [16000, 1], cine: [16000, 1], story: [16000, 0.8], bay: [16000, 1],
  moon: [700, 0.85], // no air: only vibration through the ground and the suit
  mars: [2600, 0.6], // thin CO₂: quiet, and high pitches are soaked up
};
function ensure() {
  if (!unlocked) return null; // browsers refuse sound before the visitor's first click or key press
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  out = ctx.createGain(); out.gain.value = sfxOn ? 0.9 : 0;
  duckG = ctx.createGain(); duckG.gain.value = 1;
  envF = ctx.createBiquadFilter(); envF.type = 'lowpass'; envF.Q.value = 0.5;
  envG = ctx.createGain();
  sfxBus = ctx.createGain(); ambBus = ctx.createGain(); ambBus.gain.value = 0.9;
  sfxBus.connect(envF); envF.connect(envG); envG.connect(duckG); ambBus.connect(duckG); duckG.connect(comp); comp.connect(out); out.connect(ctx.destination);
  meter = ctx.createAnalyser(); meter.fftSize = 2048; out.connect(meter);
  const mk = (brown) => { const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; };
  noiseW = mk(false); noiseB = mk(true);
  applyEnv(true); startAmbient();
  return ctx;
}
// browsers only allow sound after the visitor has clicked or pressed a key
if (typeof window !== 'undefined') ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => addEventListener(ev, () => {
  const first = !unlocked; unlocked = true; ensure();
  if (first) { if (blocked && voiceOn) { const b = blocked.join(' '); blocked = null; setTimeout(() => { if (!speaking) narrate(b, { mode: 'replace' }); }, 250); } }
}, { capture: true, passive: true }));
function duck(on) { if (!ctx) return; duckG.gain.setTargetAtTime(on ? 0.5 : 1, ctx.currentTime, 0.25); }
function applyEnv(now) { if (!ctx) return; const [f, g] = ENV[scene] || ENV.space, t = ctx.currentTime; envF.frequency.setTargetAtTime(f, t, now ? 0.01 : 0.4); envG.gain.setTargetAtTime(g, t, now ? 0.01 : 0.4); }
const T = () => ctx.currentTime;
let REG = null; // while a loop or ambience is being built, its sources are recorded here
function noise(brown, loop = true) { const s = ctx.createBufferSource(); s.buffer = brown ? noiseB : noiseW; s.loop = loop; s.loopStart = Math.random(); if (REG) REG.push(s); return s; }
function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function gain(v = 0) { const g = ctx.createGain(); g.gain.value = v; return g; }
function osc(type, f) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (REG) REG.push(o); return o; }
function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
const ok = () => sfxOn && ensure();
function env(g, peak, a, d, t0 = T()) { g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
function stopAll(nodes, t) { nodes.forEach((n) => { try { n.stop(t); } catch (e) { /* already stopped */ } }); }

// ---- one-shots
function tone(type, f0, f1, dur, peak, { delay = 0, bus = sfxBus, a = 0.008 } = {}) {
  const t0 = T() + delay, o = osc(type, f0), g = gain(); chain(o, g, bus);
  o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  env(g, peak, a, dur, t0); o.start(t0); o.stop(t0 + a + dur + 0.05);
}
function burst(brown, type, f, dur, peak, { delay = 0, q = 0.7, f1 = null, a = 0.01 } = {}) {
  const t0 = T() + delay, n = noise(brown, true), b = filt(type, f, q), g = gain(); chain(n, b, g, sfxBus);
  if (f1) b.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  env(g, peak, a, dur, t0); n.start(t0); n.stop(t0 + a + dur + 0.05);
}
export const sfx = {
  click() { if (!ok()) return; burst(false, 'bandpass', 3200, 0.03, 0.08, { q: 2, a: 0.002 }); },
  whoosh(dur = 1.2) { if (!ok()) return; const t0 = T(), n = noise(false), b = filt('bandpass', 300, 1.2), g = gain(); chain(n, b, g, sfxBus); b.frequency.setValueAtTime(250, t0); b.frequency.exponentialRampToValueAtTime(2200, t0 + dur * 0.45); b.frequency.exponentialRampToValueAtTime(300, t0 + dur); env(g, 0.18, dur * 0.4, dur * 0.6, t0); n.start(t0); n.stop(t0 + dur + 0.1); },
  clunk(level = 1) { if (!ok()) return; tone('sine', 110, 45, 0.22, 0.35 * level); burst(false, 'bandpass', 2400, 0.05, 0.12 * level, { q: 3 }); },
  hiss(dur = 1.4, level = 1) { if (!ok()) return; burst(false, 'bandpass', 4200, dur, 0.14 * level, { q: 0.6, f1: 1800, a: 0.04 }); },
  laser() { if (!ok()) return; tone('sine', 2400, 500, 0.35, 0.16); tone('square', 1200, 300, 0.25, 0.03); tone('sine', 2800, 2800, 0.08, 0.1, { delay: 1.5 }); tone('sine', 3400, 3400, 0.06, 0.07, { delay: 1.62 }); },
  quake(dur = 4.5) { if (!ok()) return; burst(true, 'lowpass', 140, dur, 0.85, { a: 0.4, q: 0.9 }); tone('sine', 34, 26, dur, 0.5, { a: 0.3 }); for (let i = 0; i < 9; i++) burst(false, 'bandpass', 900 + Math.random() * 900, 0.12, 0.06, { delay: 0.3 + Math.random() * dur * 0.7, q: 4 }); },
  boom(delay = 0) { if (!ok()) return; burst(true, 'lowpass', 600, 2.6, 1.0, { delay, f1: 80, a: 0.005 }); tone('sine', 90, 28, 1.6, 0.7, { delay, a: 0.005 }); burst(false, 'highpass', 2500, 0.4, 0.2, { delay }); },
  signal() { if (!ok()) return; for (let i = 0; i < 16; i++) tone('square', 700 + Math.round(Math.random() * 8) * 220, 0, 0.045, 0.035, { delay: 0.25 + i * 0.07 }); burst(false, 'bandpass', 2500, 1.6, 0.03, { q: 0.4, a: 0.1 }); },
  scan(dur = 4.2) { if (!ok()) return; const t0 = T(), o = osc('sine', 500), g = gain(); chain(o, g, sfxBus); o.frequency.setValueAtTime(500, t0); o.frequency.linearRampToValueAtTime(1500, t0 + dur / 2); o.frequency.linearRampToValueAtTime(500, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.05, t0 + 0.3); g.gain.setValueAtTime(0.05, t0 + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.1); for (let i = 0; i < dur * 4; i++) tone('sine', 2200, 2200, 0.03, 0.04, { delay: i * 0.25 }); },
  alarm(dur = 2.4) { if (!ok()) return; for (let i = 0; i < dur / 0.6; i++) { tone('triangle', 660, 660, 0.25, 0.05, { delay: i * 0.6 }); tone('triangle', 880, 880, 0.25, 0.05, { delay: i * 0.6 + 0.3 }); } },
  chime() { if (!ok()) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone('sine', f, f, 0.9, 0.09, { delay: i * 0.11, a: 0.01 }); tone('triangle', f * 2, f * 2, 0.4, 0.015, { delay: i * 0.11 }); }); },
  powerUp() { if (!ok()) return; const t0 = T(), o = osc('sawtooth', 70), b = filt('lowpass', 300, 4), g = gain(); chain(o, b, g, sfxBus); o.frequency.exponentialRampToValueAtTime(420, t0 + 1.6); b.frequency.exponentialRampToValueAtTime(2400, t0 + 1.6); env(g, 0.08, 1.2, 0.8, t0); o.start(t0); o.stop(t0 + 2.2); setTimeout(() => sfx.chime(), 1500); },
  insert() { if (!ok()) return; tone('square', 1800, 1800, 0.03, 0.05); sfx.clunk(0.6); tone('sine', 1400, 2100, 0.12, 0.05, { delay: 0.12 }); },
  steps(n = 2) { if (!ok()) return; for (let i = 0; i < n; i++) burst(true, 'lowpass', 300, 0.12, 0.1, { delay: i * 0.38, a: 0.005 }); },
};

// ---- loops: start one, change its level while it runs, stop it with a fade
const LOOPS = {
  rocket(L) { // a launch: deep roar plus crackle
    const a = chain(noise(true), filt('lowpass', 420, 0.8), L.g1 = gain()), b = chain(noise(false), filt('bandpass', 1400, 0.5), L.g2 = gain()), r = chain(noise(true), filt('lowpass', 70, 1), L.g3 = gain());
    L.src = [a, b, r]; L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 1.0, t, 0.1); L.g2.gain.setTargetAtTime(v * v * 0.14, t, 0.1); L.g3.gain.setTargetAtTime(v * 1.2, t, 0.15); };
    L.crackle = setInterval(() => { if (L.v > 0.2) L.g2.gain.setTargetAtTime(L.v * L.v * (0.05 + Math.random() * 0.25), T(), 0.02); }, 45);
  },
  hopper(L) { // throttled engines on a hovering lander: a hiss over a rumble
    chain(noise(true), filt('lowpass', 300, 0.8), L.g1 = gain()); chain(noise(false), filt('bandpass', 2200, 0.6), L.g2 = gain());
    L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 0.9, t, 0.15); L.g2.gain.setTargetAtTime(v * 0.12, t, 0.15); };
  },
  motor(L) { // an electric drive motor and wheels on gravel
    const o = osc('sawtooth', 60); L.o = o; chain(o, filt('lowpass', 900, 1.5), L.g1 = gain()); chain(noise(true), filt('bandpass', 500, 0.8), L.g2 = gain());
    L.set = (v) => { const t = T(); o.frequency.setTargetAtTime(55 + v * 140, t, 0.1); L.g1.gain.setTargetAtTime(v ? 0.03 + v * 0.05 : 0, t, 0.1); L.g2.gain.setTargetAtTime(v * 0.25, t, 0.1); };
  },
  rotor(L) { // Ingenuity: two rotors with two blades each at ~2,537 rpm = an 84 Hz hum
    const o = osc('sawtooth', 84), lfo = osc('sine', 5.6), lg = gain(0.3); L.o = o; lfo.connect(lg);
    const g1 = L.g1 = gain(); chain(o, filt('bandpass', 170, 1.2), g1); lg.connect(g1.gain);
    chain(noise(false), filt('bandpass', 600, 0.8), L.g2 = gain()); L.src = [lfo];
    L.set = (v) => { const t = T(); o.frequency.setTargetAtTime(20 + v * 64, t, 0.3); L.g1.gain.setTargetAtTime(v * 0.25, t, 0.2); L.g2.gain.setTargetAtTime(v * v * 0.08, t, 0.2); };
  },
  servo(L) { // robot-arm joints
    const o = osc('sawtooth', 200); L.o = o; chain(o, filt('bandpass', 900, 3), L.g1 = gain());
    L.set = (v) => { const t = T(); o.frequency.setTargetAtTime(180 + v * 520, t, 0.08); L.g1.gain.setTargetAtTime(v * 0.06, t, 0.08); };
  },
  jet(L) { chain(noise(false), filt('bandpass', 2600, 0.7), L.g1 = gain()); L.set = (v) => L.g1.gain.setTargetAtTime(v * 0.22, T(), 0.08); }, // compressed-gas jet
  weld(L) { // arc crackle and mains buzz
    chain(noise(false), filt('highpass', 1800, 0.7), L.g1 = gain()); const o = osc('square', 120); chain(o, filt('lowpass', 1400, 1), L.g2 = gain()); L.o = o;
    L.set = (v) => L.g2.gain.setTargetAtTime(v * 0.025, T(), 0.05);
    L.crackle = setInterval(() => { L.g1.gain.setTargetAtTime(L.v * (Math.random() < 0.35 ? 0.35 : 0.05) * Math.random(), T(), 0.01); }, 35);
  },
  field(L) { // the dust shield's rippling electric field
    const o = osc('sawtooth', 60), lfo = osc('sine', 8), lg = gain(0.5); lfo.connect(lg); L.o = o; L.src = [lfo];
    const g1 = L.g1 = gain(); chain(o, filt('bandpass', 700, 2), g1); lg.connect(g1.gain);
    chain(noise(false), filt('highpass', 4000, 0.7), L.g2 = gain());
    L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 0.08, t, 0.1); L.g2.gain.setTargetAtTime(v * 0.03, t, 0.1); };
  },
  hum(L) { // heaters, lamps, fans
    const o = osc('sine', 110), o2 = osc('sine', 220); L.src = [o2]; L.o = o; chain(o, L.g1 = gain()); chain(o2, L.g3 = gain()); chain(noise(true), filt('lowpass', 500, 0.7), L.g2 = gain());
    L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 0.05, t, 0.2); L.g3.gain.setTargetAtTime(v * 0.02, t, 0.2); L.g2.gain.setTargetAtTime(v * 0.12, t, 0.2); };
  },
  whirr(L) { const o = osc('sawtooth', 140); L.o = o; chain(o, filt('lowpass', 700, 2), L.g1 = gain()); chain(noise(true), filt('bandpass', 400, 1), L.g2 = gain()); L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 0.05, t, 0.1); L.g2.gain.setTargetAtTime(v * 0.15, t, 0.1); }; },
  drill(L) { const o = osc('square', 38), lfo = osc('sine', 6), lg = gain(0.4); lfo.connect(lg); L.src = [lfo]; L.o = o; const g1 = L.g1 = gain(); chain(o, filt('lowpass', 260, 1), g1); lg.connect(g1.gain); chain(noise(true), filt('lowpass', 300, 0.8), L.g2 = gain()); L.set = (v) => { const t = T(); L.g1.gain.setTargetAtTime(v * 0.18, t, 0.1); L.g2.gain.setTargetAtTime(v * 0.4, t, 0.1); }; },
  data(L) { // a data link: quick tones
    L.g1 = gain(1); L.set = () => {};
    L.crackle = setInterval(() => { if (L.v > 0.05) tone('square', 900 + Math.round(Math.random() * 10) * 160, 0, 0.04, 0.03 * L.v); }, 70);
  },
};
export function loop(kind) {
  const L = { v: 0, kind, set: () => {}, stop: () => {}, dead: false };
  if (!ok() || !LOOPS[kind]) return L; // a silent handle: callers never need to check
  REG = []; LOOPS[kind](L); L.started = REG; REG = null; // every oscillator and noise source the loop made
  const outs = [L.g1, L.g2, L.g3].filter(Boolean); outs.forEach((g) => { g.gain.value = 0; g.connect(sfxBus); });
  const t0 = T(); L.started.forEach((s) => { try { s.start(t0); } catch (e) { /* already started */ } });
  const inner = L.set; L.set = (v) => { if (L.dead) return; L.v = clamp(v, 0, 1.5); inner(L.v); };
  L.stop = (fade = 0.4) => { if (L.dead) return; L.dead = true; clearInterval(L.crackle); outs.forEach((g) => g.gain.setTargetAtTime(0, T(), fade / 3)); stopAll(L.started, T() + fade + 0.2); };
  live.add(L); const st = L.stop; L.stop = (f) => { live.delete(L); st(f); };
  return L;
}
const live = new Set();
export function stopLoops() { [...live].forEach((L) => L.stop(0.2)); }
/** Play a loop for a fixed time, following a level curve f(t) (0..1). */
export function play(kind, dur, curve = () => 1) {
  const L = loop(kind); if (!L.started) return L;
  const t0 = performance.now(), tick = () => { if (L.dead) return; const t = (performance.now() - t0) / 1000; if (t >= dur) { L.stop(); return; } L.set(curve(t)); requestAnimationFrame(tick); };
  tick(); return L;
}

// ---- ambience: what the place sounds like when nothing happens
const AMB = {
  space(A) { const o1 = osc('sine', 55), o2 = osc('sine', 82.6), lfo = osc('sine', 0.05), lg = gain(0.006), g = A.g = gain(0); lfo.connect(lg); lg.connect(g.gain); chain(o1, filt('lowpass', 300), g); chain(o2, filt('lowpass', 300), g); A.src = [o1, o2, lfo]; A.level = 0.012; },
  story(A) { AMB.space(A); A.level = 0.008; },
  moon(A) { const n = noise(true), o = osc('sine', 96), g = A.g = gain(0), go = gain(0.12); chain(n, filt('lowpass', 220), g); chain(o, go, g); A.src = [n, o]; A.level = 0.045; }, // your suit's fans
  mars(A) { const n = noise(false), b = filt('bandpass', 380, 0.8), lfo = osc('sine', 0.08), lg = gain(160), g = A.g = gain(0), gl = osc('sine', 0.13), gg = gain(0.02); lfo.connect(lg); lg.connect(b.frequency); gl.connect(gg); gg.connect(g.gain); chain(n, b, g); A.src = [n, lfo, gl]; A.level = 0.05; }, // thin wind
  bay(A) { const n = noise(true), o = osc('sine', 120), g = A.g = gain(0), go = gain(0.1); chain(n, filt('lowpass', 320), g); chain(o, go, g); A.src = [n, o]; A.level = 0.06; }, // air handling
  cine(A) { A.src = []; A.g = gain(0); A.level = 0; },
};
function startAmbient() {
  if (!ctx) return;
  if (amb) { const old = amb; old.g.gain.setTargetAtTime(0, T(), 0.5); setTimeout(() => stopAll(old.src, 0), 2500); amb = null; }
  if (!sfxOn) return;
  const A = {}; REG = []; (AMB[scene] || AMB.space)(A); A.src = REG; REG = null;
  A.g.connect(ambBus); A.src.forEach((s) => s.start()); A.g.gain.setTargetAtTime(A.level, T(), 0.8); amb = A;
}
/** Where we are: 'space' (the map), 'moon', 'mars', 'bay', 'cine', 'story'. */
export function setScene(name) { if (name === scene) return; scene = name; if (ctx) { applyEnv(false); startAmbient(); } }

// ---- switches
export function setSfx(on) { sfxOn = on; store.set('sf-sfx', on ? '1' : '0'); if (on) ensure(); if (ctx) { out.gain.setTargetAtTime(on ? 0.9 : 0, T(), 0.1); startAmbient(); } }
export function setVoice(on) { voiceOn = on; store.set('sf-voice', on ? '1' : '0'); if (!on) stopNarration(); }
export const sfxEnabled = () => sfxOn, voiceEnabled = () => voiceOn, hasVoice = () => !!synth;
export function onSpeaking(fn) { onChange = fn; }

// a handle for automated checks: what was said, and how loud the output is right now
if (typeof window !== 'undefined') window.SF_AUDIO = {
  said, get scene() { return scene; }, get state() { return ctx ? ctx.state : 'none'; }, voices: () => (synth ? synth.getVoices().length : 0),
  level() { if (!meter) return 0; const d = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); },
};
