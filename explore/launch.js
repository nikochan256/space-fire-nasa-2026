/* Spacefire Explorer — launch films.
   A short cinematic of each mission's real launch vehicle leaving its pad: countdown, ignition,
   liftoff, the gravity turn, booster and stage separation, and the sky fading to black.
   Rockets are built to their real proportions (metres) from published dimensions; flames follow
   their propellants (kerosene/LOX orange, solid white-hot with heavy smoke, hydrogen/LOX nearly
   clear blue, hypergolic pale orange). Some cores really are lit in flight, not at liftoff
   (Titan IIIE, LVM3); that is shown too. */
import * as THREE from 'three';
import { makeCanvas, toTex } from './builders.js';

const TAU = Math.PI * 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- rocket materials
const paint = (c, r = 0.5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const M = {
  white: paint(0xf1f0ea), black: paint(0x151515, 0.6), grey: paint(0x9a9a96), steel: paint(0xc9ccd0, 0.3, 0.9),
  foam: paint(0xc0692c, 0.85), delta: paint(0x8ab8cf, 0.55), cream: paint(0xe4e0d4), dark: paint(0x2a2c30, 0.5, 0.4),
  red: paint(0xb3261e), gold: paint(0xc89b3c, 0.35, 0.8), nozzle: paint(0x3a3633, 0.45, 0.7),
};
const rollTex = toTex(makeCanvas(256, 64, (g, w, h) => { // Saturn-style black and white roll pattern
  g.fillStyle = '#f1f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#151515';
  for (let i = 0; i < 4; i++) g.fillRect((i * w) / 4, 0, w / 8, h);
}));
M.roll = new THREE.MeshStandardMaterial({ map: rollTex, roughness: 0.5 });
const bandTex = toTex(makeCanvas(64, 256, (g, w, h) => { // segmented solid-booster casing
  g.fillStyle = '#f1f0ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2a2a';
  for (let i = 0; i < 6; i++) g.fillRect(0, (i * h) / 6, w, 5);
}));
M.srb = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.5 });

// ---------------------------------------------------------------- rocket building blocks (y up, base at y = 0)
function seg(g, r1, r2, h, mat, y, x = 0, z = 0, sides = 40) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, sides), mat); m.position.set(x, y + h / 2, z); g.add(m); return y + h; }
function ogive(g, r, h, mat, y, x = 0, z = 0) {
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(Math.max(r * Math.sqrt(1 - t * t * 0.98), 0.001), t * h)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat); m.position.set(x, y, z); g.add(m); return y + h;
}
function nozzle(g, r, h, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, h, 24, 1, true), M.nozzle); m.material.side = THREE.DoubleSide; m.position.set(x, y - h / 2, z); g.add(m); return m; }
function ring(n, rad, a0 = 0) { return Array.from({ length: n }, (_, i) => [Math.cos(a0 + (i / n) * TAU) * rad, Math.sin(a0 + (i / n) * TAU) * rad]); }

