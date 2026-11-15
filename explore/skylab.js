/* Spacefire Explorer — Skylabs: the repair bases on the Moon and Mars.
   1. Hand-built models for every part of the two bases, in metres, at real scale, drawn from NASA /
      ESA concepts: 3D-printed regolith habitat, Mars Ice Home, vertical solar towers, fission and
      Kilopower reactors, ice mine, MOXIE-scale oxygen plant, Rodwell ice well, greenhouse,
      pressurised rover, landing pads and a sky-crane recovery hopper.
   2. The repair bay: an indoor scene with two robot arms, a gantry crane, a scanning ring and a
      parts table, where each recovered machine is diagnosed and repaired step by step.
   Surface detail (panel seams, printed layers, quilted ice, tiles, signage) is drawn into canvas
   textures the first time a base is built. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MAT, makeCanvas, toTex, normalFrom, seeded } from './builders.js';
import { sfx, loop as sfxLoop, play as sfxPlay, narrate, isSpeaking } from './audio.js';

const TAU = Math.PI * 2, UP = new THREE.Vector3(0, 1, 0);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lazy = (f) => { let v; return () => v || (v = f()); };
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

// ---------------------------------------------------------------- geometry helpers
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
const cyl = (r1, r2, h, mat, x, y, z, seg = 32, open = false) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), mat, x, y, z);
const sph = (r, mat, x, y, z, ws = 32, hs = 16) => mesh(new THREE.SphereGeometry(r, ws, hs), mat, x, y, z);
function orient(m, a, b) { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
const rod = (a, b, r, mat, seg = 8) => orient(new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg), mat), a, b);
const tube = (pts, r, mat, seg = 48, rs = 8) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs), mat);
const lathe = (pf, mat, seg = 64, p0 = 0, pl = TAU) => new THREE.Mesh(new THREE.LatheGeometry(pf.map(([x, y]) => new THREE.Vector2(x, y)), seg, p0, pl), mat);
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function roundBox(w, h, d, r, mat, x = 0, y = 0, z = 0) { // rounded in x/y, bevelled along z
  const b = Math.min(r * 0.6, d * 0.25, w * 0.2, h * 0.2);
  const geo = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(Math.min(r, w / 2, h / 2) - b, 0.002)), { depth: Math.max(d - 2 * b, 0.001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, -Math.max(d - 2 * b, 0.001) / 2);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.3); // panels about 0.8 m across
  return mesh(geo, mat, x, y, z);
}
function shadows(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } }); return g; }
function rodsInst(pairs, r, mat, seg = 6) { // many thin struts as one draw call
  const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r, 1, seg), mat, pairs.length), o = new THREE.Object3D();
  pairs.forEach(([a, b], i) => { const d = b.clone().sub(a), L = d.length(); o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); o.scale.set(1, L, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  return m;
}
function truss(h, r, step, mat, rr = 0.035, rd = 0.02) { // a triangular lattice mast along +y
  const legs = [0, 1, 2].map((k) => { const a = (k / 3) * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; }), pairs = [];
  const P = (k, y) => V(legs[k % 3][0], y, legs[k % 3][1]);
  for (let k = 0; k < 3; k++) pairs.push([P(k, 0), P(k, h)]);
  const g = new THREE.Group(); g.add(rodsInst(pairs, rr, mat, 8));
  const d = [];
  for (let y = 0, i = 0; y + step <= h + 1e-6; y += step, i++) for (let k = 0; k < 3; k++) { d.push([P(k, y), P(k + 1, y + step)]); d.push([P(k, y), P(k + 1, y)]); }
  g.add(rodsInst(d, rd, mat));
  return g;
}
const glowMat = (r, gg, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, gg, b) }); // > 1 = glows under tone mapping

// ---------------------------------------------------------------- canvas textures (built on first use)
const TX = lazy(() => {
  const r = seeded(4242);
  const rep = (t, x, y) => { t.repeat.set(x, y); return t; };
  // hull panels: colour variation + seams and rivets (height → normal map)
  const hullC = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = '#f2f1ee'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) for (let k = -1; k < 2; k++) {
      const x = ((k + (row % 2) * 0.5) * w) / 2, v = r();
      g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.025 + r() * 0.05})` : `rgba(255,255,255,${0.04 + r() * 0.05})`; g.fillRect(x, (row * h) / 4, w / 2, h / 4);
    }
    for (let i = 0; i < 40; i++) { const x = r() * w, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,55,50,0)'); gr.addColorStop(1, 'rgba(60,55,50,.07)'); g.fillStyle = gr; g.fillRect(x, r() * h * 0.5, 2 + r() * 8, h); }
    g.strokeStyle = 'rgba(40,40,40,.28)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke(); }
    for (let row = 0; row < 4; row++) for (let k = 0; k <= 2; k++) { const x = ((k + (row % 2) * 0.5) * w) / 2; g.beginPath(); g.moveTo(x, (row * h) / 4); g.lineTo(x, ((row + 1) * h) / 4); g.stroke(); }
  });
  const seamH = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3c3c3c'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke(); }
    for (let row = 0; row < 4; row++) for (let k = 0; k <= 2; k++) { const x = ((k + (row % 2) * 0.5) * w) / 2; g.beginPath(); g.moveTo(x, (row * h) / 4); g.lineTo(x, ((row + 1) * h) / 4); g.stroke(); }
    g.fillStyle = '#b4b4b4';
    for (let i = 0; i <= 4; i++) for (let x = 6; x < w; x += 18) { g.beginPath(); g.arc(x, ((i * h) / 4 + 9) % h, 1.8, 0, TAU); g.fill(); }
  });
  // corrugated hangar skin
  const corrH = makeCanvas(32, 256, (g, w, h) => { for (let y = 0; y < h; y++) { const v = (128 + 110 * Math.sin((y / h) * TAU * 8)) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); } });
  // 3D-printed regolith: bead layers
  const printC = makeCanvas(512, 512, (g, w, h) => {
    g.fillStyle = '#9b978f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = (110 + r() * 110) | 0; g.fillStyle = `rgba(${v},${v - 3},${v - 8},.22)`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    for (let y = 0; y < h; y += 10.667) { g.fillStyle = 'rgba(40,38,34,.16)'; g.fillRect(0, y, w, 1.6); }
  });
  const printH = makeCanvas(512, 512, (g, w, h) => {
    const L = 10.667;
    for (let y = 0; y < h; y++) { const t = (y % L) / L, v = (70 + 150 * Math.sin(t * Math.PI) ** 0.6) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); }
    for (let i = 0; i < 5000; i++) { const v = (r() * 255) | 0; g.fillStyle = `rgba(${v},${v},${v},.25)`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2); }
  });
  // regolith for berms (lumpy)
  const lumpH = makeCanvas(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { const x = r() * w, y = r() * h, s = 2 + r() * 9, gr = g.createRadialGradient(x, y, 0, x, y, s), v = r() < 0.5 ? 40 : 220; gr.addColorStop(0, `rgba(${v},${v},${v},.5)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); } });
  // quilted ice cells (Ice Home)
  const quiltH = makeCanvas(512, 256, (g, w, h) => {
    g.fillStyle = '#202020'; g.fillRect(0, 0, w, h);
    const cx = 8, cy = 4;
    for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) { const x = (i + 0.5) * (w / cx), y = (j + 0.5) * (h / cy), gr = g.createRadialGradient(x, y, 0, x, y, (w / cx) * 0.62); gr.addColorStop(0, '#f0f0f0'); gr.addColorStop(0.7, '#9a9a9a'); gr.addColorStop(1, '#202020'); g.fillStyle = gr; g.fillRect(x - w / cx / 2, y - h / cy / 2, w / cx, h / cy); }
  });
  // hazard stripes
  const hazard = makeCanvas(256, 64, (g, w, h) => { g.fillStyle = '#e8b52a'; g.fillRect(0, 0, w, h); g.fillStyle = '#17181b'; for (let x = -h; x < w + h; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); } });
  // bay floor: 2 × 2 deck plates per tile
  const floorC = makeCanvas(1024, 1024, (g, w, h) => {
    g.fillStyle = '#4a4e55'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = r(); g.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.05})`; g.fillRect(i * 512, j * 512, 512, 512); }
    for (let i = 0; i < 220; i++) { g.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.lineWidth = 0.6 + r(); g.beginPath(); const x = r() * w, y = r() * h, a = r() * TAU, l = 20 + r() * 140; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, s = 30 + r() * 120, gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(20,18,16,.12)'); gr.addColorStop(1, 'rgba(20,18,16,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }
    g.strokeStyle = '#1b1d21'; g.lineWidth = 6; for (const p of [0, 512, 1024]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); }
    g.fillStyle = '#2b2e33'; for (const x of [40, 472, 552, 984]) for (const y of [40, 472, 552, 984]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
  });
  const floorH = makeCanvas(512, 512, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); g.strokeStyle = '#303030'; g.lineWidth = 5; for (const p of [0, 256, 512]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke(); } for (let i = 0; i < 2400; i++) { g.fillStyle = 'rgba(180,180,180,.5)'; g.fillRect(r() * w, r() * h, 1, 1); } });
  const floorR = makeCanvas(256, 256, (g, w, h) => { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { const v = r() < 0.6 ? 50 : 170; g.strokeStyle = `rgba(${v},${v},${v},.35)`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 90, y + (r() - 0.5) * 90); g.stroke(); } });
  // radiation warning (trefoil)
  const trefoil = makeCanvas(256, 256, (g, w, h) => {
    g.fillStyle = '#e8b52a'; g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 10, h - 22); g.lineTo(10, h - 22); g.closePath(); g.fill();
    g.strokeStyle = '#17181b'; g.lineWidth = 10; g.stroke(); g.fillStyle = '#17181b';
    const cx = w / 2, cy = h * 0.6; g.beginPath(); g.arc(cx, cy, 11, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * TAU) / 3; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.52) * 18, cy + Math.sin(a - 0.52) * 18); g.arc(cx, cy, 62, a - 0.52, a + 0.52); g.arc(cx, cy, 18, a + 0.52, a - 0.52, true); g.fill(); }
  });
  const T = {
    hull: toTex(hullC), seamN: normalFrom(seamH, 2.4), corrN: normalFrom(corrH, 2.2), print: toTex(printC), printN: normalFrom(printH, 2.6), lumpN: normalFrom(lumpH, 2.2),
    quiltN: normalFrom(quiltH, 3.2), hazard: toTex(hazard), floor: toTex(floorC), floorN: normalFrom(floorH, 2), floorR: toTex(floorR, false), trefoil: toTex(trefoil),
    rep: (t, x, y) => { const c = t.clone(); c.needsUpdate = true; return rep(c, x, y); },
  };
  return T;
});

// text panels: signage on the bases and in the bay
function signTex(lines, { w = 1024, h = 256, bg = null, fg = '#f2eee6', accent = '#3fd0bc', size = 92 } = {}) {
  return toTex(makeCanvas(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const [a, b] = lines;
    g.fillStyle = fg; g.font = `600 ${size}px Geist, "Segoe UI", system-ui, sans-serif`; if ('letterSpacing' in g) g.letterSpacing = `${(size * 0.12) | 0}px`;
    g.fillText(a, w / 2, b ? h * 0.4 : h / 2);
    if (b) { g.fillStyle = accent; g.font = `500 ${(size * 0.42) | 0}px "Geist Mono", Consolas, monospace`; if ('letterSpacing' in g) g.letterSpacing = `${(size * 0.1) | 0}px`; g.fillText(b, w / 2, h * 0.78); }
  }));
}
function padTex(mars, num) {
  return toTex(makeCanvas(1024, 1024, (g, w, h) => {
    const r = seeded(num * 31);
    g.fillStyle = mars ? '#5b4334' : '#4b4a47'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) { const v = (r() * 60) | 0; g.fillStyle = `rgba(${v},${v},${v},.18)`; g.fillRect(r() * w, r() * h, 2, 2); }
    for (let i = 0; i < 18; i++) { const a = r() * TAU, d = r() * 400; g.fillStyle = 'rgba(10,10,10,.08)'; g.beginPath(); g.arc(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 40 + r() * 90, 0, TAU); g.fill(); } // scorch marks
    const C = 512;
    g.strokeStyle = 'rgba(230,226,218,.85)'; g.lineWidth = 14; g.beginPath(); g.arc(C, C, 470, 0, TAU); g.stroke();
    g.setLineDash([46, 30]); g.lineWidth = 8; g.beginPath(); g.arc(C, C, 430, 0, TAU); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(232,181,42,.9)'; g.lineWidth = 18; g.beginPath(); g.arc(C, C, 190, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(232,181,42,.9)'; for (let k = 0; k < 4; k++) { g.save(); g.translate(C, C); g.rotate((k * Math.PI) / 2); g.fillRect(-9, 230, 18, 150); g.restore(); }
    g.fillStyle = 'rgba(230,226,218,.9)'; g.font = '700 150px Geist, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num).padStart(2, '0'), C, C + 6);
  }));
}

// ---------------------------------------------------------------- materials (one palette per world)
const std = (o) => new THREE.MeshStandardMaterial(o);
const PAL = {};
function pal(mars) {
  const k = mars ? 'mars' : 'moon'; if (PAL[k]) return PAL[k];
  const T = TX(), tint = (hex) => new THREE.Color(hex).multiply(new THREE.Color(mars ? 0xf0dccb : 0xffffff));
  const accent = mars ? 0xe0662f : 0x2fb8a6;
  const cells = (rx, ry) => { const m = MAT.cells.map.clone(); m.needsUpdate = true; m.repeat.set(rx, ry); return std({ color: 0xffffff, map: m, metalness: 0.55, roughness: 0.24, side: THREE.DoubleSide }); };
  const P = PAL[k] = {
    mars, accentHex: accent,
    hull: std({ color: tint(0xe9e7e2), map: T.rep(T.hull, 1, 1), normalMap: T.rep(T.seamN, 1, 1), normalScale: new THREE.Vector2(0.55, 0.55), roughness: 0.5, metalness: 0.12 }),
    hullBig: std({ color: tint(0xe4e2dc), map: T.rep(T.hull, 3, 2), normalMap: T.rep(T.seamN, 3, 2), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide }),
    plain: std({ color: tint(0xe7e5df), roughness: 0.55, metalness: 0.1 }),
    plainDS: std({ color: tint(0xe7e5df), roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }),
    corr: std({ color: tint(0xd9dadc), normalMap: T.rep(T.corrN, 1, 30), normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.42, metalness: 0.55, side: THREE.DoubleSide }),
    accent: std({ color: accent, roughness: 0.42, metalness: 0.2 }),
    metal: std({ color: 0xa3a8b0, metalness: 0.85, roughness: 0.32 }),
    darkMetal: std({ color: 0x3b4048, metalness: 0.7, roughness: 0.42 }),
    nozzle: std({ color: 0x3a3c40, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
    rubber: std({ color: 0x1c1d20, roughness: 0.92, metalness: 0 }),
    yellow: std({ color: 0xe2b23a, roughness: 0.48, metalness: 0.25 }),
    hazard: std({ map: T.rep(T.hazard, 2, 1), roughness: 0.55 }),
    hazardV: std({ map: (() => { const t = T.rep(T.hazard, 1, 6); t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t; })(), roughness: 0.55 }),
    glass: std({ color: 0x0b1118, metalness: 0.9, roughness: 0.06 }),
    win: std({ color: 0x0d0f12, emissive: mars ? 0xffc48a : 0xffcf98, emissiveIntensity: 0.85, roughness: 0.12, metalness: 0.6 }),
    lamp: glowMat(3.6, 3.4, 3.1), lampWarm: glowMat(3.4, 2.6, 1.6), red: glowMat(3.2, 0.25, 0.2), green: glowMat(0.3, 3, 0.9), amber: glowMat(3.2, 1.6, 0.2),
    accentGlow: mars ? glowMat(3.2, 1.3, 0.5) : glowMat(0.5, 3, 2.6),
    printed: std({ color: mars ? 0xb27a58 : 0x9c988f, map: T.rep(T.print, 7, 1), normalMap: T.rep(T.printN, 7, 1), normalScale: new THREE.Vector2(1.3, 1.3), roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    printedS: std({ color: mars ? 0xb27a58 : 0x9c988f, map: T.rep(T.print, 1, 1), normalMap: T.rep(T.printN, 1, 1), normalScale: new THREE.Vector2(1.3, 1.3), roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    berm: std({ color: mars ? 0x8a5234 : 0x77746e, normalMap: T.rep(T.lumpN, 10, 2), normalScale: new THREE.Vector2(1.4, 1.4), roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    soil: std({ color: mars ? 0x6e3c25 : 0x5f5c57, normalMap: T.rep(T.lumpN, 3, 3), roughness: 1 }),
    gold: MAT.gold, foil: MAT.foil, cells: cells(2, 2), cellsTall: cells(2, 10), cellsWide: cells(3, 2),
    floor: std({ color: 0xffffff, map: T.rep(T.floor, 4, 5), normalMap: T.rep(T.floorN, 8, 10), roughnessMap: T.rep(T.floorR, 6, 6), roughness: 0.7, metalness: 0.35 }),
    trefoil: std({ map: T.trefoil, transparent: true, alphaTest: 0.5, roughness: 0.6, side: THREE.DoubleSide }),
    paint: std({ color: 0xf1f0ec, roughness: 0.34, metalness: 0.05 }), // robot arm paint
    ice: new THREE.MeshPhysicalMaterial({ color: 0xeef8ff, roughness: 0.2, metalness: 0, transmission: 0.78, thickness: 1.4, ior: 1.31, attenuationColor: new THREE.Color(0xb3dcff), attenuationDistance: 6,
      normalMap: T.rep(T.quiltN, 3, 2), normalScale: new THREE.Vector2(0.7, 0.7), clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    pane: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transmission: 0.9, thickness: 0.04, ior: 1.5, side: THREE.DoubleSide }),
  };
  return P;
}

// ---------------------------------------------------------------- shared parts
// a pressurised module or tunnel lying along +x, with stiffener rings and domed ends
function module(len, r, P, rings = true, caps = true) {
  const g = new THREE.Group(), body = cyl(r, r, len, P.hull, 0, 0, 0, 48); body.rotation.z = Math.PI / 2; g.add(body);
  if (!caps) for (const s of [-1, 1]) { const d = cyl(r * 1.02, r * 1.02, 0.12, P.plain, (s * len) / 2, 0, 0, 48); d.rotation.z = Math.PI / 2; g.add(d); }
  else for (const s of [-1, 1]) { const cap = lathe([[r, 0], [r * 0.92, r * 0.22], [r * 0.6, r * 0.38], [0.001, r * 0.44]], P.plain, 48); cap.rotation.z = -s * Math.PI / 2; cap.position.x = (s * len) / 2; g.add(cap); }
  if (rings) for (let x = -len / 2 + 0.4; x <= len / 2 - 0.3; x += 1.2) { const t = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.045, 6, 48), P.metal); t.rotation.y = Math.PI / 2; t.position.x = x; g.add(t); }
  return g;
}
function lampHead(P, mat = P.lamp) { const g = new THREE.Group(); g.add(roundBox(0.5, 0.18, 0.32, 0.05, P.darkMetal), box(0.42, 0.02, 0.24, mat, 0, -0.095, 0)); return g; }
function lightPole(P, h = 5.5) { const g = new THREE.Group(); g.add(cyl(0.07, 0.09, h, P.metal, 0, h / 2, 0, 12), cyl(0.25, 0.3, 0.12, P.darkMetal, 0, 0.06, 0, 16)); const l = lampHead(P); l.position.set(0.25, h, 0); l.rotation.z = -0.35; g.add(l); return g; }
function beacon(mat) { const b = sph(0.09, mat, 0, 0, 0, 16, 8); b.userData.noShadow = true; return b; }
function dish(r, depth, mat, seg = 48) { const pts = []; for (let i = 0; i <= 12; i++) { const x = (i / 12) * r; pts.push([x + 0.0001, (depth * x * x) / (r * r)]); } return lathe(pts, mat, seg); }
function signPlane(tex, w, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 })); m.userData.noShadow = true; return m; }
function radiatorPanel(w, h, P) { const g = new THREE.Group(); g.add(box(w, h, 0.05, P.plain)); for (let x = -w / 2 + 0.15; x < w / 2; x += 0.3) g.add(box(0.03, h, 0.07, P.metal, x, 0, 0)); return g; }
function sphereTank(r, mat, P, x, y, z) { // a spherical propellant tank on a cradle, with its weld band and valves
  const g = new THREE.Group(); g.position.set(x, y, z);
  g.add(sph(r, mat, 0, 0, 0, 40, 24), cyl(r * 0.62, r * 0.78, y * 0.36, P.darkMetal, 0, -y + y * 0.18, 0, 24));
  const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, 0.035, 8, 64), P.metal); band.rotation.x = Math.PI / 2; g.add(band);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.4; g.add(rod(V(Math.cos(a) * r * 0.7, -r * 0.55, Math.sin(a) * r * 0.7), V(Math.cos(a) * r * 0.9, -y + 0.02, Math.sin(a) * r * 0.9), 0.04, P.metal)); }
  g.add(cyl(0.07, 0.07, 0.22, P.metal, 0, r + 0.08, 0, 12), cyl(0.12, 0.12, 0.06, P.accent, 0, r + 0.2, 0, 12), box(0.3, 0.12, 0.04, P.yellow, 0, r * 0.35, r * 0.94));
  return g;
}
function crate(P, w = 2, h = 1.2, d = 1.2) { const g = new THREE.Group(); g.add(roundBox(w, h, d, 0.08, P.hull, 0, h / 2, 0), box(w * 1.005, 0.12, d * 1.01, P.accent, 0, h * 0.75, 0)); return g; }

// the robot arm (shared by the bay and the hangar seen through its door)
function robotArm(P) {
  const root = new THREE.Group(), L1 = 1.9, L2 = 1.65, TOOL = 0.5;
  root.add(lathe([[0.001, 0], [0.55, 0], [0.55, 0.08], [0.46, 0.16], [0.43, 0.32], [0.001, 0.32]], P.darkMetal, 48));
  const turret = new THREE.Group(); turret.position.y = 0.32; root.add(turret);
  turret.add(cyl(0.36, 0.42, 0.44, P.paint, 0, 0.22, 0, 40), cyl(0.43, 0.43, 0.05, P.accent, 0, 0.03, 0, 40));
  for (const s of [-1, 1]) turret.add(roundBox(0.5, 0.66, 0.12, 0.06, P.paint, 0, 0.62, 0).rotateY(Math.PI / 2).translateZ(s * 0.25));
  const shoulder = new THREE.Group(); shoulder.position.y = 0.76; turret.add(shoulder);
  const sj = cyl(0.21, 0.21, 0.6, P.darkMetal, 0, 0, 0, 32); sj.rotation.z = Math.PI / 2; shoulder.add(sj);
  for (const s of [-1, 1]) { const c = cyl(0.22, 0.22, 0.04, P.accent, s * 0.31, 0, 0, 32); c.rotation.z = Math.PI / 2; shoulder.add(c); }
  shoulder.add(roundBox(0.32, L1, 0.36, 0.12, P.paint, 0, L1 / 2, 0), box(0.02, L1 * 0.5, 0.2, P.accent, 0.165, L1 * 0.55, 0));
  shoulder.add(tube([V(-0.2, 0.15, -0.1), V(-0.24, L1 * 0.5, -0.16), V(-0.2, L1 - 0.15, -0.1)], 0.035, P.rubber, 16, 6));
  const elbow = new THREE.Group(); elbow.position.y = L1; shoulder.add(elbow);
  const ej = cyl(0.17, 0.17, 0.46, P.darkMetal, 0, 0, 0, 28); ej.rotation.z = Math.PI / 2; elbow.add(ej);
  elbow.add(roundBox(0.24, L2, 0.26, 0.09, P.paint, 0, L2 / 2, 0), box(0.02, L2 * 0.4, 0.14, P.accent, -0.125, L2 * 0.5, 0));
  const wrist = new THREE.Group(); wrist.position.y = L2; elbow.add(wrist);
  wrist.add(cyl(0.11, 0.13, 0.18, P.darkMetal, 0, 0.09, 0, 24), cyl(0.125, 0.125, 0.05, P.accent, 0, 0.2, 0, 24));
  const grip = new THREE.Group(), fingers = [];
  grip.add(box(0.22, 0.08, 0.16, P.darkMetal, 0, 0.27, 0));
  for (const s of [-1, 1]) { const f = box(0.03, 0.2, 0.06, P.metal, s * 0.075, 0.4, 0); fingers.push(f); grip.add(f); }
  const nozzle = new THREE.Group(); nozzle.add(cyl(0.03, 0.055, 0.32, P.metal, 0, 0.38, 0, 16), cyl(0.07, 0.07, 0.05, P.accent, 0, 0.25, 0, 16));
  const torch = new THREE.Group(); torch.add(cyl(0.045, 0.045, 0.22, P.darkMetal, 0, 0.33, 0, 16), cyl(0.012, 0.04, 0.1, std({ color: 0xc07a45, metalness: 0.9, roughness: 0.3 }), 0, 0.48, 0, 12));
  wrist.add(grip, nozzle, torch); nozzle.visible = torch.visible = false;
  shadows(root);
  return { root, turret, shoulder, elbow, wrist, tools: { grip, nozzle, torch }, fingers, L1, L2, SH: 0.32 + 0.76, TOOL, cur: { yaw: 0, a1: -0.2, a2: 2.0, a3: 0.7 }, tgt: { yaw: 0, a1: -0.2, a2: 2.0, a3: 0.7 } };
}
function poseArm(A, yaw, a1, a2, a3) { A.turret.rotation.y = yaw; A.shoulder.rotation.x = a1; A.elbow.rotation.x = a2; A.wrist.rotation.x = a3; }

// ================================================================ the recovery hopper (sky-crane style)
// Four canted engines on outriggers keep the space under the deck free, so a dead machine can be
// winched up underneath it, the trick Curiosity's and Perseverance's sky cranes used in reverse.
function hopper(mars) {
  const P = pal(mars), g = new THREE.Group(), deckY = 2.7;
  g.add(cyl(2.3, 2.3, 0.34, P.hull, 0, deckY, 0, 8), cyl(2.36, 2.36, 0.07, P.accent, 0, deckY + 0.2, 0, 8), cyl(2.2, 2.25, 0.05, MAT.gold, 0, deckY - 0.19, 0, 8));
  for (const [x, z, s] of [[1.08, 0, 1], [-1.08, 0, 1], [0, 1.08, 0], [0, -1.08, 0]]) {
    if (s) { g.add(sph(0.95, P.plain, x, deckY + 1.15, z, 40, 24)); const t = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.05, 8, 48), P.darkMetal); t.rotation.x = Math.PI / 2; t.position.set(x, deckY + 1.15, z); g.add(t); }
    else { const m = mars ? P.plain : MAT.gold; g.add(cyl(0.78, 0.78, 1.4, m, x, deckY + 1.25, z, 40), sph(0.78, m, x, deckY + 1.95, z, 40, 16), cyl(0.8, 0.8, 0.08, P.darkMetal, x, deckY + 0.6, z, 40)); }
  }
  g.add(cyl(0.42, 0.52, 2.5, P.darkMetal, 0, deckY + 1.35, 0, 20));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 48), P.metal); ring.rotation.x = Math.PI / 2; ring.position.y = deckY + 2.45; g.add(ring);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4; g.add(rod(V(Math.cos(a) * 1.5, deckY + 2.45, Math.sin(a) * 1.5), V(Math.cos(a) * 2.1, deckY + 0.2, Math.sin(a) * 2.1), 0.045, P.metal)); }
  g.add(roundBox(0.8, 0.4, 0.6, 0.06, P.hull, 0, deckY + 2.72, 0), cyl(0.012, 0.012, 1.1, P.metal, 0.3, deckY + 3.3, 0.2, 6));
  const sp = box(1.6, 0.04, 0.9, P.cells, -0.7, deckY + 2.95, -0.3); sp.rotation.z = 0.25; g.add(sp);
  const engines = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a), px = c * 2.95, pz = s * 2.95;
    g.add(rod(V(c * 2.1, deckY, s * 2.1), V(px, deckY - 0.05, pz), 0.11, P.metal), rod(V(c * 1.6, deckY - 0.15, s * 1.6), V(px, deckY - 0.4, pz), 0.06, P.metal));
    g.add(cyl(0.36, 0.4, 0.7, P.hull, px, deckY - 0.1, pz, 24), cyl(0.41, 0.41, 0.06, P.accent, px, deckY + 0.18, pz, 24));
    const cant = 0.32, n = lathe([[0.16, 0.06], [0.13, 0], [0.16, -0.16], [0.42, -0.78]], P.nozzle, 32);
    n.position.set(px, deckY - 0.45, pz); n.rotation.set(-s * cant, 0, c * cant, 'XYZ'); g.add(n);
    const dir = V(c * Math.sin(cant), -Math.cos(cant), s * Math.sin(cant)).normalize();
    engines.push({ pos: V(px, deckY - 0.45, pz).addScaledVector(dir, 0.8), dir });
    const nav = beacon(k < 2 ? P.red : P.green); nav.position.set(c * 3.4, deckY + 0.1, s * 3.4); g.add(nav);
  }
  for (let k = 0; k < 4; k++) { // landing legs between the engines
    const a = (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a), hip = V(c * 2.05, deckY - 0.12, s * 2.05), foot = V(c * 3.45, 0.14, s * 3.45);
    g.add(rod(hip, foot, 0.075, P.metal), rod(hip.clone().lerp(foot, 0.25), hip.clone().lerp(foot, 0.62), 0.11, P.darkMetal, 12));
    g.add(rod(V(c * 1.4, deckY - 0.18, s * 1.4).add(V(-s * 0.6, 0, c * 0.6)), hip.clone().lerp(foot, 0.55), 0.04, P.metal), rod(V(c * 1.4, deckY - 0.18, s * 1.4).add(V(s * 0.6, 0, -c * 0.6)), hip.clone().lerp(foot, 0.55), 0.04, P.metal));
    g.add(lathe([[0.001, 0], [0.42, 0.02], [0.45, 0.08], [0.12, 0.16], [0.001, 0.16]], P.metal, 32).translateX(foot.x).translateZ(foot.z));
  }
  // winch and bridles under the deck
  const drum = cyl(0.22, 0.22, 0.9, P.darkMetal, 0, deckY - 0.48, 0, 24); drum.rotation.z = Math.PI / 2; g.add(drum, box(1.2, 0.08, 0.5, P.metal, 0, deckY - 0.27, 0));
  const floodlight = box(0.6, 0.03, 0.6, P.lamp, 0, deckY - 0.22, 0.9); g.add(floodlight);
  const cables = new THREE.Group(); cables.position.y = deckY - 0.5; g.add(cables);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + Math.PI / 4, c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), P.darkMetal); c.geometry.translate(0, -0.5, 0); c.userData.a = a; cables.add(c); }
  cables.visible = false;
  g.userData = { engines, deckY, winchY: deckY - 0.5, cables };
  return shadows(g);
}

// ================================================================ Shackleton Skylab (Moon)
function hangar(mars) {
  const P = pal(mars), g = new THREE.Group(), R = 7, L = 22;
  g.add(mesh(new THREE.CylinderGeometry(R, R, L, 80, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), P.corr));
  const ribGeo = new THREE.TorusGeometry(R + 0.07, 0.12, 6, 48, Math.PI);
  for (let z = -L / 2; z <= L / 2 + 1e-6; z += L / 8) g.add(mesh(ribGeo, P.metal, 0, 0, z));
  for (const th of [(2 * Math.PI) / 3, (4 * Math.PI) / 3]) g.add(mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, L * 0.97, 10, 1, true, th - 0.05, 0.1).rotateX(Math.PI / 2), P.accent));
  // end walls: closed at the back, a 7 × 5 m door at the front
  const back = new THREE.Shape(); back.moveTo(R, 0); back.lineTo(-R, 0); back.absarc(0, 0, R, Math.PI, 0, true);
  g.add(mesh(new THREE.ExtrudeGeometry(back, { depth: 0.3, bevelEnabled: false, curveSegments: 40 }), P.hullBig, 0, 0, -L / 2 - 0.3));
  const front = new THREE.Shape(); front.moveTo(R, 0); front.lineTo(3.5, 0); front.lineTo(3.5, 5); front.lineTo(-3.5, 5); front.lineTo(-3.5, 0); front.lineTo(-R, 0); front.absarc(0, 0, R, Math.PI, 0, true);
  g.add(mesh(new THREE.ExtrudeGeometry(front, { depth: 0.3, bevelEnabled: false, curveSegments: 40 }), P.hullBig, 0, 0, L / 2));
  for (const s of [-1, 1]) g.add(box(0.45, 5.5, 0.5, P.hazardV, s * 3.72, 2.75, L / 2 + 0.2));
  g.add(box(7.9, 0.5, 0.5, P.hazard, 0, 5.25, L / 2 + 0.2), box(7.2, 0.7, 0.7, P.darkMetal, 0, 4.7, L / 2 - 0.6)); // lintel, roll-up door housing
  const sign = signPlane(signTex([mars ? 'REPAIR BAY 02' : 'REPAIR BAY 01', mars ? 'ARCADIA SKYLAB' : 'SHACKLETON SKYLAB'], { accent: mars ? '#ff9a5c' : '#4fe0cb' }), 4.4, 1.1); sign.position.set(0, 6.05, L / 2 + 0.32); g.add(sign);
  const beacons = []; for (const s of [-1, 1]) { const b = beacon(P.amber); b.scale.setScalar(1.6); b.position.set(s * 3.72, 5.65, L / 2 + 0.25); g.add(b); beacons.push(b); }
  for (const s of [-1, 1]) { const p = lightPole(P, 5.2); p.position.set(s * 5.4, 0, L / 2 + 1.6); p.rotation.y = -Math.PI / 2 - s * 0.4; g.add(p); }
  // apron
  const apron = box(9, 0.06, 8, std({ color: mars ? 0x4f3b30 : 0x3f3e3b, roughness: 0.75, metalness: 0.1 }), 0, 0.03, L / 2 + 4.2); g.add(apron);
  for (const s of [-1, 1]) g.add(box(0.14, 0.02, 7.6, P.yellow, s * 3.3, 0.07, L / 2 + 4.2));
  g.add(box(7, 0.03, 0.4, P.hazard, 0, 0.07, L / 2 + 0.55));
  // inside, seen through the door: lit deck, the cradle, a robot arm and the crane
  g.add(box(2 * R - 0.6, 0.04, L - 0.4, P.floor, 0, 0.02, 0));
  g.add(cyl(2.3, 2.5, 0.34, P.darkMetal, 0, 0.17, 3, 48));
  const cr = new THREE.Mesh(new THREE.TorusGeometry(2.52, 0.035, 8, 96), P.accentGlow); cr.rotation.x = Math.PI / 2; cr.position.set(0, 0.2, 3); g.add(cr);
  const arm = robotArm(P); arm.root.position.set(3.4, 0, 1.5); poseArm(arm, -1.1, 0.5, 1.3, 0.6); g.add(arm.root);
  const arm2 = robotArm(P); arm2.root.position.set(-3.4, 0, 2.2); poseArm(arm2, 1.6, 0.2, 1.7, 0.9); g.add(arm2.root);
  for (const s of [-1, 1]) g.add(box(0.35, 0.45, L - 1, P.yellow, s * 4.6, 5.0, 0));
  g.add(box(9.4, 0.5, 0.55, P.yellow, 0, 5.4, 1.5));
  for (let z = -L / 2 + 2; z < L / 2; z += 5) { const strip = mesh(new THREE.TorusGeometry(R - 0.3, 0.04, 4, 32, Math.PI * 0.5), P.lamp, 0, 0, z); strip.rotation.z = Math.PI * 0.25; strip.userData.noShadow = true; g.add(strip); }
  const inner = new THREE.PointLight(mars ? 0xffe6c8 : 0xe2ecff, 70, 34, 1.6); inner.position.set(0, 4.2, 4); g.add(inner);
  g.add(crate(P, 1.8, 1.1, 1.1).translateX(-5).translateZ(-6), crate(P, 1.4, 0.9, 1).translateX(-5.2).translateZ(-4.2));
  g.userData.anim = (t) => { const on = Math.sin(t * 5) > 0; beacons[0].visible = on; beacons[1].visible = !on; };
  return shadows(g);
}
const hangarMars = () => hangar(true);

function habMoon() {
  const P = pal(false), g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 32; i++) { const t = (i / 32) * (Math.PI / 2); prof.push([9 * Math.pow(Math.cos(t), 0.7) + 0.0005, 7.4 * Math.pow(Math.sin(t), 0.92)]); }
  g.add(lathe(prof, P.printed, 128));
  // printed buttresses round the base
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.3, 0); fin.quadraticCurveTo(0.6, 0.6, 0, 2.8); fin.lineTo(0, 0);
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }); finGeo.translate(0, 0, -0.25);
  const portals = [0.35, 0.35 + TAU / 3, 0.35 + (2 * TAU) / 3];
  for (let k = 0; k < 20; k++) { const a = (k / 20) * TAU; if (portals.some((p) => Math.abs(Math.atan2(Math.sin(a - p), Math.cos(a - p))) < 0.3)) continue; const f = mesh(finGeo, P.printedS); f.position.set(Math.cos(a) * 8.35, 0, Math.sin(a) * 8.35); f.rotation.y = -a; g.add(f); }
  // three arched portals, each covering a pressurised tunnel that ends in an airlock
  const hood = new THREE.CylinderGeometry(2.5, 2.5, 5.2, 40, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2);
  const arch = new THREE.Shape(); arch.moveTo(2.8, 0); arch.absarc(0, 0, 2.8, 0, Math.PI, false); arch.lineTo(-2.05, 0); arch.absarc(0, 0, 2.05, Math.PI, 0, true); arch.lineTo(2.8, 0);
  const archGeo = new THREE.ExtrudeGeometry(arch, { depth: 0.55, bevelEnabled: false, curveSegments: 32 }).rotateY(Math.PI / 2);
  portals.forEach((a, i) => {
    const p = new THREE.Group(); p.rotation.y = -a; g.add(p);
    p.add(mesh(hood, P.printed, 8.7, 0, 0), mesh(archGeo, P.printedS, 11.2, 0, 0));
    const tun = module(6.2, 1.5, P, true, false); tun.position.set(9.5, 1.55, 0); p.add(tun);
    p.add(box(0.14, 2.0, 1.25, P.darkMetal, 12.66, 1.45, 0), box(0.1, 1.8, 1.05, P.plain, 12.73, 1.45, 0), box(0.04, 0.32, 0.7, P.win, 12.79, 1.95, 0));
    p.add(box(0.06, 0.12, 1.6, P.hazard, 12.8, 2.62, 0));
    for (const s of [-1, 1]) { const l = lampHead(P, P.lampWarm); l.position.set(12.4, 3.25, s * 0.95); l.rotation.z = 0.5; p.add(l); }
    p.add(box(1.4, 0.4, 3.2, P.darkMetal, 10.6, 0.2, 0));
    if (i === 0) { const L = new THREE.PointLight(0xffcf9a, 45, 22, 1.8); L.position.set(14.2, 2.8, 0); p.add(L); }
  });
  // top hatch, mast, beacon
  g.add(cyl(1.7, 1.9, 0.6, P.printedS, 0, 7.25, 0, 48), cyl(0.9, 0.9, 0.3, P.plain, 0, 7.7, 0, 32), cyl(0.05, 0.05, 2.6, P.metal, 0.5, 9.0, 0, 8));
  const bcn = beacon(P.red); bcn.position.set(0.5, 10.35, 0); g.add(bcn);
  const d = dish(0.45, 0.16, P.plainDS); d.position.set(-0.4, 8.2, 0.3); d.rotation.set(0.4, 0, 1.1); g.add(d);
  // radiators and cargo between the portals
  const ra = 0.35 + TAU / 6; for (const s of [-1, 1]) { const r = radiatorPanel(3.2, 2.4, P), a = ra + s * 0.22; r.position.set(Math.cos(a) * 12.6, 2.1, Math.sin(a) * 12.6); r.rotation.y = -a + Math.PI / 2; g.add(r, box(0.15, 0.9, 0.15, P.metal, Math.cos(a) * 12.6, 0.45, Math.sin(a) * 12.6)); }
  const ca = 0.35 + TAU / 2; g.add(crate(P).translateX(Math.cos(ca) * 12).translateZ(Math.sin(ca) * 12).rotateY(-ca), crate(P, 1.4, 1, 1.2).translateX(Math.cos(ca + 0.2) * 12.4).translateZ(Math.sin(ca + 0.2) * 12.4).rotateY(-ca + 0.3));
  g.userData.anim = (t) => { bcn.visible = Math.sin(t * 2.4) > 0.6; };
  return shadows(g);
}

function pad(mars) {
  const P = pal(mars), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(20, 20.4, 0.3, 128), std({ map: padTex(mars, mars ? 2 : 1), roughness: 0.62, metalness: 0.12 }), 0, 0.1, 0));
  // blast berm, with a gap facing local -x for the road
  g.add(lathe([[22, -0.4], [22.6, 0.8], [23.6, 1.9], [24.8, 2.35], [26, 1.95], [27, 0.9], [27.7, -0.4]], P.berm, 160, -Math.PI / 2 + 0.26, TAU - 0.52));
  const lights = [];
  for (let k = 0; k < 28; k++) { const a = (k / 28) * TAU, x = Math.cos(a) * 20.7, z = Math.sin(a) * 20.7; g.add(cyl(0.06, 0.08, 0.45, P.darkMetal, x, 0.22, z, 8)); const l = beacon(k % 2 ? P.lamp : P.accentGlow); l.position.set(x, 0.5, z); g.add(l); lights.push(l); }
  // propellant umbilical: a small tower, a hose and two storage tanks
  const tw = truss(6.4, 0.45, 0.8, P.metal); tw.position.set(13, 0, -9); g.add(tw);
  g.add(box(3.6, 0.22, 0.3, P.metal, 11.4, 6.1, -8.4), tube([V(13, 0.2, -9), V(9, 0.15, -6.5), V(5.5, 0.2, -3.6), V(3.4, 1.8, -2.2), V(1.9, 2.6, -1.1)], 0.09, P.rubber, 40, 8));
  for (const z of [-13.2, -15.6]) { const t = module(5, 0.95, P, false); t.position.set(10.5, 1.15, z); g.add(t, box(0.4, 0.3, 1.6, P.darkMetal, 9, 0.15, z), box(0.4, 0.3, 1.6, P.darkMetal, 12, 0.15, z)); }
  const h = hopper(mars); g.add(h);
  g.userData.hopper = h;
  const flood = new THREE.PointLight(0xfff1de, 90, 70, 1.3); flood.position.set(0, 14, 0); g.add(flood); // pad floodlights
  for (const a of [0.8, 2.4, 4.0, 5.6]) { const p = lightPole(P, 7); p.position.set(Math.cos(a) * 21.4, 0, Math.sin(a) * 21.4); p.rotation.y = -a + Math.PI; g.add(p); }
  g.userData.anim = (t) => { const k = Math.floor(t * 9) % 28; lights.forEach((l, i) => { l.scale.setScalar(((i - k + 28) % 28) < 3 ? 1.8 : 1); }); };
  return shadows(g);
}
const padMars = () => pad(true);

function vsat() {
  const P = pal(false), g = new THREE.Group(), heads = [], tips = [];
  for (const [x, z] of [[0, -7.5], [6.5, 4.5], [-6.5, 4.5]]) {
    const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t);
    for (let k = 0; k < 3; k++) { const a = (k * TAU) / 3 + 0.5; t.add(rod(V(0, 1.8, 0), V(Math.cos(a) * 2.3, 0.06, Math.sin(a) * 2.3), 0.06, P.metal), cyl(0.24, 0.28, 0.08, P.darkMetal, Math.cos(a) * 2.3, 0.04, Math.sin(a) * 2.3, 16)); }
    t.add(roundBox(1.0, 0.7, 0.8, 0.08, P.hull, 1.0, 0.35, 0.6), box(1.0, 0.02, 0.8, P.cells, 1.0, 0.72, 0.6));
    [[0.21, 1.2, 7.0], [0.17, 6.8, 12.3], [0.14, 12.1, 16.9], [0.11, 16.7, 20.7]].forEach(([r, y0, y1]) => { t.add(cyl(r, r, y1 - y0, P.metal, 0, (y0 + y1) / 2, 0, 20), cyl(r + 0.045, r + 0.045, 0.22, P.darkMetal, 0, y0 + 0.11, 0, 20)); });
    const head = new THREE.Group(); t.add(head); heads.push(head);
    const blanket = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 14.2), P.cellsTall); blanket.position.set(1.8, 13.0, 0.02); head.add(blanket);
    const backside = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 14.2), P.plainDS); backside.position.set(1.8, 13.0, -0.02); backside.rotation.y = Math.PI; head.add(backside);
    head.add(box(3.5, 0.1, 0.12, P.metal, 1.75, 20.15, 0), box(3.5, 0.1, 0.12, P.metal, 1.75, 5.85, 0), cyl(0.2, 0.2, 0.32, P.darkMetal, 0, 20.15, 0, 16), cyl(0.24, 0.24, 0.32, P.darkMetal, 0, 5.85, 0, 16));
    head.add(rod(V(3.4, 5.85, 0), V(3.4, 20.15, 0), 0.02, P.metal));
    const tip = beacon(P.red); tip.position.set(0, 20.95, 0); t.add(tip); tips.push(tip);
  }
  g.userData.anim = (t, dt, ctx) => {
    tips.forEach((b) => { b.visible = Math.sin(t * 2.1) > 0.5; });
    if (!ctx || !ctx.sunDir) return;
    const d = tmpV.copy(ctx.sunDir).applyQuaternion(g.getWorldQuaternion(tmpQ).invert()), want = Math.atan2(d.x, d.z);
    heads.forEach((h) => { const dd = Math.atan2(Math.sin(want - h.rotation.y), Math.cos(want - h.rotation.y)); h.rotation.y += dd * (1 - Math.exp(-dt * (ctx.fast ? 3 : 0.6))); });
  };
  return shadows(g);
}

function iceMoon() {
  const P = pal(false), g = new THREE.Group(), spin = [];
  // icy regolith pile
  const pile = new THREE.IcosahedronGeometry(1, 3), pp = pile.attributes.position, v = V(), r = seeded(9);
  for (let i = 0; i < pp.count; i++) { v.fromBufferAttribute(pp, i); const k = 0.8 + 0.25 * Math.sin(v.x * 5 + v.z * 3) + r() * 0.06; pp.setXYZ(i, v.x * k, Math.max(v.y, -0.1) * k, v.z * k); }
  pile.computeVertexNormals();
  const pm = mesh(pile, P.soil, -4.2, 0, 2.6); pm.scale.set(2.8, 1.25, 2.2); g.add(pm);
  // RASSOR-style excavator: tracked chassis, two counter-rotating bucket drums
  const rx = new THREE.Group(); rx.position.set(-0.3, 0, 4.2); rx.rotation.y = 0.2; g.add(rx);
  rx.add(roundBox(1.3, 0.42, 0.8, 0.1, P.hull, 0, 0.52, 0), box(1.0, 0.02, 0.6, P.cells, 0, 0.75, 0));
  for (const s of [-1, 1]) rx.add(roundBox(1.35, 0.36, 0.24, 0.16, P.rubber, 0, 0.2, s * 0.5));
  for (const s of [-1, 1]) {
    rx.add(rod(V(s * 0.55, 0.55, 0.3), V(s * 1.15, 0.36, 0.3), 0.05, P.metal), rod(V(s * 0.55, 0.55, -0.3), V(s * 1.15, 0.36, -0.3), 0.05, P.metal));
    const drum = new THREE.Group(); drum.position.set(s * 1.2, 0.36, 0); rx.add(drum);
    const dc = cyl(0.32, 0.32, 0.72, P.darkMetal, 0, 0, 0, 24); dc.rotation.x = Math.PI / 2; drum.add(dc);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, sc = box(0.08, 0.1, 0.66, P.metal, Math.cos(a) * 0.33, Math.sin(a) * 0.33, 0); sc.rotation.z = a; drum.add(sc); }
    spin.push({ o: drum, s });
  }
  rx.add(cyl(0.02, 0.02, 0.5, P.metal, 0.3, 0.98, 0, 6), box(0.16, 0.1, 0.12, P.darkMetal, 0.3, 1.26, 0));
  // conveyor up to the hopper
  const belt = new THREE.Group(); g.add(belt);
  const a0 = V(-2.4, 0.3, 1.6), a1 = V(2.0, 2.5, -0.6), mid = a0.clone().lerp(a1, 0.5), len = a0.distanceTo(a1);
  const bb = box(len, 0.08, 0.7, P.rubber); bb.position.copy(mid); bb.lookAt(a1); bb.rotateY(-Math.PI / 2); belt.add(bb);
  for (const s of [-1, 1]) { const rail = box(len, 0.16, 0.05, P.metal); rail.position.copy(mid).add(V(0, 0.08, 0)).add(V(-0.25, 0, -0.45).multiplyScalar(s).setY(0)); rail.lookAt(a1.clone().add(V(-0.25, 0, -0.45).multiplyScalar(s).setY(0))); rail.rotateY(-Math.PI / 2); belt.add(rail); }
  for (let k = 0; k < 4; k++) { const p = a0.clone().lerp(a1, (k + 0.5) / 4); g.add(rod(V(p.x, 0, p.z), p, 0.04, P.metal)); }
  // hopper, oven, radiator, tanks
  g.add(lathe([[0.3, 0], [1.25, 1.3], [1.3, 1.5], [1.2, 1.5]], P.metal, 32).translateX(2.6).translateY(2.3).translateZ(-1.0));
  for (const [x, z] of [[1.7, -1.9], [3.5, -1.9], [1.7, -0.1], [3.5, -0.1]]) g.add(cyl(0.06, 0.06, 2.3, P.metal, x, 1.15, z, 8));
  g.add(roundBox(2.2, 1.6, 1.8, 0.12, P.hull, 2.6, 0.8, -1.0), box(1.8, 1.2, 0.04, MAT.gold, 2.6, 0.8, -0.08));
  const rad = radiatorPanel(2.6, 1.8, P); rad.position.set(4.6, 1.5, -1.0); rad.rotation.y = Math.PI / 2; g.add(rad, box(0.1, 0.6, 0.1, P.metal, 4.6, 0.3, -1.0));
  for (const [x, z] of [[5.6, 1.4], [5.6, 3.3]]) g.add(sphereTank(0.85, P.plain, P, x, 1.05, z));
  g.add(tube([V(3.6, 0.5, -0.1), V(4.6, 0.4, 0.8), V(5.0, 0.9, 1.4)], 0.06, P.metal, 24, 8), tube([V(5.6, 1.9, 1.4), V(5.6, 2.1, 2.35), V(5.6, 1.9, 3.3)], 0.05, P.metal, 16, 8));
  const lamp = lightPole(P, 4.2); lamp.position.set(-1.5, 0, -2.2); lamp.rotation.y = -2.2; g.add(lamp);
  g.userData.anim = (t, dt, ctx) => { const k = ctx && ctx.dig ? 7 : 1.2; spin.forEach(({ o, s }) => { o.rotation.z += s * dt * k; }); if (ctx && ctx.dig) rx.position.x = -0.3 + Math.sin(t * 1.6) * 0.9; };
  g.userData.rassor = rx;
  return shadows(g);
}

function fission() {
  const P = pal(false), g = new THREE.Group();
  g.add(lathe([[2.0, -0.3], [2.5, 0.9], [3.3, 1.5], [4.2, 1.2], [4.9, -0.3]], P.berm, 64));
  g.add(cyl(0.72, 0.72, 2.3, P.darkMetal, 0, 1.15, 0, 40));
  for (let y = 0.3; y < 2.3; y += 0.45) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.04, 6, 40), P.metal); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  g.add(roundBox(1.7, 1.0, 1.7, 0.12, P.hull, 0, 2.8, 0), box(1.4, 0.8, 0.04, MAT.gold, 0, 2.8, 0.86));
  g.add(cyl(0.13, 0.15, 7.2, P.metal, 0, 6.9, 0, 16), cyl(0.3, 0.3, 0.25, P.darkMetal, 0, 10.5, 0, 16));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, w = new THREE.Group(); w.rotation.y = -a; g.add(w);
    w.add(box(2.4, 6.4, 0.06, P.plain, 1.35, 6.75, 0));
    for (let y = 3.8; y < 9.9; y += 0.5) w.add(box(2.4, 0.03, 0.08, P.metal, 1.35, y, 0));
    w.add(cyl(0.05, 0.05, 6.4, P.accent, 0.18, 6.75, 0, 8), rod(V(0.1, 10.2, 0), V(2.5, 9.9, 0), 0.02, P.metal));
  }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3, x = Math.cos(a) * 7.2, z = Math.sin(a) * 7.2; g.add(cyl(0.04, 0.04, 1.4, P.metal, x, 0.7, z, 6)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), P.trefoil); s.position.set(x, 1.25, z); s.rotation.y = -a - Math.PI / 2; s.userData.noShadow = true; g.add(s); }
  g.add(tube([V(0.9, 0.3, 0), V(4, 0.15, 0.6), V(8, 0.1, 0.2), V(12, 0.1, -0.5)], 0.07, P.rubber, 32, 6));
  const b = beacon(P.red); b.position.set(0, 10.75, 0); g.add(b);
  g.userData.anim = (t) => { b.visible = Math.sin(t * 1.7) > 0.4; };
  return shadows(g);
}

function comms(mars) {
  const P = pal(mars), g = new THREE.Group(), H = 14;
  g.add(truss(H, 0.5, 0.95, P.metal), cyl(0.95, 0.95, 0.1, P.darkMetal, 0, H + 0.05, 0, 24), cyl(1.3, 1.3, 0.25, P.darkMetal, 0, 0.12, 0, 6));
  g.add(roundBox(1.8, 1.3, 1.3, 0.1, P.hull, 1.9, 0.65, 0.4), box(1.7, 0.04, 1.2, P.cells, 1.9, 1.34, 0.4));
  const aim = new THREE.Group(); aim.position.set(0, H + 0.9, 0); g.add(aim, cyl(0.12, 0.16, 0.8, P.darkMetal, 0, H + 0.45, 0, 16));
  const d = dish(1.3, 0.42, P.plainDS, 64); aim.add(d);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 8, 64), P.metal); rim.rotation.x = Math.PI / 2; rim.position.y = 0.42; aim.add(rim);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; aim.add(rod(V(Math.cos(a) * 1.2, 0.4, Math.sin(a) * 1.2), V(0, 1.25, 0), 0.015, P.metal)); }
  aim.add(cyl(0.05, 0.09, 0.22, P.darkMetal, 0, 1.3, 0, 12));
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.5; g.add(cyl(0.012, 0.012, 1.8, P.metal, Math.cos(a) * 0.85, H + 1.0, Math.sin(a) * 0.85, 6)); }
  const b = beacon(P.red); b.position.set(0.85, H + 1.95, 0); g.add(b);
  const want = V();
  g.userData.anim = (t, dt, ctx) => {
    b.visible = Math.sin(t * 2.6) > 0.3;
    const w = ctx && (mars ? ctx.relayDir : ctx.earthDir); if (!w) return;
    want.copy(w).applyQuaternion(g.getWorldQuaternion(tmpQ).invert());
    if (want.y < 0.05) { want.y = 0.05; want.normalize(); } // the dish can't point into the ground
    tmpQ.setFromUnitVectors(UP, want); aim.quaternion.slerp(tmpQ, 1 - Math.exp(-dt * 1.5));
  };
  return shadows(g);
}
const commsMars = () => comms(true);

// pressurised rover, forward = +x; wheels in the format surface.js drives
function pRover() {
  const P = pal(false), g = new THREE.Group(), WR = 0.55, WW = 0.42;
  g.add(box(4.4, 0.3, 1.9, P.darkMetal, 0, 0.98, 0));
  g.add(roundBox(4.6, 2.2, 2.5, 0.55, P.hull, 0, 2.2, 0));
  g.add(box(4.62, 0.12, 2.52, P.accent, 0, 1.55, 0));
  const ws = roundBox(0.1, 1.05, 2.0, 0.25, P.glass); ws.position.set(2.27, 2.45, 0); ws.rotation.z = -0.22; g.add(ws);
  for (const s of [-1, 1]) for (const x of [0.9, -0.3]) g.add(box(0.7, 0.42, 0.04, P.win, x, 2.6, s * 1.255));
  for (const s of [-1, 1]) g.add(box(0.06, 0.12, 0.42, P.lamp, 2.31, 1.45, s * 0.85));
  g.add(box(0.1, 0.1, 1.6, P.lamp, 1.9, 3.34, 0));
  for (const s of [-1, 1]) { // suitports on the back, with suits docked
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 32), P.darkMetal); ring.rotation.y = Math.PI / 2; ring.position.set(-2.32, 2.25, s * 0.6); g.add(ring);
    g.add(roundBox(0.32, 0.95, 0.68, 0.12, P.plain, -2.5, 2.25, s * 0.6), box(0.04, 0.2, 0.3, P.accent, -2.67, 2.45, s * 0.6));
  }
  const sp = box(2.2, 0.05, 1.7, P.cells, -0.4, 3.38, 0); sp.rotation.z = 0.05; g.add(sp, box(0.6, 0.3, 0.6, P.darkMetal, 1.2, 3.42, 0.6), cyl(0.012, 0.012, 1.2, P.metal, 1.4, 3.9, -0.7, 6));
  const dd = dish(0.25, 0.08, P.plainDS); dd.position.set(1.2, 3.65, 0.6); dd.rotation.z = -0.5; g.add(dd);
  g.userData.wheels = []; g.userData.wheelR = WR;
  const treadGeo = new THREE.BoxGeometry(0.1, 0.05, WW * 0.95);
  for (const x of [1.6, 0, -1.6]) for (const sz of [-1, 1]) {
    const z = sz * 1.32, w = new THREE.Group(); w.position.set(x, WR, z);
    const tire = cyl(WR, WR, WW, P.rubber, 0, 0, 0, 40); tire.rotation.x = Math.PI / 2; w.add(tire);
    const hub = cyl(WR * 0.55, WR * 0.55, WW + 0.02, P.metal, 0, 0, 0, 24); hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU, t = mesh(treadGeo, P.rubber, Math.cos(a) * (WR + 0.02), Math.sin(a) * (WR + 0.02), 0); t.rotation.z = a; w.add(t); }
    g.add(w); g.userData.wheels.push({ obj: w, front: x > 0.1, steer: x !== 0, flip: false, y0: 0, z0: 0 });
    g.add(rod(V(x, 0.95, sz * 0.8), V(x, WR, z - sz * 0.25), 0.07, P.metal), box(1.2, 0.08, 0.6, P.plain, x, WR * 2 + 0.12, z));
  }
  return shadows(g);
}

// ================================================================ Arcadia Skylab (Mars)
function iceHome() {
  const P = pal(true), g = new THREE.Group();
  const prof = []; for (let i = 0; i <= 36; i++) { const t = i / 36; prof.push([7.6 * Math.pow(1 - Math.pow(t, 2.3), 0.5) + 0.0005, 10.2 * t]); }
  const shell = lathe(prof, P.ice, 128); shell.castShadow = true; g.add(shell);
  // inside: rigid core with lit decks
  g.add(cyl(2.1, 2.1, 9.0, P.hull, 0, 4.5, 0, 40));
  for (const y of [3.2, 6.2]) g.add(cyl(6.2 - (y > 5 ? 1.1 : 0), 6.2 - (y > 5 ? 1.1 : 0), 0.14, P.plain, 0, y, 0, 64));
  for (const y of [1.7, 4.7, 7.6]) g.add(cyl(2.12, 2.12, 0.35, P.win, 0, y, 0, 40));
  const r = seeded(3); for (let i = 0; i < 14; i++) { const a = r() * TAU, up = r() < 0.5, d = up ? 2.7 + r() * 1.7 : 3 + r() * 2.2, y = up ? 6.27 : 3.27; g.add(box(0.6 + r(), 0.8, 0.5 + r() * 0.6, r() < 0.2 ? P.darkMetal : P.plain, Math.cos(a) * d, y + 0.4, Math.sin(a) * d)); }
  const L = new THREE.PointLight(0xffd7a8, 80, 20, 1.6); L.position.set(0, 4.5, 0); g.add(L);
  // anchor ring and airlock
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.55, 12, 96), P.berm); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
  const al = module(4.0, 1.25, P, true, false); al.position.set(8.6, 1.4, 0); g.add(al);
  g.add(box(0.14, 1.8, 1.1, P.darkMetal, 10.78, 1.35, 0), box(0.04, 0.3, 0.6, P.win, 10.86, 1.8, 0));
  for (const s of [-1, 1]) { const l = lampHead(P, P.lampWarm); l.position.set(10.6, 2.95, s * 0.8); l.rotation.z = 0.5; g.add(l); }
  for (const x of [7.4, 9.8]) g.add(box(0.5, 0.25, 2.2, P.darkMetal, x, 0.12, 0));
  g.add(tube([V(-7.4, 0.25, 2.0), V(-10, 0.15, 4), V(-14, 0.15, 7)], 0.09, MAT.gold, 24, 8), crate(P).translateX(-5).translateZ(-8.6).rotateY(0.4));
  return shadows(g);
}

function greenhouse() {
  const P = pal(true), g = new THREE.Group(), R = 2.8, L = 14;
  const glass = mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), P.pane, 0, 0.3, 0);
  glass.userData.noShadow = true; g.add(glass);
  const ribGeo = new THREE.TorusGeometry(R + 0.04, 0.07, 6, 32, Math.PI);
  for (let x = -L / 2; x <= L / 2 + 1e-6; x += L / 10) { const rb = mesh(ribGeo, P.plain, x, 0.3, 0); rb.rotation.y = Math.PI / 2; g.add(rb); }
  g.add(box(L + 0.6, 0.3, 2 * R + 0.5, P.printedS, 0, 0.15, 0));
  const endG = new THREE.Shape(); endG.moveTo(R, 0); endG.lineTo(-R, 0); endG.absarc(0, 0, R, Math.PI, 0, true);
  for (const s of [-1, 1]) { const e = mesh(new THREE.ShapeGeometry(endG, 24), P.pane, s * L / 2, 0.3, 0); e.rotation.y = Math.PI / 2; e.userData.noShadow = true; g.add(e); }
  const al = module(2.2, 1.1, P, true, false); al.position.set(L / 2 + 1.2, 1.25, 0); g.add(al, box(0.12, 1.6, 0.9, P.darkMetal, L / 2 + 2.36, 1.2, 0));
  // beds, plants, LED bars
  const soil = std({ color: 0x3a2517, roughness: 1 });
  const plantGeo = new THREE.IcosahedronGeometry(0.2, 1), plants = new THREE.InstancedMesh(plantGeo, std({ color: 0xffffff, roughness: 0.65 }), 330), o = new THREE.Object3D(), c = new THREE.Color(), r = seeded(12);
  let n = 0;
  const leds = [];
  for (const z of [-1.5, 0, 1.5]) {
    g.add(box(L - 1, 0.55, 0.85, P.plain, 0, 0.58, z), box(L - 1.1, 0.04, 0.78, soil, 0, 0.87, z));
    for (let i = 0; i < 110 && n < 330; i++, n++) { const x = -L / 2 + 0.8 + (i / 110) * (L - 1.6); o.position.set(x, 0.95 + r() * 0.08, z + (r() - 0.5) * 0.5); const s = 0.6 + r() * 0.9; o.scale.set(s, s * (0.8 + r() * 0.7), s); o.rotation.set(r(), r() * TAU, r()); o.updateMatrix(); plants.setMatrixAt(n, o.matrix); c.setHSL(0.26 + r() * 0.08, 0.55 + r() * 0.2, 0.22 + r() * 0.12); plants.setColorAt(n, c); }
    const led = box(L - 1.4, 0.05, 0.16, glowMat(3.2, 0.7, 2.8), 0, 2.15, z); led.userData.noShadow = true; g.add(led); leds.push(led);
    for (const x of [-L / 2 + 1.5, 0, L / 2 - 1.5]) g.add(cyl(0.006, 0.006, 0.7, P.metal, x, 2.55, z, 4));
  }
  plants.castShadow = true; g.add(plants);
  const pink = new THREE.PointLight(0xff55d8, 26, 12, 1.6); pink.position.set(0, 1.9, 0); g.add(pink);
  const ledMat = leds[0].material, on = ledMat.color.clone();
  g.userData.toggle = () => { const was = pink.intensity > 0; pink.intensity = was ? 0 : 26; ledMat.color.copy(was ? new THREE.Color(0.2, 0.05, 0.18) : on); leds.forEach((l) => { l.material = ledMat; }); return !was; };
  return shadows(g);
}

function kilopower() {
  const P = pal(true), g = new THREE.Group(), radMat = std({ color: 0xb9bdc3, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide, normalMap: TX().rep(TX().seamN, 4, 1), normalScale: new THREE.Vector2(0.5, 0.5) });
  const unit = () => {
    const u = new THREE.Group();
    for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; u.add(rod(V(Math.cos(a) * 0.3, 1.4, Math.sin(a) * 0.3), V(Math.cos(a) * 1.1, 0.05, Math.sin(a) * 1.1), 0.05, P.metal)); }
    u.add(cyl(0.22, 0.22, 0.55, P.metal, 0, 1.0, 0, 24));
    u.add(lathe([[0.3, 1.25], [0.78, 2.1], [0.75, 2.15], [0.3, 2.15]], P.darkMetal, 40));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; u.add(cyl(0.025, 0.025, 1.4, P.metal, Math.cos(a) * 0.34, 2.85, Math.sin(a) * 0.34, 6)); }
    u.add(cyl(0.32, 0.32, 0.5, P.hull, 0, 3.75, 0, 24));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; u.add(cyl(0.09, 0.09, 0.46, P.accent, Math.cos(a) * 0.46, 3.75, Math.sin(a) * 0.46, 12)); }
    const um = lathe([[1.95, 4.05], [1.2, 4.42], [0.2, 4.95], [0.001, 4.97]], radMat, 64); u.add(um);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; u.add(rod(V(Math.cos(a) * 0.2, 4.96, Math.sin(a) * 0.2), V(Math.cos(a) * 1.95, 4.07, Math.sin(a) * 1.95), 0.018, P.metal, 5)); }
    u.add(cyl(0.12, 0.12, 0.2, P.darkMetal, 0, 5.05, 0, 12));
    const b = beacon(P.green); b.position.set(0, 5.2, 0); u.add(b);
    return u;
  };
  for (let i = 0; i < 4; i++) { const u = unit(); u.position.set((i - 1.5) * 4.4, 0, 0); g.add(u); }
  const berm = mesh(new THREE.SphereGeometry(1, 48, 12, 0, TAU, 0, Math.PI / 2), P.berm); berm.scale.set(9.5, 1.2, 2.6); berm.position.set(0, -0.15, 4.6); g.add(berm);
  for (const x of [-7, 7]) { g.add(cyl(0.04, 0.04, 1.4, P.metal, x, 0.7, 5.6, 6)); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), P.trefoil); s.position.set(x, 1.25, 5.62); s.userData.noShadow = true; g.add(s); }
  g.add(tube([V(-6.6, 0.1, 0.5), V(-3, 0.1, 1.4), V(0, 0.1, 2), V(4, 0.1, 6), V(8, 0.1, 12)], 0.07, P.rubber, 32, 6));
  return shadows(g);
}

function moxie() {
  const P = pal(true), g = new THREE.Group();
  g.add(box(3.4, 0.22, 2.4, P.darkMetal, 0, 0.11, 0), roundBox(3.0, 2.0, 2.0, 0.22, P.hull, 0, 1.22, 0), box(2.2, 1.4, 0.04, MAT.gold, -0.2, 1.25, 1.01));
  for (let i = 0; i < 6; i++) g.add(box(0.05, 0.9, 0.02, P.darkMetal, 0.85 + i * 0.09, 1.3, 1.02));
  g.add(box(0.5, 0.3, 0.03, P.green, -1.1, 1.95, 1.02));
  const intake = cyl(0.55, 0.55, 0.9, P.hull, -1.95, 1.2, 0, 32); intake.rotation.z = Math.PI / 2; g.add(intake);
  const grille = cyl(0.48, 0.48, 0.04, P.darkMetal, -2.41, 1.2, 0, 32); grille.rotation.z = Math.PI / 2; g.add(grille);
  g.add(cyl(0.45, 0.45, 2.4, P.metal, 2.5, 1.2, -1.2, 28));
  for (let y = 0.4; y < 2.4; y += 0.22) g.add(cyl(0.62, 0.62, 0.025, P.metal, 2.5, y, -1.2, 28));
  for (const [x, z, m] of [[-2.9, 1.5, P.plain], [-2.9, -0.4, P.plain], [2.9, 1.3, std({ color: 0x8aa3b8, roughness: 0.4, metalness: 0.3 })]]) g.add(sphereTank(0.82, m, P, x, 1.0, z));
  g.add(tube([V(-1.4, 0.6, 0.6), V(-2.2, 0.5, 1.0), V(-2.9, 1.0, 1.5)], 0.06, P.metal, 24, 8), tube([V(-1.4, 0.6, -0.4), V(-2.9, 0.9, -0.4)], 0.06, P.metal, 16, 8));
  g.add(tube([V(1.5, 0.8, -0.5), V(2.0, 0.6, -1.0), V(2.5, 0.5, -1.2)], 0.06, P.metal, 16, 8), tube([V(2.5, 2.4, -1.2), V(2.7, 2.3, 0.2), V(2.9, 1.8, 1.3)], 0.05, P.metal, 24, 8));
  for (const x of [-1.2, 1.2]) { const r = radiatorPanel(2.2, 1.5, P); r.position.set(x, 1.6, -2.4); g.add(r, box(0.1, 0.85, 0.1, P.metal, x, 0.42, -2.4)); }
  g.add(cyl(0.1, 0.1, 2.6, P.metal, 0.9, 2.5, -0.5, 10), cyl(0.16, 0.16, 0.12, P.darkMetal, 0.9, 3.8, -0.5, 12));
  g.userData.vent = V(0.9, 3.9, -0.5);
  return shadows(g);
}

function drill() {
  const P = pal(true), g = new THREE.Group(), top = 7.6;
  const legs = [[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]], T = (x, z, y) => V(lerp(x, x * 0.22, y / top), y, lerp(z, z * 0.22, y / top)), pairs = [];
  legs.forEach(([x, z]) => pairs.push([T(x, z, 0), T(x, z, top)]));
  for (let y = 1.4; y < top; y += 1.5) for (let k = 0; k < 4; k++) { const [x0, z0] = legs[k], [x1, z1] = legs[(k + 1) % 4]; pairs.push([T(x0, z0, y), T(x1, z1, y)], [T(x0, z0, y - 1.4), T(x1, z1, y)]); }
  g.add(rodsInst(pairs.slice(0, 4), 0.07, P.yellow, 8), rodsInst(pairs.slice(4), 0.035, P.yellow));
  g.add(box(0.9, 0.5, 0.9, P.darkMetal, 0, top + 0.1, 0), cyl(0.36, 0.4, 0.4, P.darkMetal, 0, 0.2, 0, 24));
  const string = new THREE.Group(); g.add(string);
  string.add(cyl(0.07, 0.07, top + 0.6, P.metal, 0, top / 2 - 0.4, 0, 12), box(0.42, 0.42, 0.42, P.accent, 0, 3.0, 0));
  for (let k = 0; k < 3; k++) string.add(box(0.5, 0.04, 0.06, P.darkMetal, 0, 1.2 + k * 0.9, 0).rotateY((k * Math.PI) / 3));
  g.add(roundBox(2.6, 2.1, 1.9, 0.15, P.hull, 3.4, 1.05, 0), box(0.04, 0.4, 0.9, P.win, 2.09, 1.45, 0), cyl(0.12, 0.12, 1.4, P.metal, 4.2, 2.6, -0.4, 10));
  g.add(cyl(0.9, 0.9, 2.0, P.plain, 3.4, 1.0, 2.6, 32), cyl(0.92, 0.92, 0.12, P.accent, 3.4, 1.7, 2.6, 32));
  g.add(tube([V(0.3, 0.3, 0.1), V(1.2, 0.2, 0.3), V(2.1, 0.5, 0.2)], 0.08, MAT.gold, 16, 8), tube([V(3.4, 0.3, 3.5), V(2, 0.15, 5), V(-1, 0.15, 7), V(-4, 0.15, 8)], 0.08, MAT.gold, 32, 8));
  g.userData.anim = (t, dt, ctx) => { string.rotation.y += dt * (ctx && ctx.drill ? 6 : 0.8); };
  g.userData.vent = V(4.2, 3.35, -0.4);
  return shadows(g);
}

function solarMars() {
  const P = pal(true), g = new THREE.Group(), rows = 6, cols = 8, tilt = 0.6;
  const panelGeo = new THREE.BoxGeometry(1.8, 0.04, 1.0), legGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6);
  const panels = new THREE.InstancedMesh(panelGeo, P.cellsWide, rows * cols), legs = new THREE.InstancedMesh(legGeo, P.metal, rows * cols * 2);
  const o = new THREE.Object3D(), c = new THREE.Color(), r = seeded(21); let li = 0;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const x = (j - (cols - 1) / 2) * 1.95, z = (i - (rows - 1) / 2) * 2.6;
    o.position.set(x, 1.0, z); o.rotation.set(tilt, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); panels.setMatrixAt(i * cols + j, o.matrix);
    const dust = clamp(0.15 + r() * 0.5 + (i === 2 ? -0.3 : 0), 0, 1); c.setRGB(lerp(1, 0.9, dust), lerp(1, 0.66, dust), lerp(1, 0.48, dust)); panels.setColorAt(i * cols + j, c);
    for (const dz of [-0.32, 0.32]) { const h = 1.0 - Math.sin(tilt) * dz; o.position.set(x, h / 2, z + dz * Math.cos(tilt)); o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); legs.setMatrixAt(li++, o.matrix); }
  }
  panels.castShadow = panels.receiveShadow = legs.castShadow = true; g.add(panels, legs);
  for (let i = 0; i < rows; i++) g.add(box(cols * 1.95, 0.06, 0.08, P.metal, 0, 0.95, (i - (rows - 1) / 2) * 2.6));
  const bot = new THREE.Group(); g.add(bot);
  bot.add(roundBox(0.5, 0.22, 1.1, 0.06, P.accent, 0, 0.14, 0)); const br = cyl(0.07, 0.07, 1.05, P.darkMetal, 0.28, 0.0, 0, 12); br.rotation.x = Math.PI / 2; bot.add(br);
  const z2 = (2 - (rows - 1) / 2) * 2.6;
  g.add(roundBox(1.2, 1.0, 0.8, 0.08, P.hull, (cols / 2) * 1.95 + 1.2, 0.5, 0), tube([V((cols / 2) * 1.95 + 0.6, 0.2, 0), V((cols / 2) * 1.95 + 4, 0.1, 2), V((cols / 2) * 1.95 + 9, 0.1, 3)], 0.05, P.rubber, 24, 6));
  g.userData.anim = (t) => { const k = (Math.sin(t * 0.25) * 0.5 + 0.5) * (cols - 1) - (cols - 1) / 2; bot.position.set(k * 1.95, 1.0 + 0.06, z2); bot.rotation.set(tilt, 0, 0); };
  return shadows(g);
}

export const SKY_BUILDERS = {
  skHangar: () => hangar(false), skHangarMars: hangarMars, skHabMoon: habMoon, skPad: () => pad(false), skPadMars: padMars, skVSAT: vsat, skIceMoon: iceMoon,
  skFission: fission, skComms: () => comms(false), skCommsMars: commsMars, skPRover: pRover, skIceHome: iceHome, skGreenhouse: greenhouse, skKilopower: kilopower,
  skMoxie: moxie, skDrill: drill, skSolarMars: solarMars, skHopper: () => hopper(false), skHopperMars: () => hopper(true),
};

// how the bases are laid out on the ground (surface.js frame: +x east, -z north; [x, z, heading])
export const BASE_LAYOUT = {
  site: {
    // on the ridge: Shackleton's rim drops away to the west; the Sun skims the horizon
    'skylab-moon': { rough: 0.35, rocks: 0.45, hills: 0.55, sunEl: 2.5, sunAz: 120, craters: [[-1560, 0, 1500, 0.13]] },
    'skylab-mars': { rough: 0.3, rocks: 0.6, hills: 0.35, polygons: true, polyTint: 0.12 }, // Arcadia's ice-wedge polygons, without polar frost
  },
  place: {
    'sk-hab-moon': [0, 0, 0.2], 'sk-bay-moon': [30, -8, -0.15], 'sk-pad-moon': [78, 40, -0.474], 'sk-vsat': [-50, -18, 0], 'sk-ice-moon': [-18, 34, 0.5],
    'sk-fsp': [12, -72, 0], 'sk-comms-moon': [-30, 4, 0], 'sk-rover-moon': [13, 15, 0.9],
    'sk-icehome': [0, 0, 0], 'sk-bay-mars': [30, -6, -0.1], 'sk-pad-mars': [80, 40, -0.474], 'sk-greenhouse': [-24, 16, 0.3], 'sk-kilopower': [-10, -52, 0],
    'sk-moxie': [-30, -14, 0.4], 'sk-drill': [16, 26, 0.6], 'sk-solar-mars': [-52, 30, 0], 'sk-comms-mars': [10, -26, 0],
  },
  radius: { skHangar: 13, skHangarMars: 13, skHabMoon: 12, skPad: 27, skPadMars: 27, skVSAT: 10, skIceMoon: 7, skFission: 6, skComms: 2.5, skCommsMars: 2.5, skPRover: 3,
    skIceHome: 9, skGreenhouse: 8, skKilopower: 8, skMoxie: 4, skDrill: 5, skSolarMars: 10 },
  rover: { skPRover: { max: 3.2, accel: 1.1, wb: 3.2, track: 2.64, turn: 0.42, tread: 0.38, fwd: 0, name: 'Pressurised Rover', note: 'NASA’s crew-rover designs cruise at about 10 km/h.' } },
};

// ================================================================ the repair bay
const REAL_SIZE = { lm: 9.4, mer: 2.3, viking: 3.0, insight: 6.0, ingenuity: 1.2 };
const ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// soft particles: sparks, dust, vapour
function particles(n, additive) {
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3), age = new Float32Array(n).fill(1), life = new Float32Array(n), size = new Float32Array(n), alpha = new Float32Array(n), grav = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 500 } },
    vertexShader: 'attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(-mv.z, 0.1) : 0.0; }',
    fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  let next = 0;
  return {
    pts, mat,
    emit(p, v, lf, sz, c, g = 0) { const i = next; next = (next + 1) % n; pos.set([p.x, p.y, p.z], i * 3); vel.set([v.x, v.y, v.z], i * 3); col.set(c, i * 3); age[i] = 0; life[i] = lf; size[i] = sz; grav[i] = g; },
    update(dt, drag, floorAt) {
      const k = Math.exp(-dt * drag);
      for (let i = 0; i < n; i++) {
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        age[i] += dt; const j = i * 3;
        vel[j + 1] -= grav[i] * dt; vel[j] *= k; vel[j + 1] *= k; vel[j + 2] *= k;
        pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
        const fl = floorAt(pos[j], pos[j + 2]); if (pos[j + 1] < fl) { pos[j + 1] = fl; vel[j + 1] *= -0.35; vel[j] *= 0.6; vel[j + 2] *= 0.6; }
        const t = age[i] / life[i]; alpha[i] = sstep(0, 0.05, t) * (1 - sstep(0.5, 1, t));
      }
      geo.attributes.position.needsUpdate = geo.attributes.aAlpha.needsUpdate = geo.attributes.aColor.needsUpdate = geo.attributes.aSize.needsUpdate = true;
    },
    clear() { age.fill(1); life.fill(0); alpha.fill(0); geo.attributes.aAlpha.needsUpdate = true; },
  };
}
// a soft ellipsoid of light around the machine: scan line, electric dust shield, data, power test
const shellMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uColor: { value: new THREE.Color(0.3, 1, 0.9) }, uTime: { value: 0 }, uAmp: { value: 0 }, uLine: { value: -99 }, uBands: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform vec3 uColor; uniform float uTime, uAmp, uLine, uBands; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){ float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.2);
      float bands = uBands * smoothstep(0.55, 1.0, sin(vW.y * 16.0 - uTime * 5.0 + sin(vW.x * 3.0 + uTime) * 1.5) * 0.5 + 0.5);
      float line = exp(-pow((vW.y - uLine) / 0.035, 2.0)) * 1.6;
      float a = uAmp * (f * 0.55 + bands * (0.25 + f) + line);
      gl_FragColor = vec4(uColor * a, a); }`,
});

export function createRepairBay({ renderer, canvas, loadModel, host }) {
  let built = null, active = false, job = null, resolveJob = null, camTween = null, lastUser = 0, queueCtx = null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enabled: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.9, enablePan: false, minDistance: 2.4, maxDistance: 16, maxPolarAngle: Math.PI / 2 - 0.04, autoRotateSpeed: 0.45 });
  controls.addEventListener('start', () => { camTween = null; lastUser = performance.now(); });
  const fx = [];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ building the hall (once per world)
  function build(mars) {
    const P = pal(mars), T = TX(), g = new THREE.Group(), R = 8.5, L = 30;
    const wallMat = std({ color: 0xa9adb3, map: T.rep(T.hull, 10, 6), normalMap: T.rep(T.seamN, 10, 6), normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.62, metalness: 0.18, side: THREE.BackSide, envMapIntensity: 0.3 });
    g.add(mesh(new THREE.CylinderGeometry(R, R, L, 96, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), wallMat));
    const floor = mesh(new THREE.PlaneGeometry(2 * R, L).rotateX(-Math.PI / 2), std({ color: 0xffffff, map: T.rep(T.floor, R, L / 2), normalMap: T.rep(T.floorN, R * 2, L), roughnessMap: T.rep(T.floorR, R, L / 2), roughness: 0.5, metalness: 0.5, envMapIntensity: 0.45 }));
    floor.receiveShadow = true; g.add(floor);
    for (const s of [-1, 1]) g.add(box(0.16, 0.01, L - 2, P.yellow, s * 4.6, 0.006, 0));
    const ribGeo = new THREE.TorusGeometry(R - 0.14, 0.17, 6, 56, Math.PI);
    for (let z = -L / 2 + 1; z <= L / 2 - 1; z += 2.5) g.add(mesh(ribGeo, P.darkMetal, 0, 0, z));
    const stripMat = mars ? glowMat(3.2, 2.9, 2.5) : glowMat(2.6, 2.9, 3.3);
    for (let z = -L / 2 + 2.25; z < L / 2; z += 5) { const s = mesh(new THREE.TorusGeometry(R - 0.36, 0.05, 4, 40, Math.PI * 0.62), stripMat, 0, 0, z); s.rotation.z = Math.PI * 0.19; g.add(s); }
    // back wall: airlock door and signage
    const semi = new THREE.Shape(); semi.moveTo(R, 0); semi.lineTo(-R, 0); semi.absarc(0, 0, R, Math.PI, 0, true);
    const endMat = std({ color: 0xbfc2c7, map: T.rep(T.hull, 4, 3), normalMap: T.rep(T.seamN, 4, 3), roughness: 0.6, metalness: 0.2 });
    g.add(mesh(new THREE.ShapeGeometry(semi, 48), endMat, 0, 0, -L / 2), mesh(new THREE.ShapeGeometry(semi, 48), endMat, 0, 0, L / 2).rotateY(Math.PI));
    const door = new THREE.Group(); door.position.z = -L / 2 + 0.2; g.add(door);
    for (const s of [-1, 1]) { door.add(box(3.6, 6, 0.3, P.hull, s * 1.82, 3, 0), box(0.16, 6, 0.36, P.hazardV, s * 3.7, 3, 0), box(0.5, 0.4, 0.04, P.win, s * 1.5, 4.4, 0.17)); }
    door.add(box(7.6, 0.4, 0.4, P.hazard, 0, 6.2, 0), box(0.06, 6, 0.36, P.darkMetal, 0, 3, 0));
    const sign = signPlane(signTex([mars ? 'ARCADIA SKYLAB' : 'SHACKLETON SKYLAB', mars ? 'REPAIR BAY 02 · MARS' : 'REPAIR BAY 01 · MOON'], { accent: mars ? '#ff9a5c' : '#4fe0cb', size: 96 }), 6.4, 1.6); sign.position.set(0, 7.25, -L / 2 + 0.25); g.add(sign);
    const beacons = []; for (const s of [-1, 1]) { const b = beacon(P.amber); b.scale.setScalar(2); b.position.set(s * 4.3, 6.4, -L / 2 + 0.4); g.add(b); beacons.push(b); }
    // a viewport on the left wall, looking out at the surface
    const view = toTex(makeCanvas(1024, 512, (c, w, h) => {
      const r = seeded(mars ? 7 : 8);
      if (mars) { const gr = c.createLinearGradient(0, 0, 0, h * 0.7); gr.addColorStop(0, '#6e5442'); gr.addColorStop(1, '#d6a57c'); c.fillStyle = gr; c.fillRect(0, 0, w, h); const s = c.createRadialGradient(w * 0.7, h * 0.32, 0, w * 0.7, h * 0.32, 90); s.addColorStop(0, 'rgba(235,245,255,.95)'); s.addColorStop(0.15, 'rgba(160,190,230,.45)'); s.addColorStop(1, 'rgba(160,190,230,0)'); c.fillStyle = s; c.fillRect(0, 0, w, h); }
      else { c.fillStyle = '#020306'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const v = (120 + r() * 135) | 0; c.fillStyle = `rgba(${v},${v},${v + 10},${0.4 + r() * 0.6})`; c.fillRect(r() * w, r() * h * 0.7, 1 + r(), 1 + r()); }
        const ex = w * 0.28, ey = h * 0.36, er = 46; const e = c.createRadialGradient(ex - 14, ey - 10, 4, ex, ey, er); e.addColorStop(0, '#cfe2ff'); e.addColorStop(0.5, '#3f78c8'); e.addColorStop(1, '#0c1d3e'); c.fillStyle = e; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(ex - 20 + r() * 40, ey - 25 + r() * 50, 6 + r() * 14, 2 + r() * 4, r() * 3, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(ex + 18, ey, er, -Math.PI / 2, Math.PI / 2); c.ellipse(ex + 18, ey, 18, er, 0, Math.PI / 2, -Math.PI / 2, true); c.fill(); }
      for (let layer = 0; layer < 3; layer++) { const base = h * (0.6 + layer * 0.12); c.fillStyle = mars ? ['#a86a46', '#8f5536', '#6e3e27'][layer] : ['#2b2a28', '#4a4844', '#6d6a64'][layer]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 16) c.lineTo(x, base - (Math.sin(x * 0.004 * (layer + 1) + layer * 2) * 0.5 + 0.5) * 60 * (1.2 - layer * 0.3) - r() * 6); c.lineTo(w, h); c.fill(); }
      if (!mars) { c.fillStyle = 'rgba(255,245,225,.85)'; for (let i = 0; i < 4; i++) c.fillRect(w * (0.55 + i * 0.09), h * 0.6 - 120 + i * 4, 6, 120); } // the solar towers outside
    }));
    const vp = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.2), new THREE.MeshBasicMaterial({ map: view })); vp.position.set(-7.46, 3.0, -6.5); vp.rotation.y = Math.PI / 2; g.add(vp);
    for (const [w, h, y, z] of [[5.6, 0.22, 4.15, -6.5], [5.6, 0.22, 1.85, -6.5], [0.22, 2.4, 3, -3.8], [0.22, 2.4, 3, -9.2]]) g.add(box(1.2, h, w === 0.22 ? 0.22 : w, P.darkMetal, -7.0, y, z));
    // gantry crane
    for (const s of [-1, 1]) g.add(box(0.34, 0.46, L - 2, P.yellow, s * 5.6, 6.0, 0));
    const crane = new THREE.Group(); crane.position.set(0, 6.5, 0); g.add(crane);
    crane.add(box(11.6, 0.55, 0.6, P.yellow), box(0.6, 0.56, 0.62, P.hazard, -5.5, 0, 0), box(0.6, 0.56, 0.62, P.hazard, 5.5, 0, 0), roundBox(1.1, 0.5, 0.9, 0.08, P.darkMetal, 0, -0.45, 0));
    const hoist = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), P.darkMetal); hoist.geometry.translate(0, -0.5, 0); hoist.position.y = -0.7; crane.add(hoist);
    const hook = new THREE.Group(); hook.add(box(0.34, 0.3, 0.2, P.yellow), new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 8, 20, Math.PI * 1.4), P.metal).translateY(-0.25)); crane.add(hook);
    // cradle with an accent ring, scan rails
    g.add(lathe([[0.001, 0], [2.75, 0], [2.8, 0.08], [2.64, 0.32], [2.44, 0.36], [0.001, 0.36]], P.darkMetal, 96));
    const plate = cyl(2.42, 2.42, 0.02, std({ color: 0x6d737c, metalness: 0.8, roughness: 0.32, envMapIntensity: 0.9 }), 0, 0.37, 0, 96); g.add(plate);
    const ringMat = mars ? glowMat(3.2, 1.3, 0.5) : glowMat(0.5, 3, 2.6); ringMat.userData.idle = ringMat.color.clone(); const cring = new THREE.Mesh(new THREE.TorusGeometry(2.66, 0.03, 8, 160), ringMat); cring.rotation.x = Math.PI / 2; cring.position.y = 0.22; g.add(cring);
    const scanRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 128), glowMat(0.6, 3.2, 3.0)); scanRing.rotation.x = Math.PI / 2; g.add(scanRing);
    const sheetTex = toTex(makeCanvas(256, 256, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, w * 0.2, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(80,255,230,0)'); gr.addColorStop(0.85, 'rgba(80,255,230,.35)'); gr.addColorStop(1, 'rgba(80,255,230,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }));
    const sheet = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); g.add(sheet);
    const rails = [0, 1].map(() => { const r = new THREE.Group(); r.add(box(0.16, 4.6, 0.22, P.darkMetal, 0, 2.3, 0), box(0.18, 0.14, 0.3, P.accent, 0, 4.6, 0)); g.add(r); return r; });
    const carriages = rails.map((r, k) => { const c = box(0.3, 0.22, 0.36, P.accent); c.position.y = 0.06; r.add(c); r.position.set((k ? -1 : 1) * 1.4, 0.36, -1.4); return c; });
    scanRing.scale.setScalar(1.95); scanRing.position.y = 0.42; sheet.visible = false;
    // robot arms and their parts tables
    const arms = [1, -1].map((s) => {
      const A = robotArm(P); A.side = s; A.root.position.set(s * 3.8, 0, -1.4); g.add(A.root);
      A.tray = V(s * 3.15, 0.95, 1.55);
      g.add(roundBox(1.2, 0.08, 0.8, 0.03, P.darkMetal, s * 3.15, 0.9, 1.55), box(0.08, 0.86, 0.08, P.metal, s * 3.15 - 0.5, 0.43, 1.55 - 0.32), box(0.08, 0.86, 0.08, P.metal, s * 3.15 + 0.5, 0.43, 1.55 - 0.32), box(0.08, 0.86, 0.08, P.metal, s * 3.15 - 0.5, 0.43, 1.55 + 0.32), box(0.08, 0.86, 0.08, P.metal, s * 3.15 + 0.5, 0.43, 1.55 + 0.32));
      const yaw = Math.atan2(-A.root.position.x, -A.root.position.z); A.rest = { yaw, a1: -0.25, a2: 2.05, a3: 0.75 }; Object.assign(A.cur, A.rest); Object.assign(A.tgt, A.rest);
      return A;
    });
    // workstations with live screens
    const screenC = makeCanvas(1024, 512, () => {}), screenTex = toTex(screenC);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const consoles = [];
    for (const [x, z, ry] of [[5.6, 4.6, -0.9], [-5.6, 4.6, 0.9]]) {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
      c.add(roundBox(1.8, 0.9, 0.8, 0.05, P.darkMetal, 0, 0.45, 0), box(1.9, 0.05, 0.9, P.metal, 0, 0.92, 0));
      const s = mesh(new THREE.PlaneGeometry(1.7, 0.85), screenMat, 0, 1.55, -0.2); s.rotation.x = -0.18; c.add(s, box(1.8, 0.95, 0.06, P.darkMetal, 0, 1.55, -0.24).rotateX(-0.18));
      consoles.push(s);
    }
    // parts racks along the right wall
    for (const z of [-9, -6.4]) {
      const rack = new THREE.Group(); rack.position.set(6.6, 0, z); rack.rotation.y = -Math.PI / 2; g.add(rack);
      for (const x of [-1.1, 1.1]) for (const zz of [-0.35, 0.35]) rack.add(box(0.06, 2.6, 0.06, P.metal, x, 1.3, zz));
      for (const y of [0.4, 1.2, 2.0]) rack.add(box(2.3, 0.05, 0.8, P.darkMetal, 0, y, 0));
      const r = seeded(Math.abs(z * 10));
      for (const y of [0.43, 1.23, 2.03]) for (let i = 0; i < 4; i++) { const k = r(); rack.add(k < 0.5 ? roundBox(0.38, 0.28, 0.5, 0.04, k < 0.25 ? P.accent : P.hull, -0.8 + i * 0.52, y + 0.15, 0) : cyl(0.15, 0.15, 0.4, k < 0.75 ? P.metal : MAT.gold, -0.8 + i * 0.52, y + 0.2, 0, 16)); }
    }
    for (let i = 0; i < 3; i++) g.add(crate(P, 1.4, 0.9, 1.0).translateX(-6.2 + i * 0.1).translateZ(3 + i * 1.15).rotateY(0.1 * i));
    // infrared heater lamps (rise from the floor for warming steps)
    const irMat = glowMat(0.2, 0.05, 0.02);
    const heaters = [1, -1].map((s) => { const h = new THREE.Group(); h.add(cyl(0.06, 0.06, 2.2, P.metal, 0, 1.1, 0, 10), roundBox(1.4, 0.9, 0.18, 0.06, P.darkMetal, 0, 2.2, 0), box(1.2, 0.72, 0.02, irMat, 0, 2.2, 0.1)); h.position.set(0, -3, s * 3.0); h.rotation.y = s > 0 ? Math.PI : 0; g.add(h); return h; });
    // lights
    const hemi = new THREE.HemisphereLight(mars ? 0xffe9d6 : 0xd6e6ff, 0x1a1b1e, 0.28);
    const key = new THREE.SpotLight(0xfff6ec, 340, 34, 0.5, 0.65, 1.6); key.position.set(4.2, 7.6, 5.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.02; key.shadow.camera.near = 2; key.shadow.camera.far = 30;
    const fill = new THREE.SpotLight(mars ? 0xffd9b8 : 0xbfd4ff, 110, 30, 0.7, 0.8, 1.6); fill.position.set(-5.6, 7.2, 3.2);
    const rim = new THREE.SpotLight(P.accentHex, 260, 30, 0.45, 0.7, 1.6); rim.position.set(0, 6.8, -9);
    [key, fill, rim].forEach((l) => { l.target.position.set(0, 1.2, 0); g.add(l, l.target); });
    const work = new THREE.PointLight(0x9fd0ff, 0, 7, 2), heat = new THREE.PointLight(0xff7a2a, 0, 9, 2);
    g.add(hemi, work, heat);
    // light shafts and motes
    const shaftMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: new THREE.Color(1, 0.97, 0.92) } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uC; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.5); float a = 0.05 * vY * e; gl_FragColor = vec4(uC * a, a); }' });
    for (const l of [key, fill]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1, 48, 1, true), shaftMat); const a = l.position.clone(), b = V(0, 0.3, 0), d = a.clone().sub(b); cone.scale.set(1, d.length(), 1); cone.position.copy(b).addScaledVector(d, 0.5); cone.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(cone); }
    const motes = particles(500, true); g.add(motes.pts);
    const sparks = particles(1400, true), puffs = particles(2600, false); g.add(sparks.pts, puffs.pts);
    // effect helpers
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), shellMat()); shell.visible = false; g.add(shell);
    const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uT, uA; varying vec2 vU; void main(){ float p = smoothstep(0.6, 1.0, sin(vU.y * 60.0 - uT * 14.0) * 0.5 + 0.5); float a = uA * (0.25 + p); gl_FragColor = vec4(vec3(0.35, 1.0, 0.6) * a * 2.0, a); }' });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8, 1, true), beamMat); beam.visible = false; g.add(beam);
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 1.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); pulse.position.y = 0.39; g.add(pulse);
    const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0x9fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); tip.scale.setScalar(0.5); g.add(tip);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(flash);
    g.traverse((o) => { if (!o.isMesh || o.material.transparent || o.material.isShaderMaterial || o.material.isMeshBasicMaterial) return; o.receiveShadow = true; if (o !== floor && o.material !== wallMat && o.material !== endMat) o.castShadow = true; });
    return { mars, P, g, crane, hoist, hook, scanRing, sheet, rails, carriages, arms, consoles, screenC, screenTex, ringMat, heaters, irMat, work, heat, motes, sparks, puffs, shell, beam, pulse, tip, flash, beacons, env: null };
  }
  const glowSprite = lazy(() => toTex(makeCanvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); })));
  const markerTex = lazy(() => toTex(makeCanvas(128, 128, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(w / 2, w / 2, 44, 0, TAU); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(w / 2, w / 2, 58, 0.3, 1.2); g.stroke(); g.beginPath(); g.arc(w / 2, w / 2, 58, 3.4, 4.3); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, 10, 0, TAU); g.fill(); })));
  const halls = {};
  function hall(mars) {
    const k = mars ? 'mars' : 'moon';
    if (!halls[k]) { halls[k] = build(mars); }
    Object.values(halls).forEach((h) => { if (h.g.parent) scene.remove(h.g); });
    scene.add(halls[k].g); built = halls[k];
    if (!scene.environment) { const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose(); }
    scene.background = new THREE.Color(mars ? 0x0c0a09 : 0x07090c); scene.fog = new THREE.Fog(scene.background.getHex(), 18, 40);
    return built;
  }

  // ------------------------------------------------------------ arms: inverse kinematics
  function aim(A, T, approach) {
    const S = A.root.position.clone().add(V(0, A.SH, 0));
    const n = (approach || T.clone().sub(S)).clone().normalize(), W = T.clone().addScaledVector(n, -A.TOOL - 0.06), d = W.clone().sub(S);
    const yaw = Math.atan2(d.x, d.z), h = Math.hypot(d.x, d.z), v = d.y;
    const r = clamp(Math.hypot(h, v), Math.abs(A.L1 - A.L2) + 0.05, A.L1 + A.L2 - 0.02), phi = Math.atan2(h, v);
    const alpha = Math.acos(clamp((A.L1 * A.L1 + r * r - A.L2 * A.L2) / (2 * A.L1 * r), -1, 1)), inner = Math.acos(clamp((A.L1 * A.L1 + A.L2 * A.L2 - r * r) / (2 * A.L1 * A.L2), -1, 1));
    const a1 = phi - alpha, a2 = Math.PI - inner, hn = n.x * Math.sin(yaw) + n.z * Math.cos(yaw), psi = Math.atan2(hn, n.y);
    Object.assign(A.tgt, { yaw, a1, a2, a3: psi - a1 - a2 });
  }
  const rest = (A) => Object.assign(A.tgt, A.rest);
  const toolTip = (A, out = V()) => A.wrist.localToWorld(out.set(0, A.TOOL, 0));
  function useTool(A, name) { Object.entries(A.tools).forEach(([k, t]) => { t.visible = k === name; }); }
  let servo = null;
  function stepArms(dt) {
    let moved = 0;
    for (const A of built.arms) {
      const k = 1 - Math.exp(-dt * 4.2), c = A.cur, t = A.tgt;
      moved += Math.abs(Math.atan2(Math.sin(t.yaw - c.yaw), Math.cos(t.yaw - c.yaw))) + Math.abs(t.a1 - c.a1) + Math.abs(t.a2 - c.a2) + Math.abs(t.a3 - c.a3);
      c.yaw += Math.atan2(Math.sin(t.yaw - c.yaw), Math.cos(t.yaw - c.yaw)) * k; c.a1 += (t.a1 - c.a1) * k; c.a2 += (t.a2 - c.a2) * k; c.a3 += (t.a3 - c.a3) * k;
      poseArm(A, c.yaw, c.a1, c.a2, c.a3);
    }
    if (servo) servo.set(clamp(moved * 4.2 / 3, 0, 1));
  }

  // ------------------------------------------------------------ the machine on the cradle
  let obj = null;
  function placeObject(model) {
    if (obj) { built.g.remove(obj.holder); obj.markers.forEach((m) => built.g.remove(m.s)); obj.parts.forEach((p) => p.parent && p.parent.remove(p)); }
    model.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(model); const size0 = bb.getSize(V());
    const s = Math.min(3.0 / Math.max(size0.x, size0.z, 1e-6), 2.7 / Math.max(size0.y, 1e-6));
    model.scale.multiplyScalar(s); model.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(model); const c = bb.getCenter(V());
    model.position.x -= c.x; model.position.z -= c.z; model.position.y -= bb.min.y;
    const holder = new THREE.Group(); holder.add(model); built.g.add(holder);
    holder.updateMatrixWorld(true);
    const box3 = new THREE.Box3().setFromObject(holder).translate(V(0, 0.38, 0)); holder.position.y = 0.38;
    // private materials, so the dust and frost don't touch the cached model
    const mats = [];
    model.traverse((o) => {
      if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      const cl = arr.map((m) => { if (!m || !m.color) return m; const k = m.clone(); mats.push({ m: k, c: k.color.clone(), r: k.roughness ?? 0.5, mt: k.metalness ?? 0, e: k.emissive ? k.emissive.clone() : null }); if ('envMapIntensity' in k) k.envMapIntensity = 0.9; return k; });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    });
    // points on the surface, for dust and vapour
    const surf = []; const vv = V();
    model.traverse((o) => { if (!o.isMesh || !o.geometry.attributes.position) return; const p = o.geometry.attributes.position, step = Math.max(1, Math.floor(p.count / 300)); for (let i = 0; i < p.count; i += step) { vv.fromBufferAttribute(p, i); o.localToWorld(vv); surf.push(vv.clone().add(V(0, 0.38, 0))); } });
    const size = box3.getSize(V()), center = box3.getCenter(V());
    obj = { holder, model, scale: s, box: box3, size, center, radius: Math.max(size.x, size.z) / 2, mats, surf, markers: [], parts: [], dirt: 0, heat: 0, kind: 'dust' };
    return obj;
  }
  function setDirt(v, heatV = obj.heat) {
    obj.dirt = v; obj.heat = heatV;
    const dc = obj.kind === 'frost' ? new THREE.Color(0.93, 0.95, 0.98) : built.mars ? new THREE.Color(0.62, 0.38, 0.24) : new THREE.Color(0.5, 0.49, 0.47);
    for (const o of obj.mats) {
      o.m.color.copy(o.c).lerp(dc, v * (obj.kind === 'frost' ? 0.7 : 0.6));
      if ('roughness' in o.m) o.m.roughness = lerp(o.r, 0.95, v * 0.9);
      if ('metalness' in o.m) o.m.metalness = o.mt * (1 - 0.65 * v);
      if (o.e) o.m.emissive.copy(o.e).lerp(new THREE.Color(1, 0.35, 0.08), heatV * 0.5);
    }
  }
  const atPoint = (at) => { const b = obj.box; return V(obj.center.x + at[0] * obj.size.x * 0.5, b.min.y + at[1] * obj.size.y, obj.center.z + at[2] * obj.size.z * 0.5); };
  function addMarkers(plan) {
    plan.steps.forEach((st, i) => {
      if (!st.at) return;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex(), color: new THREE.Color(3, 0.5, 0.4), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
      s.position.copy(atPoint(st.at)); s.scale.setScalar(0.32); s.renderOrder = 10; built.g.add(s);
      obj.markers.push({ s, step: i, on: 0, done: false, fade: 0 });
    });
  }
  function nearSurf(p, n) { return obj.surf.map((q) => [q, q.distanceToSquared(p)]).sort((a, b) => a[1] - b[1]).slice(0, n).map((a) => a[0]); }
  function makePart(kind, fresh) {
    const P = built.P, g = new THREE.Group(), s = clamp(obj.radius * 0.18, 0.14, 0.3);
    if (kind === 'battery') { g.add(roundBox(s * 1.5, s, s, s * 0.12, fresh ? P.darkMetal : std({ color: 0x5a4a3c, roughness: 0.9 })), box(s * 0.25, s * 0.18, s * 0.25, P.metal, -s * 0.4, s * 0.55, 0), box(s * 0.25, s * 0.18, s * 0.25, P.metal, s * 0.4, s * 0.55, 0)); if (fresh) g.add(box(s * 0.6, s * 0.08, s * 1.01, P.green, 0, 0.1 * s, 0)); }
    else if (kind === 'capsule') { g.add(cyl(s * 0.4, s * 0.4, s * 1.6, fresh ? glowMat(3, 1.2, 0.3) : std({ color: 0x3a2e28, roughness: 0.8 }), 0, 0, 0, 16)); for (let k = 0; k < 6; k++) g.add(box(s * 0.04, s * 1.5, s * 0.5, P.darkMetal, Math.cos((k / 6) * TAU) * s * 0.5, 0, Math.sin((k / 6) * TAU) * s * 0.5).rotateY(-(k / 6) * TAU)); }
    else if (kind === 'motor') { const m = cyl(s * 0.5, s * 0.5, s * 0.9, fresh ? P.metal : std({ color: 0x4e4740, roughness: 0.85 }), 0, 0, 0, 24); m.rotation.z = Math.PI / 2; g.add(m, cyl(s * 0.2, s * 0.2, s * 1.3, P.darkMetal, 0, 0, 0, 12).rotateZ(Math.PI / 2)); }
    else if (kind === 'blade') { g.add(box(s * 4.5, s * 0.05, s * 0.6, fresh ? std({ color: 0x1d1f23, roughness: 0.35, metalness: 0.3 }) : std({ color: 0x3a3631, roughness: 0.9 }))); }
    else if (kind === 'camera') { g.add(roundBox(s * 0.8, s * 1.2, s * 0.8, s * 0.1, P.plain), cyl(s * 0.25, s * 0.3, s * 0.4, P.glass, 0, s * 0.2, s * 0.45, 16).rotateX(Math.PI / 2)); }
    else { g.add(box(s * 2.4, s * 0.06, s * 1.6, fresh ? P.cells : std({ color: 0x5a4d3e, roughness: 0.9 }))); } // panel
    shadows(g); obj.parts.push(g); return g;
  }

  // ------------------------------------------------------------ steps
  function task(dur, update, end) { return new Promise((res) => { fx.push({ t: 0, dur, update, end() { if (end) end(); res(); } }); }); }
  const lookAt = (p, dist = 4.6, dur = 1.0) => {
    const off = camera.position.clone().sub(controls.target); off.setLength(dist); if (off.y < 0.8) off.y = 0.8;
    camTween = { t: 0, dur: reduced() ? 0.01 : dur, fp: camera.position.clone(), ft: controls.target.clone(), tp: p.clone().add(off), tt: p.clone() };
  };
  const overview = (dur = 1.2) => { const t = obj.center.clone(); t.y = obj.box.min.y + obj.size.y * 0.45; const d = Math.max(5.2, obj.radius * 3.2 + 2.2); const off = camera.position.clone().sub(controls.target).setY(0).normalize(); if (!off.lengthSq()) off.set(0.6, 0, 0.8); camTween = { t: 0, dur: reduced() ? 0.01 : dur, fp: camera.position.clone(), ft: controls.target.clone(), tp: t.clone().addScaledVector(off, d * 0.85).add(V(0, d * 0.42, 0)), tt: t }; };
  const g0 = () => (built.mars ? 3.71 : 1.62);
  const floorAt = (x, z) => (Math.hypot(x, z) < 2.42 ? 0.38 : 0);
  function resolveMarker(i) { const m = obj.markers.find((x) => x.step === i); if (m) { m.done = true; m.s.material.color.setRGB(0.4, 3, 1.1); } }
  async function runStep(st, i) {
    const base = built, P = base.P, T = st.at ? atPoint(st.at) : obj.center.clone().setY(obj.box.min.y + obj.size.y * 0.6);
    const arm = base.arms[T.x >= 0 ? 0 : 1];
    if (st.kind === 'scan') {
      const y0 = 0.45, y1 = obj.box.max.y + 0.25; base.shell.visible = true; sfx.scan(4.2);
      lookAt(obj.center.clone().setY(obj.box.min.y + obj.size.y * 0.5), Math.max(5.4, obj.radius * 3.4 + 2), 0.9);
      await task(4.2, (t) => {
        const k = t < 2.1 ? easeIO(t / 2.1) : easeIO(1 - (t - 2.1) / 2.1), y = lerp(y0, y1, k);
        base.scanRing.position.y = base.sheet.position.y = y; base.carriages.forEach((c) => { c.position.y = y - 0.36; });
        base.sheet.material.opacity = 0.8; base.scanRing.visible = base.sheet.visible = true;
        const u = base.shell.material.uniforms; u.uColor.value.setRGB(0.3, 1, 0.9); u.uAmp.value = 0.55 * sstep(0, 0.3, t) * (1 - sstep(3.9, 4.2, t)); u.uLine.value = y; u.uBands.value = 0;
        if (t < 2.3) obj.markers.forEach((m) => { if (!m.on && m.s.position.y < y) m.on = 0.001; });
      }, () => { base.scanRing.position.y = base.sheet.position.y = 0.42; base.carriages.forEach((c) => { c.position.y = 0.06; }); base.sheet.visible = false; base.shell.visible = false; obj.markers.forEach((m) => { m.on = m.on || 0.001; }); });
      return;
    }
    if (st.kind === 'dust' && !base.mars) { // electrodynamic dust shield: a rippling field lifts the dust off
      base.shell.visible = true; lookAt(T, Math.max(4.6, obj.radius * 2.8 + 1.6));
      sfxPlay('field', 4.0, (t) => sstep(0, 0.4, t) * (1 - sstep(3.6, 4.0, t)));
      await task(4.0, (t, dt) => {
        const u = base.shell.material.uniforms; u.uColor.value.setRGB(0.35, 0.6, 1.0); u.uAmp.value = 0.6 * sstep(0, 0.4, t) * (1 - sstep(3.6, 4.0, t)); u.uBands.value = 1; u.uLine.value = -99;
        setDirt(obj.dirt0 * (1 - sstep(0.4, 3.4, t)));
        for (let n = 0; n < 9; n++) { const p = obj.surf[(Math.random() * obj.surf.length) | 0], out = p.clone().sub(obj.center).setY(0.3).normalize(); base.puffs.emit(p, out.multiplyScalar(0.4 + Math.random() * 0.8).add(V(0, 0.6 + Math.random(), 0)), 2.2, 0.035 + Math.random() * 0.04, [0.45, 0.44, 0.42], g0()); }
      }, () => { base.shell.visible = false; });
      return;
    }
    if (st.kind === 'dust') { // filtered CO₂ jets from the nozzle arm, sweeping round the machine
      useTool(arm, 'nozzle'); const near = nearSurf(T, 60); sfxPlay('jet', 4.4, (t) => (t > 0.9 && t < 3.9 ? 0.9 : 0));
      const c = obj.center.clone().setY(T.y), rad = T.clone().sub(c); lookAt(T, Math.max(4.6, obj.radius * 2.8 + 1.6));
      await task(4.4, (t) => {
        const sw = Math.sin(t * 1.4) * 0.8, P2 = c.clone().add(rad.clone().applyAxisAngle(UP, sw)); const out = P2.clone().sub(c).normalize().multiplyScalar(0.55).add(V(0, 0.35, 0));
        aim(arm, P2.clone().add(out), out.clone().negate());
        if (t > 0.9 && t < 3.9) {
          const tipP = toolTip(arm); for (let n = 0; n < 6; n++) base.sparks.emit(tipP, P2.clone().sub(tipP).normalize().multiplyScalar(4 + Math.random() * 2).add(V((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)), 0.25, 0.018, [0.22, 0.24, 0.28], 0);
          for (let n = 0; n < 5; n++) { const p = near[(Math.random() * near.length) | 0], v = p.clone().sub(tipP).normalize().multiplyScalar(1 + Math.random() * 1.5).add(V(0, 0.5, 0)); base.puffs.emit(p, v, 2.4, 0.05 + Math.random() * 0.06, [0.62, 0.4, 0.26], g0() * 0.2); }
          setDirt(obj.dirt0 * (1 - sstep(1, 3.8, t)));
        }
      }, () => { rest(arm); });
      return;
    }
    if (st.kind === 'heat' || st.kind === 'frost') {
      lookAt(obj.center.clone().setY(obj.box.min.y + obj.size.y * 0.5), Math.max(5.6, obj.radius * 3.2 + 2));
      const startDirt = obj.dirt;
      sfxPlay('hum', 4.4, (t) => sstep(0.8, 1.4, t) * (1 - sstep(3.7, 4.2, t))); if (st.kind === 'frost') sfxPlay('jet', 4.4, (t) => 0.35 * sstep(1, 1.6, t) * (1 - sstep(3.4, 3.9, t)));
      await task(4.4, (t) => {
        const up = easeIO(sstep(0, 0.9, t) * (1 - sstep(3.9, 4.4, t))); base.heaters.forEach((h) => { h.position.y = lerp(-3, 0, up); });
        const glow = sstep(0.8, 1.4, t) * (1 - sstep(3.7, 4.2, t)); base.irMat.color.setRGB(0.2 + 3 * glow, 0.05 + 0.9 * glow, 0.02 + 0.2 * glow); base.heat.intensity = 60 * glow; base.heat.position.copy(obj.center).setY(obj.box.max.y + 0.4);
        if (st.kind === 'frost') { setDirt(startDirt * (1 - sstep(1.2, 3.8, t)), 0); if (t > 1 && t < 3.8) for (let n = 0; n < 6; n++) { const p = obj.surf[(Math.random() * obj.surf.length) | 0]; base.puffs.emit(p, V((Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3), 2.6, 0.08 + Math.random() * 0.1, [0.9, 0.93, 0.96], -0.05); } }
        else setDirt(obj.dirt, Math.sin(Math.PI * clamp((t - 1) / 3, 0, 1)));
      }, () => { base.heat.intensity = 0; base.irMat.color.setRGB(0.2, 0.05, 0.02); setDirt(obj.dirt, 0); });
      return;
    }
    if (st.kind === 'weld') {
      useTool(arm, 'torch'); const out = T.clone().sub(obj.center).setY(0).normalize().multiplyScalar(0.25).add(V(0, 0.18, 0));
      aim(arm, T.clone().add(out.clone().multiplyScalar(0.3)), out.clone().negate()); lookAt(T, 4.6);
      const arc = sfxLoop('weld');
      await task(4.2, (t) => {
        const jit = V(Math.sin(t * 9) * 0.03, Math.cos(t * 7) * 0.02, 0); aim(arm, T.clone().add(jit).add(out.clone().multiplyScalar(0.3)), out.clone().negate());
        const on = t > 1.0 && t < 3.6 && Math.sin(t * 23) > -0.4; const tp = toolTip(arm);
        base.work.position.copy(tp); base.work.intensity = on ? 18 + Math.random() * 30 : 0; arc.set(on ? 1 : 0); base.tip.position.copy(tp); base.tip.material.opacity = on ? 0.9 : 0; base.tip.scale.setScalar(0.3 + Math.random() * 0.3);
        if (on) for (let n = 0; n < 12; n++) base.sparks.emit(tp, V((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3), 0.5 + Math.random() * 0.7, 0.006 + Math.random() * 0.008, [1.0, 0.45 + Math.random() * 0.3, 0.08], g0() * 2);
      }, () => { arc.stop(0.2); base.work.intensity = 0; base.tip.material.opacity = 0; rest(arm); });
      return;
    }
    if (st.kind === 'swap' || st.kind === 'panel') {
      useTool(arm, 'grip'); const kind = st.part || (job.item.model === 'ingenuity' ? 'blade' : st.label.match(/camera/i) ? 'camera' : 'panel');
      const out = T.clone().sub(obj.center).setY(0); if (out.lengthSq() < 1e-4) out.set(arm.side, 0, 0); out.normalize().multiplyScalar(0.35).add(V(0, 0.25, 0));
      const oldP = makePart(kind, false), newP = makePart(kind, true);
      const dropAt = arm.tray.clone().add(V(-arm.side * 0.25, 0.12, -0.15)), pickAt = arm.tray.clone().add(V(arm.side * 0.2, 0.12, 0.15));
      newP.position.copy(pickAt); base.g.add(newP);
      const wristHold = (p) => { arm.wrist.add(p); p.position.set(0, arm.TOOL + 0.08, 0); p.rotation.set(0, 0, 0); };
      lookAt(T.clone().lerp(arm.tray, 0.4), 5.2);
      let phase = 0;
      await task(5.0, (t) => {
        const fingers = (open) => arm.fingers.forEach((f, k) => { f.position.x = (k ? 1 : -1) * (open ? 0.085 : 0.06); });
        if (t < 1.2) { aim(arm, T.clone().add(out.clone().multiplyScalar(0.4)), out.clone().negate()); fingers(true); }
        else if (t < 2.3) { if (phase === 0) { phase = 1; wristHold(oldP); fingers(false); sfx.clunk(0.7); } aim(arm, dropAt.clone().add(V(0, 0.25, 0)), V(0, -1, 0)); }
        else if (t < 3.0) { if (phase === 1) { phase = 2; base.g.attach(oldP); oldP.position.copy(dropAt); oldP.rotation.set(0, 0.4, 0); fingers(true); sfx.clunk(0.5); } aim(arm, pickAt.clone().add(V(0, 0.25, 0)), V(0, -1, 0)); }
        else if (t < 4.2) { if (phase === 2) { phase = 3; wristHold(newP); fingers(false); sfx.clunk(0.4); } aim(arm, T.clone().add(out.clone().multiplyScalar(0.4)), out.clone().negate()); }
        else { if (phase === 3) { phase = 4; base.g.attach(newP); fingers(true); base.flash.position.copy(T); sfx.insert(); } const k = sstep(4.2, 4.6, t); newP.scale.setScalar(Math.max(0.001, 1 - k)); base.flash.material.opacity = Math.sin(Math.PI * clamp((t - 4.2) / 0.5, 0, 1)) * 0.8; base.flash.scale.setScalar(0.6 + k); if (t > 4.4) rest(arm); }
      }, () => { base.flash.material.opacity = 0; newP.visible = false; });
      return;
    }
    if (st.kind === 'upload') {
      const from = V(), cons = base.consoles[T.x >= 0 ? 0 : 1]; cons.getWorldPosition(from);
      base.beam.visible = true; base.shell.visible = true; lookAt(obj.center.clone().lerp(from, 0.35).setY(obj.center.y), 6.2);
      sfxPlay('data', 3.8, (t) => sstep(0, 0.4, t) * (1 - sstep(3.4, 3.8, t)));
      await task(3.8, (t) => {
        const d = T.clone().sub(from), L = d.length(); base.beam.scale.set(1, L, 1); base.beam.position.copy(from).addScaledVector(d, 0.5); base.beam.quaternion.setFromUnitVectors(UP, d.normalize());
        base.beam.material.uniforms.uT.value = t; base.beam.material.uniforms.uA.value = sstep(0, 0.4, t) * (1 - sstep(3.4, 3.8, t));
        const u = base.shell.material.uniforms; u.uColor.value.setRGB(0.35, 1, 0.55); u.uAmp.value = 0.4 * sstep(0.6, 1.2, t) * (1 - sstep(3.2, 3.8, t)); u.uBands.value = 1; u.uLine.value = -99;
      }, () => { base.beam.visible = false; base.shell.visible = false; });
      return;
    }
    if (st.kind === 'test') {
      overview(1.0); base.shell.visible = true; const startDirt = obj.dirt; sfx.powerUp();
      await task(3.6, (t) => {
        const u = base.shell.material.uniforms; u.uColor.value.setRGB(0.4, 1, 0.5); u.uAmp.value = 0.65 * sstep(0, 0.3, t) * (1 - sstep(3.1, 3.6, t)); u.uBands.value = 0;
        u.uLine.value = lerp(obj.box.min.y - 0.1, obj.box.max.y + 0.2, clamp(t / 2.2, 0, 1));
        const k = clamp((t - 0.4) / 2.2, 0, 1); base.pulse.scale.setScalar(0.5 + k * 7); base.pulse.material.opacity = k > 0 && k < 1 ? 0.7 * (1 - k) : 0;
        base.ringMat.color.copy(base.ringMat.userData.idle).lerp(new THREE.Color(0.4, 3, 0.9), k);
        if (startDirt > 0) setDirt(startDirt * (1 - k));
      }, () => { base.shell.visible = false; base.pulse.material.opacity = 0; });
    }
  }

  // ------------------------------------------------------------ UI
  host.innerHTML = `
    <div class="bay__top"><span class="bay__base" id="bay-base"></span><button type="button" class="bay__leave" id="bay-leave"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg><span>Leave the bay</span></button></div>
    <aside class="bay__panel" id="bay-panel" aria-live="polite"></aside>
    <div class="bay__hint">Drag to look around · scroll to zoom</div>`;
  const $ = (id) => host.querySelector('#' + id);
  $('bay-leave').addEventListener('click', () => leave());
  function drawScreens(line) {
    const c = built.screenC, g = c.getContext('2d'), w = c.width, h = c.height, acc = built.mars ? '#ff9a5c' : '#4fe0cb';
    g.fillStyle = '#060a10'; g.fillRect(0, 0, w, h);
    g.fillStyle = acc; g.font = '600 38px "Geist Mono", Consolas, monospace'; g.fillText(job ? job.item.name.toUpperCase() : 'REPAIR QUEUE', 36, 66);
    g.fillStyle = 'rgba(242,238,230,.7)'; g.font = '28px "Geist Mono", Consolas, monospace'; g.fillText(line || '', 36, 112);
    g.strokeStyle = 'rgba(79,224,203,.25)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(36, 160 + i * 36); g.lineTo(w - 36, 160 + i * 36); g.stroke(); }
    g.strokeStyle = acc; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < w - 72; x += 6) { const y = 300 + Math.sin(x * 0.03) * 40 * Math.sin(x * 0.004 + 1) + Math.sin(x * 0.17) * 8; x ? g.lineTo(36 + x, y) : g.moveTo(36, y); } g.stroke();
    if (job) { const n = job.plan.steps.length, d = job.done; for (let i = 0; i < n; i++) { g.fillStyle = i < d ? '#4ee38a' : i === d ? acc : 'rgba(242,238,230,.18)'; g.fillRect(36 + i * ((w - 72) / n), 440, (w - 72) / n - 10, 22); } }
    built.screenTex.needsUpdate = true;
  }
  function telRow([k, a, b], i) { return `<div data-i="${i}"><dt>${esc(k)}</dt><dd>${esc(a)}</dd></div>`; }
  function renderPanel() {
    const p = $('bay-panel');
    if (!job) { // the queue
      const q = queueCtx.queue, left = q.filter((x) => !x.repaired).length;
      p.innerHTML = `<p class="bay__eyebrow">${esc(queueCtx.base.name)} · repair queue</p><h2 class="bay__name">${left ? `${left} machine${left > 1 ? 's' : ''} <em>waiting</em>` : 'Queue <em>clear</em>'}</h2>
        <p class="bay__cause">Pick a machine. The recovery hopper flies out on ${esc(queueCtx.base.fuel)}, winches it up and brings it here.</p>
        <ul class="bay__queue">${q.map((x) => `<li><button type="button" data-q="${esc(x.id)}" class="${x.repaired ? 'is-done' : ''}"><span class="bq__t"><b>${esc(x.name)}</b><small>${esc(x.site)} · ${esc(x.km)} km</small></span><span class="bq__s">${x.repaired ? 'Repaired' : esc(x.fault)}</span></button></li>`).join('')}</ul>
        ${queueCtx.repairedCount ? `<button type="button" class="bay__reset" data-reset>Reset all repairs</button>` : ''}`;
      requestAnimationFrame(resize); return;
    }
    const { item, plan, from, done } = job, n = plan.steps.length, fin = done >= n;
    p.innerHTML = `<p class="bay__eyebrow">${from.orbit ? `Captured in orbit by a servicing tug` : `Recovered from ${esc(from.site)} · ${esc(from.km)} km hop`}</p>
      <h2 class="bay__name">${styledName(item.name)}</h2>
      <p class="bay__fault ${fin ? 'is-ok' : ''}"><i></i>${fin ? 'Operational' : esc(plan.fault)}</p>
      <p class="bay__cause">${esc(plan.cause)}</p>
      ${job.note ? `<p class="bay__note">${esc(job.note)}</p>` : ''}
      <dl class="bay__tele">${(plan.tele || []).map(telRow).join('')}</dl>
      <ol class="bay__steps">${plan.steps.map((s, i) => `<li class="${i < done ? 'is-done' : i === done ? 'is-now' : ''}"><span class="bs__n">${i < done ? ICON_OK : String(i + 1).padStart(2, '0')}</span><span class="bs__t"><b>${esc(s.label)}</b>${i === done || (i === done - 1 && job.running) ? `<small>${esc(s.text)}</small>` : ''}</span></li>`).join('')}</ol>
      <div class="bay__cta">${fin ? `<button type="button" class="act is-primary" data-go>${esc(from.orbit ? 'Release it back into orbit' : 'Return it to ' + from.site)}</button>${queueCtx ? '<button type="button" class="act" data-more>Repair another</button>' : ''}`
        : `<button type="button" class="act is-primary" data-run ${job.running || job.arriving ? 'disabled' : ''}>${job.arriving ? 'Unloading…' : job.running ? 'Working…' : `Run step ${done + 1} · ${esc(plan.steps[done].label)}`}</button>${!job.running && !job.arriving && done < n - 1 ? '<button type="button" class="act" data-all>Run all</button>' : ''}`}</div>
      <div class="bay__prog"><i style="transform:scaleX(${done / n})"></i></div>`;
    applyTele(false); requestAnimationFrame(resize); // the panel's height sets where the cradle is framed
  }
  const styledName = (n) => { const w = n.split(' '); let k = w.length - 1; while (k > 0 && !/^[A-Za-z][a-z]{2,}$/.test(w[k])) k--; return w.map((x, i) => (i === k ? `<em>${esc(x)}</em>` : esc(x))).join(' '); };
  function applyTele(flash) {
    const plan = job.plan, last = plan.steps.length - 1;
    host.querySelectorAll('.bay__tele [data-i]').forEach((el) => {
      const i = +el.dataset.i, [, a, b, at] = plan.tele[i], fixed = job.done > (at ?? last);
      const dd = el.querySelector('dd'), was = el.classList.contains('is-ok');
      dd.textContent = fixed ? b : a; el.classList.toggle('is-ok', fixed); el.classList.toggle('is-bad', !fixed);
      if (flash && fixed && !was) { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); }
    });
  }
  host.addEventListener('click', async (e) => {
    if (!active) return;
    const q = e.target.closest('[data-q]'); if (q && queueCtx && !job) { const x = queueCtx.queue.find((y) => y.id === q.dataset.q); if (x && !x.repaired) queueCtx.pick(x.id); return; }
    if (e.target.closest('[data-reset]') && queueCtx) { queueCtx.reset(); renderPanel(); drawScreens(`${queueCtx.queue.length} MACHINES WAITING`); return; }
    if (e.target.closest('[data-run]')) { runNext(); return; }
    if (e.target.closest('[data-all]')) { job.auto = true; runNext(); return; }
    if (e.target.closest('[data-go]')) { finish('return'); return; }
    if (e.target.closest('[data-more]')) { finish('more'); }
  });
  async function runNext() {
    if (!job || job.running || job.arriving || job.done >= job.plan.steps.length) return;
    job.running = true; renderPanel();
    const i = job.done, st = job.plan.steps[i];
    drawScreens(`STEP ${i + 1} / ${job.plan.steps.length} · ${st.label.toUpperCase()}`);
    narrate(`Step ${i + 1}: ${st.label}. ${st.text}`);
    await runStep(st, i);
    if (!job) return;
    resolveMarker(i); job.done++; job.running = false;
    if (job.done >= job.plan.steps.length) { obj.markers.forEach((m) => { m.done = true; }); job.auto = false; drawScreens('ALL SYSTEMS NOMINAL · OPERATIONAL'); if (job.onRepaired) job.onRepaired();
      narrate(`Repair complete. ${job.item.name} is operational.${job.plan.unlock && !job.plan.orbit ? ` ${job.plan.unlock} is unlocked when it is home.` : ''}`, { mode: 'queue' }); }
    else drawScreens(`STEP ${i + 1} COMPLETE`);
    renderPanel(); applyTele(true);
    if (job.auto && job.done < job.plan.steps.length) { const j = job, t0 = performance.now(); (function waitVoice() { if (job !== j || !j.auto) return; if (isSpeaking() && performance.now() - t0 < 16000) { setTimeout(waitVoice, 250); return; } setTimeout(runNext, 350); })(); }
  }
  function finish(action) {
    const j = job, r = resolveJob; resolveJob = null;
    if (r) r({ action, itemId: j && j.itemId, repaired: !!j && j.done >= j.plan.steps.length });
  }
  function leave() { if (!active) return; if (job && job.running) return; finish('leave'); }

  // ------------------------------------------------------------ open / close
  async function loadJob(o) {
    const P = built.P;
    const model = await loadModel(o.item.model);
    const ob = placeObject(model); ob.kind = o.plan.frost ? 'frost' : 'dust';
    const hasClean = o.plan.steps.some((s) => s.kind === 'dust' || s.kind === 'frost');
    ob.dirt0 = hasClean ? 1 : 0.35; setDirt(ob.dirt0, 0);
    const natural = (o.itemId === 'phoenix' ? 5.5 : REAL_SIZE[o.item.model]) || Math.max(...(() => { const s = new THREE.Box3().setFromObject(model).getSize(V()); return [s.x, s.z]; })()) / ob.scale;
    job = { ...o, done: 0, running: false, arriving: true, note: ob.scale > 1.35 ? `Real size ≈ ${natural < 1 ? natural.toFixed(2) : natural.toFixed(1)} m across · shown ${ob.scale.toFixed(1)}× larger here` : null };
    addMarkers(o.plan);
    const R0 = Math.max(ob.radius + 0.45, 1.5); built.scanRing.scale.setScalar(R0); built.sheet.scale.setScalar(R0); built.sheet.visible = false;
    built.scanRing.position.y = built.sheet.position.y = 0.42; built.rails.forEach((r, k) => r.position.set((k ? -1 : 1) * (R0 + 0.3) * 0.7, 0.36, -(R0 + 0.3) * 0.7)); built.carriages.forEach((c) => { c.position.y = 0.06; });
    built.ringMat.color.copy(built.ringMat.userData.idle);
    built.arms.forEach((A) => { useTool(A, 'grip'); rest(A); });
    // arrival: lowered onto the cradle by the gantry crane
    const H = 3.6; ob.holder.position.y = 0.38 + H; built.crane.position.z = 0;
    const tgt = ob.center.clone().setY(ob.box.min.y + ob.size.y * 0.45), d = Math.max(5.4, ob.radius * 3.2 + 2.4);
    camera.position.copy(tgt).add(V(d * 0.55, d * 0.55 + 1.5, d * 0.95)); controls.target.copy(tgt).add(V(0, 1.2, 0)); camera.lookAt(controls.target);
    camTween = { t: 0, dur: reduced() ? 0.01 : 2.8, fp: camera.position.clone(), ft: controls.target.clone(), tp: tgt.clone().add(V(d * 0.62, d * 0.38, d * 0.72)), tt: tgt };
    renderPanel(); drawScreens('UNLOADING · WARMING IN DRY NITROGEN');
    built.beacons.forEach((b) => { b.visible = true; });
    sfx.hiss(1.6); sfx.alarm(2.4); sfxPlay('whirr', 2.6, (t) => 0.6 * sstep(0, 0.3, t) * (1 - sstep(2.2, 2.6, t)));
    narrate(`${o.base.name}, ${o.base.bay}. ${o.item.name}, ${o.from.orbit ? 'captured in orbit' : `recovered from ${o.from.site}, ${o.from.km} kilometres away`}. Diagnosis: ${o.plan.fault}. ${o.plan.cause}`, { mode: 'replace' });
    await task(reduced() ? 0.05 : 2.6, (t) => {
      const k = easeIO(clamp(t / 2.4, 0, 1)); ob.holder.position.y = 0.38 + H * (1 - k);
      const top = ob.box.max.y + H * (1 - k) + 0.25; built.hook.position.y = top - 6.5; built.hoist.scale.y = Math.max(0.01, 6.5 - 0.7 - top + 0.15);
      built.beacons.forEach((b, i) => { b.visible = Math.sin(t * 8 + i * Math.PI) > 0; });
    }, () => { ob.holder.position.y = 0.38; sfx.clunk(1); });
    await task(reduced() ? 0.05 : 0.8, (t) => { const k = easeIO(clamp(t / 0.8, 0, 1)); built.hook.position.y = lerp(ob.box.max.y + 0.25 - 6.5, -1.4, k); built.hoist.scale.y = Math.max(0.01, -built.hook.position.y - 0.7 + 0.15); });
    built.beacons.forEach((b) => { b.visible = false; });
    if (!job) return;
    job.arriving = false; renderPanel(); drawScreens(`DIAGNOSIS · ${o.plan.fault.toUpperCase()}`);
  }
  function show(base) {
    const mars = base.body === 'mars'; hall(mars);
    $('bay-base').innerHTML = `<b>${esc(base.name)}</b> · ${esc(base.bay)}`;
    host.dataset.world = mars ? 'mars' : 'moon';
    host.hidden = false; requestAnimationFrame(() => host.classList.add('is-on'));
    active = true; controls.enabled = true; resize();
    if (!servo) servo = sfxLoop('servo');
    built.hook.position.y = -1.4; built.hoist.scale.y = 0.85;
    built.motes.clear(); built.sparks.clear(); built.puffs.clear();
  }
  function emptyCradle() {
    if (obj) { built.g.remove(obj.holder); obj.markers.forEach((m) => built.g.remove(m.s)); obj.parts.forEach((p) => p.parent && p.parent.remove(p)); obj = null; }
    const t = V(0, 1.4, 0); camera.position.set(6.5, 4.2, 8.6); controls.target.copy(t); camTween = null;
  }
  // a single repair; resolves { action: 'return' | 'leave' | 'more', repaired }
  function open(o) {
    show(o.base); job = null; queueCtx = o.queueCtx || null; emptyCradle();
    const pr = new Promise((res) => { resolveJob = res; });
    loadJob(o).catch((err) => { console.error('bay', err); finish('leave'); });
    return pr;
  }
  // the queue view (from the hangar): resolves { action: 'pick', itemId } or { action: 'leave' }
  function openQueue(ctx) {
    show(ctx.base); job = null; emptyCradle();
    queueCtx = ctx; drawScreens(`${ctx.queue.filter((x) => !x.repaired).length} MACHINES WAITING`);
    { const left = ctx.queue.filter((x) => !x.repaired).length; narrate(`${ctx.base.name}, ${ctx.base.bay}. ${left ? `${left} machines are waiting for repair.` : 'The repair queue is clear.'} Pick one, and the recovery hopper will fly out on ${ctx.base.fuel} to fetch it.`, { mode: 'replace' }); }
    renderPanel();
    return new Promise((res) => { resolveJob = res; ctx.pick = (id) => { const r = resolveJob; resolveJob = null; r({ action: 'pick', itemId: id }); }; });
  }
  function close() {
    if (servo) { servo.stop(0.3); servo = null; }
    active = false; controls.enabled = false; job = null; fx.length = 0; camTween = null;
    host.classList.remove('is-on'); setTimeout(() => { if (!active) host.hidden = true; }, 400);
  }
  function update(dt) {
    if (!active || !built) return;
    const t = performance.now() / 1000;
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; f.update(f.t, dt); if (f.t >= f.dur) { fx.splice(i, 1); f.end(); } }
    stepArms(dt);
    built.shell.material.uniforms.uTime.value = t;
    if (obj) { // shell fits the machine
      built.shell.position.copy(obj.center); built.shell.scale.set(obj.size.x * 0.62 + 0.15, obj.size.y * 0.62 + 0.15, obj.size.z * 0.62 + 0.15);
      obj.markers.forEach((m) => { if (!m.on) return; m.on = Math.min(1, m.on + dt * 3); if (m.done) m.fade = Math.min(1, m.fade + dt * 0.8); const pz = 1 + 0.15 * Math.sin(t * 5 + m.step); m.s.material.opacity = m.on * (1 - m.fade) * 0.95; m.s.scale.setScalar((0.26 + 0.06 * pz) * (1 + m.fade * 0.6) * Math.max(1, obj.radius * 0.5)); });
    }
    // dust motes drift in the light
    if (Math.random() < 0.6) built.motes.emit(V((Math.random() - 0.5) * 9, 0.3 + Math.random() * 5, (Math.random() - 0.5) * 8), V((Math.random() - 0.5) * 0.05, 0.02 + Math.random() * 0.03, (Math.random() - 0.5) * 0.05), 9, 0.014, [0.55, 0.55, 0.5], 0);
    built.motes.update(dt, 0, () => -1); built.sparks.update(dt, 0.6, floorAt); built.puffs.update(dt, built.mars ? 1.2 : 0.9, floorAt);
    if (camTween) {
      camTween.t += dt; const k = easeIO(clamp(camTween.t / camTween.dur, 0, 1));
      camera.position.lerpVectors(camTween.fp, camTween.tp, k); controls.target.lerpVectors(camTween.ft, camTween.tt, k); camera.lookAt(controls.target);
      if (k >= 1) camTween = null;
    } else { controls.autoRotate = !reduced() && performance.now() - lastUser > 6000 && !(job && job.running); controls.update(); }
  }
  function render() { // a touch darker than outside: a lit interior, not a white box
    if (!active || !built) return;
    const ex = renderer.toneMappingExposure; renderer.toneMappingExposure = 0.84; renderer.render(scene, camera); renderer.toneMappingExposure = ex;
  }
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    // the panel covers the left of the screen on wide layouts: shift the view so the cradle sits in the free area
    const W = innerWidth, H = innerHeight, panel = host.querySelector('.bay__panel'), pr = panel && panel.getBoundingClientRect();
    const dx = W > 820 && pr ? pr.right / 2 : 0, dy = W <= 820 && pr ? -(H - pr.top) / 2.2 : 0;
    camera.setViewOffset(W, H, -dx, -dy, W, H); camera.updateProjectionMatrix();
    for (const h of Object.values(halls)) [h.sparks, h.puffs, h.motes].forEach((p) => { p.mat.uniforms.uScale.value = (H * renderer.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); });
  }
  return {
    get active() { return active; }, get busy() { return !!(job && (job.running || job.arriving)); }, camera,
    open, openQueue, close, update, render, resize, escape: leave,
    _debug: () => ({ job, obj, built }),
  };
}