// Each builder returns { g, H, D, stages } where stages are the burning phases:
// { lit: [{x,y,z,r,prop}], drop: [objects shed at the start of the next phase] }
const ROCKETS = {
  saturn5() { // 110.6 m, 10.1 m
    const g = new THREE.Group(), lower = new THREE.Group(), upper = new THREE.Group(); g.add(lower, upper);
    let y = 0;
    y = seg(lower, 5.05, 5.05, 42, M.white, 0); seg(lower, 5.06, 5.06, 6, M.roll, 30); seg(lower, 5.07, 5.07, 3, M.black, 39);
    for (const [x, z] of ring(4, 5.2, Math.PI / 4)) { seg(lower, 1.2, 0.6, 9, M.white, 0, x, z, 16); const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 3.2), M.white); fin.position.set(x * 1.25, 3, z * 1.25); fin.lookAt(0, 3, 0); lower.add(fin); }
    const f1 = ring(4, 3.2, Math.PI / 4).concat([[0, 0]]); f1.forEach(([x, z]) => nozzle(lower, 1.85, 5.8, x, 0, z));
    y = seg(upper, 5.05, 5.05, 24.9, M.white, y); seg(upper, 5.06, 5.06, 4, M.black, 42);
    y = seg(upper, 5.05, 3.3, 5.5, M.white, y); y = seg(upper, 3.3, 3.3, 12.5, M.white, y); seg(upper, 3.31, 3.31, 3, M.roll, y - 12.5);
    y = seg(upper, 3.3, 3.3, 0.9, M.grey, y); y = seg(upper, 3.3, 1.96, 8.5, M.white, y);
    y = seg(upper, 1.96, 1.96, 3.9, M.steel, y); y = seg(upper, 1.96, 0.3, 3.5, M.white, y);
    y = seg(upper, 0.25, 0.25, 6.5, M.red, y, 0, 0, 8); y = seg(upper, 0.45, 0.1, 1.4, M.red, y, 0, 0, 12);
    return { g, H: y, D: 10.1, stages: [
      { lit: f1.map(([x, z]) => ({ x, y: -5.8, z, r: 1.85, prop: 'kerolox' })), drop: [lower] },
      { lit: ring(4, 2.0).concat([[0, 0]]).map(([x, z]) => ({ x, y: 42, z, r: 0.95, prop: 'hydrolox' })) },
    ] };
  },
  atlasAgena() { // Atlas LV-3 + Agena B, ~31 m
    const g = new THREE.Group(), lower = new THREE.Group(), upper = new THREE.Group(); g.add(lower, upper);
    let y = seg(lower, 1.6, 1.6, 3.5, M.steel, 0); y = seg(lower, 1.525, 1.525, 18, M.steel, y); y = seg(lower, 1.525, 0.76, 1.5, M.steel, y);
    [[-1, 0], [1, 0], [0, 0]].forEach(([x], i) => nozzle(lower, i < 2 ? 0.7 : 0.45, 1.8, x * 0.9, 0, 0));
    y = seg(upper, 0.76, 0.76, 6, M.black, y); y = seg(upper, 0.76, 0.76, 1.5, M.steel, y); y = ogive(upper, 0.76, 2.2, M.white, y);
    return { g, H: y, D: 3.2, stages: [
      { lit: [{ x: -0.9, y: -1.8, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0.9, y: -1.8, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0, y: -1.8, z: 0, r: 0.45, prop: 'kerolox' }], drop: [lower] },
      { lit: [{ x: 0, y: 23, z: 0, r: 0.35, prop: 'hypergolic' }] },
    ] };
  },
  atlasCentaur() { // Atlas SLV-3C + Centaur, ~38 m
    const g = new THREE.Group(), lower = new THREE.Group(), upper = new THREE.Group(); g.add(lower, upper);
    let y = seg(lower, 1.6, 1.6, 3.5, M.steel, 0); y = seg(lower, 1.525, 1.525, 19.5, M.steel, y);
    [[-1, 0], [1, 0], [0, 0]].forEach(([x], i) => nozzle(lower, i < 2 ? 0.7 : 0.45, 1.8, x * 0.9, 0, 0));
    y = seg(upper, 1.525, 1.525, 9.1, M.white, y); seg(upper, 1.53, 1.53, 0.6, M.grey, y - 4.5);
    y = seg(upper, 1.525, 1.525, 3.5, M.white, y); y = ogive(upper, 1.525, 5.5, M.white, y);
    return { g, H: y, D: 3.2, stages: [
      { lit: [{ x: -0.9, y: -1.8, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0.9, y: -1.8, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0, y: -1.8, z: 0, r: 0.45, prop: 'kerolox' }], drop: [lower] },
      { lit: [{ x: -0.5, y: 23, z: 0, r: 0.45, prop: 'hydrolox' }, { x: 0.5, y: 23, z: 0, r: 0.45, prop: 'hydrolox' }] },
    ] };
  },
  titan3e() { // Titan IIIE / Centaur with two 5-segment SRBs, ~48.8 m
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(), boost = new THREE.Group(); g.add(core, upper, boost);
    let y = seg(core, 1.525, 1.525, 22, M.cream, 0); nozzle(core, 0.8, 2, -0.6, 0, 0); nozzle(core, 0.8, 2, 0.6, 0, 0);
    y = seg(core, 1.525, 1.525, 7, M.cream, y);
    y = seg(upper, 1.525, 1.525, 9.6, M.white, y); y = seg(upper, 2.13, 2.13, 7, M.white, y); y = ogive(upper, 2.13, 4.5, M.white, y);
    for (const s of [-1, 1]) { const x = s * 3.1; let by = seg(boost, 1.525, 1.525, 25.9, M.srb, 0, x); ogive(boost, 1.525, 3.6, M.white, by, x); nozzle(boost, 1.4, 2.6, x, 0, 0); }
    return { g, H: y, D: 9.3, stages: [
      { lit: [{ x: -3.1, y: -2.6, z: 0, r: 1.4, prop: 'solid' }, { x: 3.1, y: -2.6, z: 0, r: 1.4, prop: 'solid' }], drop: [boost] }, // core is air-lit
      { lit: [{ x: -0.6, y: -2, z: 0, r: 0.8, prop: 'hypergolic' }, { x: 0.6, y: -2, z: 0, r: 0.8, prop: 'hypergolic' }], drop: [core] },
      { lit: [{ x: 0, y: 29, z: 0, r: 0.5, prop: 'hydrolox' }] },
    ] };
  },
  delta2() { // Delta II 7925: 9 GEM-40 strap-ons (6 lit on the ground, 3 in the air), 38.9 m
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(), b6 = new THREE.Group(), b3 = new THREE.Group(); g.add(core, upper, b6, b3);
    let y = seg(core, 1.22, 1.22, 26.1, M.delta, 0); nozzle(core, 0.6, 1.6, 0, 0, 0);
    y = seg(upper, 1.22, 1.22, 6, M.white, y); y = seg(upper, 1.25, 1.45, 1.2, M.white, y); y = seg(upper, 1.45, 1.45, 4.5, M.white, y); y = ogive(upper, 1.45, 3.4, M.white, y);
    ring(9, 1.85).forEach(([x, z], i) => { const grp = i % 3 === 2 ? b3 : b6; const by = seg(grp, 0.508, 0.508, 13, M.white, 0.5, x, z, 20); ogive(grp, 0.508, 1.3, M.white, by, x, z); nozzle(grp, 0.45, 0.9, x, 0.5, z); });
    const gem = (k) => ring(9, 1.85).filter((_, i) => (i % 3 === 2) === k).map(([x, z]) => ({ x, y: -0.4, z, r: 0.45, prop: 'solid' }));
    return { g, H: y, D: 4.8, stages: [
      { lit: [{ x: 0, y: -1.6, z: 0, r: 0.6, prop: 'kerolox' }, ...gem(false)], drop: [b6] },
      { lit: [{ x: 0, y: -1.6, z: 0, r: 0.6, prop: 'kerolox' }, ...gem(true)], drop: [b3] },
      { lit: [{ x: 0, y: -1.6, z: 0, r: 0.6, prop: 'kerolox' }], drop: [core] },
      { lit: [{ x: 0, y: 26.1, z: 0, r: 0.35, prop: 'hypergolic' }] },
    ] };
  },
  atlasV401() { // 58.3 m, no solids, RD-180
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(); g.add(core, upper);
    let y = seg(core, 1.905, 1.905, 32.5, M.foam, 0); nozzle(core, 0.7, 2.2, -0.75, 0, 0); nozzle(core, 0.7, 2.2, 0.75, 0, 0);
    y = seg(upper, 1.905, 1.525, 2, M.white, y); y = seg(upper, 1.525, 1.525, 11.7, M.white, y); y = seg(upper, 2.1, 2.1, 7.5, M.white, y); y = ogive(upper, 2.1, 5.2, M.white, y);
    return { g, H: y, D: 3.8, stages: [
      { lit: [{ x: -0.75, y: -2.2, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0.75, y: -2.2, z: 0, r: 0.7, prop: 'kerolox' }], drop: [core] },
      { lit: [{ x: 0, y: 32.5, z: 0, r: 0.5, prop: 'hydrolox' }] },
    ] };
  },
  atlasV541() { // 58.3 m, 4 solid boosters, 5 m fairing
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(), boost = new THREE.Group(); g.add(core, upper, boost);
    let y = seg(core, 1.905, 1.905, 32.5, M.foam, 0); nozzle(core, 0.7, 2.2, -0.75, 0, 0); nozzle(core, 0.7, 2.2, 0.75, 0, 0);
    y = seg(upper, 1.905, 2.7, 3, M.white, y); y = seg(upper, 2.7, 2.7, 13.5, M.white, y); y = ogive(upper, 2.7, 7.5, M.white, y);
    const pos = ring(4, 2.75, Math.PI / 4);
    pos.forEach(([x, z]) => { const by = seg(boost, 0.79, 0.79, 17, M.white, 0.3, x, z, 20); ogive(boost, 0.79, 2.5, M.white, by, x, z); nozzle(boost, 0.6, 1.4, x, 0.3, z); });
    const rd = [{ x: -0.75, y: -2.2, z: 0, r: 0.7, prop: 'kerolox' }, { x: 0.75, y: -2.2, z: 0, r: 0.7, prop: 'kerolox' }];
    return { g, H: y, D: 7.0, stages: [
      { lit: [...rd, ...pos.map(([x, z]) => ({ x, y: -1.1, z, r: 0.6, prop: 'solid' }))], drop: [boost] },
      { lit: rd, drop: [core] },
      { lit: [{ x: 0, y: 32.5, z: 0, r: 0.5, prop: 'hydrolox' }] },
    ] };
  },
  shuttle() { // Space Shuttle stack, 56.1 m
    const g = new THREE.Group(), et = new THREE.Group(), orb = new THREE.Group(), boost = new THREE.Group(); g.add(et, orb, boost);
    let y = seg(et, 4.2, 4.2, 40, M.foam, 2); ogive(et, 4.2, 9, M.foam, y);
    for (const s of [-1, 1]) { const x = s * 6.0; let by = seg(boost, 1.855, 1.855, 39, M.white, 3.5, x); ogive(boost, 1.855, 6.3, M.white, by, x); nozzle(boost, 1.9, 3.5, x, 3.5, 0); }
    // orbiter on the +z side of the tank, nose up
    const fus = new THREE.Mesh(new THREE.BoxGeometry(5.2, 30, 5.6), M.white); fus.position.set(0, 21, 7.6); orb.add(fus);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(5.25, 30, 0.4), M.black); belly.position.set(0, 21, 4.9); orb.add(belly);
    ogive(orb, 2.7, 6, M.white, 36, 0, 7.6);
    const wingShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(11.9, 0), new THREE.Vector2(2.6, 18), new THREE.Vector2(0, 20)]);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.6, bevelEnabled: false }), M.white); w.scale.x = s; w.position.set(s * 2.5, 6, 5.2); orb.add(w); }
    const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(8, 0), new THREE.Vector2(3, 8), new THREE.Vector2(0, 8)]), { depth: 0.5, bevelEnabled: false }), M.white);
    tail.rotation.y = -Math.PI / 2; tail.position.set(0.25, 6, 10.4); tail.rotation.x = 0; orb.add(tail);
    const ssme = [[0, 9.6], [-1.3, 8.2], [1.3, 8.2]]; ssme.forEach(([x, z]) => nozzle(orb, 1.15, 3, x, 6, z));
    return { g, H: 56.1, D: 23.8, sd: 8.4, stages: [
      { lit: [{ x: -6, y: 0, z: 0, r: 1.9, prop: 'solid' }, { x: 6, y: 0, z: 0, r: 1.9, prop: 'solid' }, ...ssme.map(([x, z]) => ({ x, y: 3, z, r: 1.15, prop: 'hydrolox' }))], drop: [boost] },
      { lit: ssme.map(([x, z]) => ({ x, y: 3, z, r: 1.15, prop: 'hydrolox' })) },
    ] };
  },
  pslvxl() { // PSLV-XL: solid core + 6 PSOM-XL strap-ons (4 lit on the ground, 2 in the air), 44.4 m
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(), b4 = new THREE.Group(), b2 = new THREE.Group(); g.add(core, upper, b4, b2);
    let y = seg(core, 1.4, 1.4, 20.3, M.cream, 0); seg(core, 1.41, 1.41, 0.6, M.grey, 6); seg(core, 1.41, 1.41, 0.6, M.grey, 13); nozzle(core, 1.0, 1.8, 0, 0, 0);
    y = seg(upper, 1.4, 1.4, 12.8, M.white, y); seg(upper, 1.41, 1.41, 1.2, M.grey, y - 1.2);
    y = seg(upper, 1.4, 1.0, 1.5, M.white, y); y = seg(upper, 1.0, 1.0, 3.5, M.white, y); y = seg(upper, 1.0, 1.6, 1.2, M.white, y); y = seg(upper, 1.6, 1.6, 4.5, M.white, y); y = ogive(upper, 1.6, 3.4, M.white, y);
    ring(6, 1.95, Math.PI / 6).forEach(([x, z], i) => { const grp = i % 3 === 2 ? b2 : b4; const by = seg(grp, 0.5, 0.5, 12.5, M.white, 0.6, x, z, 20); ogive(grp, 0.5, 1.6, M.black, by, x, z); nozzle(grp, 0.45, 1, x, 0.6, z); });
    const pso = (k) => ring(6, 1.95, Math.PI / 6).filter((_, i) => (i % 3 === 2) === k).map(([x, z]) => ({ x, y: -0.4, z, r: 0.45, prop: 'solid' }));
    return { g, H: y, D: 4.9, stages: [
      { lit: [{ x: 0, y: -1.8, z: 0, r: 1.0, prop: 'solid' }, ...pso(false)], drop: [b4] },
      { lit: [{ x: 0, y: -1.8, z: 0, r: 1.0, prop: 'solid' }, ...pso(true)], drop: [b2] },
      { lit: [{ x: 0, y: -1.8, z: 0, r: 1.0, prop: 'solid' }], drop: [core] },
      { lit: [{ x: 0, y: 20.3, z: 0, r: 0.6, prop: 'hypergolic' }] }, // PS2 Vikas engine
    ] };
  },
  lvm3() { // LVM3 / GSLV Mk III: two S200 boosters lift it off; the L110 core lights in the air. 43.4 m
    const g = new THREE.Group(), core = new THREE.Group(), upper = new THREE.Group(), boost = new THREE.Group(); g.add(core, upper, boost);
    let y = seg(core, 2.0, 2.0, 21.4, M.cream, 0); nozzle(core, 0.7, 1.8, -0.8, 0, 0); nozzle(core, 0.7, 1.8, 0.8, 0, 0);
    y = seg(upper, 2.0, 2.0, 13.5, M.white, y); seg(upper, 2.01, 2.01, 0.8, M.grey, y - 6);
    y = seg(upper, 2.0, 2.5, 1.5, M.white, y); y = seg(upper, 2.5, 2.5, 4, M.white, y); y = ogive(upper, 2.5, 5.5, M.white, y);
    for (const s of [-1, 1]) { const x = s * 3.8; let by = seg(boost, 1.6, 1.6, 22, M.white, 0.5, x); seg(boost, 1.61, 1.61, 0.7, M.grey, 8, x); seg(boost, 1.61, 1.61, 0.7, M.grey, 15, x); ogive(boost, 1.6, 3.4, M.white, by, x); nozzle(boost, 1.4, 2.4, x, 0.5, 0); }
    return { g, H: y, D: 11.2, stages: [
      { lit: [{ x: -3.8, y: -1.9, z: 0, r: 1.4, prop: 'solid' }, { x: 3.8, y: -1.9, z: 0, r: 1.4, prop: 'solid' }], drop: [boost] },
      { lit: [{ x: -0.8, y: -1.8, z: 0, r: 0.7, prop: 'hypergolic' }, { x: 0.8, y: -1.8, z: 0, r: 0.7, prop: 'hypergolic' }], drop: [core] },
      { lit: [{ x: 0, y: 21.4, z: 0, r: 0.5, prop: 'hydrolox' }] }, // C25 cryogenic stage
    ] };
  },
};
export const ROCKET_NAMES = { saturn5: 'Saturn V', atlasAgena: 'Atlas–Agena', atlasCentaur: 'Atlas–Centaur', titan3e: 'Titan IIIE / Centaur', delta2: 'Delta II', atlasV401: 'Atlas V 401', atlasV541: 'Atlas V 541', shuttle: 'Space Shuttle', pslvxl: 'PSLV-XL', lvm3: 'LVM3' };

// flame look by propellant
const FLAME = {
  kerolox: { core: 0xfff0c0, outer: 0xff8a2a, len: 7, op: 0.95, smoke: 1 },
  solid: { core: 0xfffbe8, outer: 0xffc070, len: 8, op: 1, smoke: 1.8 },
  hydrolox: { core: 0xd8e8ff, outer: 0x6f9cff, len: 5, op: 0.45, smoke: 0.35 },
  hypergolic: { core: 0xffd6b0, outer: 0xff7a4a, len: 5, op: 0.55, smoke: 0.5 },
};

// ---------------------------------------------------------------- the launch scene
export function createLaunch({ renderer }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 60000);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4), hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a4436, 0.8);
  const fireLight = new THREE.PointLight(0xffa860, 0, 0, 1.4);
  scene.add(sun, sun.target, hemi, fireLight);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, dark: { value: 0 }, stars: { value: 0 }, sunDir: { value: V(0, 1, 0) } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top, hor, sunDir; uniform float dark, stars; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float e = max(d.y, 0.0);
        vec3 c = mix(hor, top, pow(e, 0.45));
        c += vec3(1.0, 0.85, 0.6) * pow(max(dot(d, sunDir), 0.0), 60.0) * 0.6 * (1.0 - dark);
        c = mix(c, vec3(0.0, 0.004, 0.015), dark);
        vec3 q = floor(d * 400.0); float s = step(0.9975, h(q)) * max(stars, dark) * smoothstep(-0.05, 0.1, d.y);
        c += vec3(s);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const land = new THREE.Mesh(new THREE.CircleGeometry(9000, 96), new THREE.MeshStandardMaterial({ color: 0x5c6146, roughness: 1 }));
  land.rotation.x = -Math.PI / 2; land.position.set(0, 0, 7000); land.receiveShadow = true;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshStandardMaterial({ color: 0x1d3446, roughness: 0.25, metalness: 0.3 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.6;
  scene.add(land, sea);
  const padGroup = new THREE.Group(); scene.add(padGroup);

  // smoke / exhaust (soft points)
  const N = 2600;
  const sm = { pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N), alpha: new Float32Array(N), age: new Float32Array(N), life: new Float32Array(N), grow: new Float32Array(N), next: 0 };
  const smGeo = new THREE.BufferGeometry();
  ['position', 'aColor', 'aSize', 'aAlpha'].forEach((k, i) => smGeo.setAttribute(k, new THREE.BufferAttribute([sm.pos, sm.col, sm.size, sm.alpha][i], i < 2 ? 3 : 1).setUsage(THREE.DynamicDrawUsage)));
  const smMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uScale: { value: 500 } },
    vertexShader: 'attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aAlpha > 0.0 ? clamp(aSize * uScale / max(-mv.z, 1.0), 0.0, 900.0) : 0.0; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); float a = smoothstep(0.5, 0.05, d) * vA; if (a < 0.004) discard; float shade = 0.82 + 0.3 * (0.5 - p.y); gl_FragColor = vec4(vC * shade, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const smoke = new THREE.Points(smGeo, smMat); smoke.frustumCulled = false; scene.add(smoke);
  function puff(p, v, size, grow, life, col) {
    const i = sm.next; sm.next = (sm.next + 1) % N;
    sm.pos.set([p.x, p.y, p.z], i * 3); sm.vel.set([v.x, v.y, v.z], i * 3); sm.col.set(col, i * 3);
    sm.size[i] = size; sm.grow[i] = grow; sm.age[i] = 0; sm.life[i] = life;
  }

  let rocket = null, flames = [], run = null, active = false;
  const fireMat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

  function skyFor(kind) {
    const S = {
      day: { top: 0x2f6fc8, hor: 0xbcd6f0, sun: [0.5, 0.75, 0.3], si: 2.6, hemi: 0.9, stars: 0 },
      overcast: { top: 0x7c8794, hor: 0xb6bcc2, sun: [0.3, 0.9, 0.2], si: 0.9, hemi: 1.2, stars: 0 },
      dawn: { top: 0x23365e, hor: 0xf0a868, sun: [0.9, 0.08, -0.3], si: 1.3, hemi: 0.5, stars: 0.4 },
      dusk: { top: 0x2b3866, hor: 0xf4925a, sun: [-0.9, 0.1, 0.3], si: 1.2, hemi: 0.5, stars: 0.3 },
      night: { top: 0x02040b, hor: 0x0b1424, sun: [0.3, 0.6, 0.4], si: 0.12, hemi: 0.15, stars: 1 },
    };
    return S[kind] || S.day;
  }
  function buildPad(H, D, night) {
    padGroup.clear();
    const conc = new THREE.MeshStandardMaterial({ color: 0x8e8b84, roughness: 0.95 });
    const padW = Math.max(D * 6, 60);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, 5, padW), conc); pad.position.y = 2.5; pad.receiveShadow = true; padGroup.add(pad);
    const trench = new THREE.Mesh(new THREE.BoxGeometry(D * 1.4, 0.2, padW * 0.9), new THREE.MeshStandardMaterial({ color: 0x1c1b1a, roughness: 1 })); trench.position.y = 5.02; padGroup.add(trench);
    // umbilical / service tower: a lattice
    const TH = H * 1.08, TW = Math.max(D * 0.9, 6), tx = -(D / 2 + TW / 2 + 3);
    const tm = new THREE.MeshStandardMaterial({ color: night ? 0x8a3a2a : 0xb2482f, roughness: 0.7, metalness: 0.3 });
    const rodM = (a, b, r) => { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), tm); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; return m; };
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [tx + (x * TW) / 2, (z * TW) / 2]);
    const r0 = Math.max(TW * 0.03, 0.18), step = TW;
    for (const [x, z] of c) padGroup.add(rodM(V(x, 5, z), V(x, 5 + TH, z), r0 * 1.6));
    for (let y = 5; y <= 5 + TH; y += step) for (let i = 0; i < 4; i++) { const [x0, z0] = c[i], [x1, z1] = c[(i + 1) % 4]; padGroup.add(rodM(V(x0, y, z0), V(x1, y, z1), r0)); if (y + step <= 5 + TH) padGroup.add(rodM(V(x0, y, z0), V(x1, y + step, z1), r0 * 0.7)); }
    for (let k = 1; k <= 3; k++) { const y = 5 + (TH * k) / 4; padGroup.add(rodM(V(tx + TW / 2, y, 0), V(-D * 0.45, y, 0), r0 * 1.2)); } // swing arms
    // water tower and lightning masts for scale
    const wt = new THREE.Mesh(new THREE.SphereGeometry(Math.max(D * 0.6, 5), 20, 12), new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 0.6 })); wt.position.set(padW * 1.4, Math.max(D * 3, 30), padW * 0.8); padGroup.add(wt, rodM(V(padW * 1.4, 0, padW * 0.8), V(padW * 1.4, Math.max(D * 3, 30), padW * 0.8), 0.6));
    padGroup.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  }
  function makeFlames(stage, D) {
    flames.forEach((f) => f.parent && f.parent.remove(f)); flames = [];
    for (const s of stage.lit) {
      const F = FLAME[s.prop], f = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.ConeGeometry(s.r * 1.3, s.r * F.len * 2, 24, 1, true).translate(0, -s.r * F.len, 0), fireMat(F.outer, F.op * 0.55));
      const core = new THREE.Mesh(new THREE.ConeGeometry(s.r * 0.85, s.r * F.len, 20, 1, true).translate(0, -s.r * F.len * 0.5, 0), fireMat(F.core, F.op));
      f.add(outer, core);
      if (s.prop === 'hydrolox') for (let k = 1; k <= 3; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(s.r * 0.35, 12, 8), fireMat(0xf0f6ff, 0.5)); d.scale.y = 0.6; d.position.y = -s.r * 1.4 * k; f.add(d); } // shock diamonds
      f.position.set(s.x, s.y, s.z); f.userData = { s, F }; f.scale.setScalar(0.01);
      rocket.g.add(f); flames.push(f);
    }
  }
  const tmpV = V(), tmpQ = new THREE.Quaternion();
  function detach(objs, vel) {
    for (const o of objs) {
      o.updateMatrixWorld(true); o.matrixWorld.decompose(tmpV, tmpQ, V());
      const holder = new THREE.Group(); holder.position.copy(tmpV); holder.quaternion.copy(tmpQ);
      const c = o.clone(true); c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1); holder.add(c);
      o.visible = false; scene.add(holder);
      const out = tmpV.clone().sub(rocket.g.position).setY(0); if (out.lengthSq() < 1) out.set(1, 0, 0); out.normalize();
      run.debris.push({ obj: holder, vel: vel.clone().multiplyScalar(0.92).addScaledVector(out, rocket.D * 0.4), spin: V((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6) });
    }
  }

  function play(mission, { onCaption = () => {}, onProgress = () => {} } = {}) {
    stop();
    const kind = mission.rocket in ROCKETS ? mission.rocket : 'atlasCentaur';
    rocket = ROCKETS[kind](); rocket.kind = kind;
    rocket.g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const H = rocket.H, D = rocket.D;
    rocket.g.position.set(0, 5, 0); scene.add(rocket.g);
    const look = skyFor(mission.launch.sky), night = mission.launch.sky === 'night';
    sky.material.uniforms.top.value.setHex(look.top); sky.material.uniforms.hor.value.setHex(look.hor);
    sky.material.uniforms.stars.value = look.stars; sky.material.uniforms.dark.value = 0;
    const sd = V(...look.sun).normalize(); sky.material.uniforms.sunDir.value.copy(sd);
    sun.position.copy(sd).multiplyScalar(400); sun.intensity = look.si; hemi.intensity = look.hemi;
    hemi.color.setHex(look.top).lerp(new THREE.Color(0xffffff), 0.5);
    land.material.color.setHex(night ? 0x1f2219 : 0x5c6146); sea.material.color.setHex(night ? 0x060c14 : 0x1d3446);
    renderer.shadowMap.enabled = true;
    sun.castShadow = !night; Object.assign(sun.shadow.camera, { left: -H, right: H, top: H * 1.4, bottom: -H * 0.3, near: 1, far: 1200 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.mapSize.set(2048, 2048);
    buildPad(H, D, night);
    sm.age.fill(1); sm.life.fill(0); sm.alpha.fill(0);
    smMat.uniforms.uScale.value = (innerHeight * renderer.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    run = { t: 0, dur: 12, H, D, sd: Math.min(rocket.sd || D, 10), stage: 0, vel: V(), y: 0, pitch: 0, debris: [], night, smokeCol: night ? [0.55, 0.42, 0.33] : [0.93, 0.92, 0.9], caps: [0, 0], onCaption, onProgress, mission, shake: 0, camPos: V(), done: null };
    makeFlames(rocket.stages[0], D);
    active = true;
    onCaption(mission.timeline[0]);
    return new Promise((res) => { run.done = res; });
  }
  function stageTo(i) {
    const prev = rocket.stages[run.stage];
    if (prev && prev.drop) detach(prev.drop, run.vel);
    run.stage = i; makeFlames(rocket.stages[i], run.D);
    flames.forEach((f) => f.scale.setScalar(0.3));
  }
  function update(dt) {
    if (!active) return;
    const r = run, t = (r.t += dt), H = r.H, D = r.D, ign = 1.6, lift = 2.7;
    r.onProgress(t / r.dur);
    // ignition and climb (cinematic time: about 2.5 minutes of ascent compressed into ~9 seconds)
    const grow = sstep(ign, ign + 0.9, t);
    if (t > lift) {
      const tt = t - lift, acc = H * (0.11 + 0.05 * tt * tt);
      r.vel.y += acc * dt * Math.cos(r.pitch); r.vel.x += acc * dt * Math.sin(r.pitch);
      r.pitch = 0.55 * sstep(2.6, 8.5, tt);
    }
    rocket.g.position.addScaledVector(r.vel, dt);
    rocket.g.rotation.z = -r.pitch;
    // staging: boosters and lower stages drop on a fixed schedule
    const n = rocket.stages.length, times = n === 4 ? [6.2, 7.6, 9.6] : n === 3 ? [6.8, 9.4] : [8.6];
    for (let k = 0; k < times.length; k++) if (r.stage === k && t > times[k] && k + 1 < n) { stageTo(k + 1); if (k === 0 && n > 2) r.onCaption(r.mission.timeline[1]); }
    if (!r.caps[1] && t > 7) { r.caps[1] = 1; if (n <= 2) r.onCaption(r.mission.timeline[1]); }
    // flames flicker and widen as the air thins
    const alt = sstep(5, 11, t);
    for (const f of flames) {
      const { F } = f.userData, k = (t < lift ? grow : 1) * (0.92 + Math.random() * 0.16);
      f.scale.set(k * (1 + alt * 1.6), k * (1 + alt * 0.8), k * (1 + alt * 1.6));
      f.children.forEach((c, i) => { if (i < 2) c.material.opacity = (i ? F.op : F.op * 0.55) * (1 - alt * 0.35); });
    }
    fireLight.position.copy(rocket.g.position).add(V(0, -2, 0));
    fireLight.intensity = (grow * (r.night ? 9 : 3) * H * H) * (1 - sstep(6, 10, t)) * (0.85 + Math.random() * 0.3);
    // smoke: a ground cloud pushed out of the flame trench, then a trail
    if (t > ign && t < 11) {
      const base = rocket.g.position, F = FLAME[rocket.stages[r.stage].lit[0].prop], high = base.y - 5 > H * 0.6;
      const count = Math.round((high ? 4 : 14) * F.smoke * grow);
      for (let i = 0; i < count; i++) {
        const S = r.sd; // the flame trench throws most of the cloud away from the cameras (toward −z)
        if (!high) { const away = Math.random() < 0.8, a = (Math.random() - 0.5) * 1.2; puff(V(base.x + (Math.random() - 0.5) * S, 6, base.z + (Math.random() - 0.5) * S), V(Math.sin(a) * S * 1.2, S * (0.15 + Math.random() * 0.5), (away ? -1 : 0.5) * S * (2 + Math.random() * 3)), S * (0.8 + Math.random()), S * 0.9, 9, r.smokeCol); }
        else { const p = base.clone().add(V(Math.sin(r.pitch) * -2, -2 - Math.random() * 4, (Math.random() - 0.5) * S * 0.3)); puff(p, V((Math.random() - 0.5) * 2, -r.vel.y * 0.05, (Math.random() - 0.5) * 2), S * (0.5 + Math.random() * 0.4), S * 0.25, 10, r.smokeCol); }
      }
      if (t < lift + 2) for (let i = 0; i < 3; i++) puff(V((Math.random() - 0.5) * r.sd * 2, 5 + Math.random() * 6, (Math.random() - 0.5) * r.sd * 2), V(0, r.sd * 0.4, 0), r.sd * 0.6, r.sd * 0.4, 6, [1, 1, 1]); // steam from the deluge water
    }
    for (let i = 0; i < N; i++) {
      if (sm.age[i] >= sm.life[i]) { sm.alpha[i] = 0; continue; }
      sm.age[i] += dt; const k = i * 3, drag = Math.exp(-dt * 0.9);
      sm.vel[k] *= drag; sm.vel[k + 1] = sm.vel[k + 1] * drag + D * 0.02 * dt; sm.vel[k + 2] *= drag;
      sm.pos[k] += sm.vel[k] * dt; sm.pos[k + 1] = Math.max(sm.pos[k + 1] + sm.vel[k + 1] * dt, 3); sm.pos[k + 2] += sm.vel[k + 2] * dt;
      sm.size[i] += sm.grow[i] * dt;
      const a = sm.age[i] / sm.life[i]; sm.alpha[i] = 0.55 * sstep(0, 0.08, a) * (1 - sstep(0.6, 1, a));
    }
    ['position', 'aColor', 'aSize', 'aAlpha'].forEach((k) => { smGeo.attributes[k].needsUpdate = true; });
    // shed stages tumble away
    for (const d of r.debris) { d.vel.y -= 9.8 * dt * 6; d.obj.position.addScaledVector(d.vel, dt); d.obj.rotation.x += d.spin.x * dt; d.obj.rotation.z += d.spin.z * dt; }
    // the sky goes black as it climbs
    sky.material.uniforms.dark.value = 0.92 * sstep(6.5, 11.2, t);
    hemi.intensity = skyFor(r.mission.launch.sky).hemi * (1 - 0.7 * sstep(6.5, 11, t));
    // camera: wide establishing shot → low tracking shot → chase
    const rp = rocket.g.position, mid = rp.clone().add(V(Math.sin(r.pitch) * H * 0.45, Math.cos(r.pitch) * H * 0.45, 0));
    if (t < 3.6) { camera.fov = 42; camera.position.set(H * 1.6 - t * H * 0.05, H * 0.14, H * 2.2 - t * H * 0.08); camera.lookAt(0, 5 + H * 0.45, 0); }
    else if (t < 6.4) { camera.fov = 34; camera.position.set(H * 0.7, 5 + H * 0.04, H * 1.25); camera.lookAt(mid); }
    else {
      camera.fov = 48; const want = rp.clone().add(V(H * 0.9, -H * 0.35, H * 1.25));
      if (!r.chase) { r.chase = true; r.camPos.copy(want); }
      r.camPos.lerp(want, 1 - Math.exp(-dt * 3)); camera.position.copy(r.camPos); camera.lookAt(mid);
    }
    r.shake = t > ign && t < 6.4 ? (t < lift + 1.5 ? 1 : 0.4) * grow : 0;
    if (r.shake) camera.position.add(V((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(H * 0.0035 * r.shake));
    camera.far = 60000; camera.updateProjectionMatrix();
    sun.target.position.set(0, 0, 0);
    if (t >= r.dur) finish();
  }
  function render() { if (active) renderer.render(scene, camera); }
  function finish() { if (!active) return; active = false; const d = run && run.done; cleanup(); if (d) d(); }
  function cleanup() {
    if (rocket) { scene.remove(rocket.g); rocket.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    if (run) run.debris.forEach((d) => { scene.remove(d.obj); });
    flames = []; rocket = null;
  }
  function stop() { if (active) finish(); }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); smMat.uniforms.uScale.value = (innerHeight * renderer.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); }
  return { get active() { return active; }, play, update, render, stop: finish, resize };
}

// a launch vehicle on its own, for the story's Liftoff chapter
export function buildRocket(kind) {
  const r = (ROCKETS[kind] || ROCKETS.atlasCentaur)();
  r.g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return r;
}
