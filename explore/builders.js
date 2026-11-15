/* Spacefire Explorer — built-in 3D models for hardware NASA's 3D Resources library doesn't include:
   Lunar Roving Vehicle, ALSEP science station, laser retroreflectors (Apollo 11/14 and the larger
   Apollo 15 array), Surveyor, Mars Pathfinder, Sojourner and Ranger.
   Built from mission photos and published dimensions. Units are metres; the viewer rescales to fit.
   Surface detail (crinkled foil, fabric, woven wire, solar cells, instrument dials) is generated
   into canvas textures once, at load. */
import * as THREE from 'three';

const TAU = Math.PI * 2;
// deterministic randomness: a model looks the same every time it is built
function seeded(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = seeded(1969);

// ---------------------------------------------------------------- textures
function makeCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function toTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
// tangent-space normal map from a grey height canvas (Sobel, wraps at the edges)
function normalFrom(c, strength) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x - 1, y) - H(x - 1, y + 1);
    const dy = H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1) - H(x - 1, y - 1) - 2 * H(x, y - 1) - H(x + 1, y - 1);
    const nx = -dx * strength, ny = dy * strength, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
    d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTex(out, false);
}
// draw a shape at the 9 wrapped offsets so the texture tiles without seams
const tiled = (w, h, fn) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) fn(ox, oy); };

// crinkled multilayer insulation (Kapton / aluminised Mylar)
const crinkle = makeCanvas(512, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) {
    const v = (rnd() * 255) | 0, x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 46;
    const pts = [0, 1, 2, 3].map(() => [(rnd() - 0.5) * r * 2, (rnd() - 0.5) * r * 2]);
    g.fillStyle = `rgba(${v},${v},${v},0.16)`;
    tiled(w, h, (ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => (k ? g.lineTo : g.moveTo).call(g, x + px + ox, y + py + oy)); g.closePath(); g.fill(); });
  }
  for (let i = 0; i < 90; i++) { // long creases
    const v = rnd() < 0.5 ? 30 : 225; g.strokeStyle = `rgba(${v},${v},${v},0.35)`; g.lineWidth = 0.8 + rnd() * 1.6;
    let x = rnd() * w, y = rnd() * h; const seg = [[x, y]];
    for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 140; y += (rnd() - 0.5) * 140; seg.push([x, y]); }
    tiled(w, h, (ox, oy) => { g.beginPath(); seg.forEach(([px, py], k) => (k ? g.lineTo : g.moveTo).call(g, px + ox, py + oy)); g.stroke(); });
  }
});
const crinkleN = normalFrom(crinkle, 3.2);

// soft folds for airbag fabric
const folds = makeCanvas(256, 256, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  g.filter = 'blur(3px)';
  for (let i = 0; i < 220; i++) {
    const v = rnd() < 0.5 ? 40 : 215; g.strokeStyle = `rgba(${v},${v},${v},0.3)`; g.lineWidth = 2 + rnd() * 7;
    let x = rnd() * w, y = rnd() * h; const a = rnd() * TAU, seg = [[x, y]];
    for (let k = 0; k < 3; k++) { x += Math.cos(a + (rnd() - 0.5)) * 50; y += Math.sin(a + (rnd() - 0.5)) * 50; seg.push([x, y]); }
    tiled(w, h, (ox, oy) => { g.beginPath(); seg.forEach(([px, py], k) => (k ? g.lineTo : g.moveTo).call(g, px + ox, py + oy)); g.stroke(); });
  }
  g.filter = 'none';
});
const foldsN = normalFrom(folds, 5);

// brushed aluminium (roughness streaks)
const brushed = toTex(makeCanvas(256, 256, (g, w, h) => {
  g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const v = 70 + rnd() * 90; g.fillStyle = `rgba(${v},${v},${v},0.25)`; g.fillRect(0, rnd() * h, w, 0.5 + rnd() * 1.5); }
}), false);

// solar cells: blue silicon (Apollo era / Surveyor / Ranger) or deep violet GaAs (Pathfinder, Sojourner)
function cellCanvas(dark, light, n) {
  return makeCanvas(512, 512, (g, w, h) => {
    const s = w / n;
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
      const k = 0.85 + rnd() * 0.3;
      gr.addColorStop(0, light); gr.addColorStop(1, dark);
      g.globalAlpha = k; g.fillStyle = gr; g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3); g.globalAlpha = 1;
      g.fillStyle = 'rgba(210,215,225,.55)'; // fingers + busbar
      for (let f = 1; f < 6; f++) g.fillRect(x * s + 2, y * s + (f * s) / 6, s - 4, 0.6);
      g.fillRect(x * s + s * 0.48, y * s + 2, 1.2, s - 4);
    }
  });
}
const cellsSi = toTex(cellCanvas('#0e1a3c', '#2a3f7a', 16));
const cellsGaAs = toTex(cellCanvas('#150f2e', '#3a2c6e', 16));

// woven piano-wire mesh (LRV tyres) and fine mesh (umbrella antenna)
// drawn opaque (bright wire over dark gaps) rather than cut out with alphaTest, which shimmers at a distance
function weave(n, lw, bg, fg) {
  return makeCanvas(128, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = lw; g.lineCap = 'round';
    const s = w / n;
    for (let i = -n; i <= n * 2; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s + h, h); g.stroke();
      g.beginPath(); g.moveTo(i * s, h); g.lineTo(i * s + h, 0); g.stroke();
    }
  });
}
const wireTex = toTex(weave(6, 4, '#2c2f34', '#e4e7eb')); wireTex.repeat.set(30, 3);
const dishTex = toTex(weave(10, 2.2, '#6d727a', '#eef1f4')); dishTex.repeat.set(10, 4);

// nylon seat webbing
const webbing = toTex(makeCanvas(128, 128, (g, w, h) => {
  g.fillStyle = '#4a5468'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a9b5c9' : '#9aa7bd'; g.fillRect(i * 16 + 1, 0, 13, h); g.fillRect(0, i * 16 + 1, w, 6); }
}));
webbing.repeat.set(3, 3);

// LRV control and display console
const consoleTex = toTex(makeCanvas(256, 196, (g, w, h) => {
  g.fillStyle = '#2b2e33'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#555b63'; g.lineWidth = 2; g.strokeRect(4, 4, w - 8, h - 8);
  const dial = (x, y, r) => {
    g.fillStyle = '#0d0e10'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = '#e8e6df'; g.lineWidth = 1.2;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); g.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92); g.stroke(); }
    g.strokeStyle = '#f0c060'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); const a = rnd() * TAU; g.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); g.stroke();
  };
  dial(70, 64, 34); dial(160, 64, 26); dial(214, 64, 18);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#0d0e10'; g.fillRect(20 + i * 38, 118, 28, 18); g.fillStyle = '#d8d4c8'; g.fillRect(26 + i * 38, 123, 16, 2); }
  for (let i = 0; i < 9; i++) { g.fillStyle = '#c9c4b6'; g.beginPath(); g.arc(24 + i * 26, 162, 4, 0, TAU); g.fill(); }
}));

// planar array antenna face (Surveyor)
const arrayTex = toTex(makeCanvas(256, 256, (g, w, h) => {
  g.fillStyle = '#e9e7e1'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b8b4aa';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g.fillRect(x * 32 + 10, y * 32 + 13, 12, 6);
}));

// ---------------------------------------------------------------- materials
const std = (o) => new THREE.MeshStandardMaterial(o);
const n2 = (k) => new THREE.Vector2(k, k);
export const MAT = {
  gold: std({ color: 0xd9a548, metalness: 1, roughness: 0.3, normalMap: crinkleN, normalScale: n2(0.8) }),
  foil: std({ color: 0xdfe2e7, metalness: 1, roughness: 0.22, normalMap: crinkleN, normalScale: n2(0.8) }),
  alu: std({ color: 0xc4c8ce, metalness: 0.88, roughness: 0.4, roughnessMap: brushed }),
  aluDark: std({ color: 0x80858d, metalness: 0.8, roughness: 0.45, roughnessMap: brushed }),
  white: std({ color: 0xeceae4, metalness: 0, roughness: 0.55 }),
  dark: std({ color: 0x2b2e34, metalness: 0.5, roughness: 0.5 }),
  black: std({ color: 0x0e0f11, metalness: 0.2, roughness: 0.65 }),
  glass: std({ color: 0x0a1424, metalness: 1, roughness: 0.05 }),
  mirror: std({ color: 0xe6eaf0, metalness: 1, roughness: 0.05 }),
  prism: std({ color: 0x8aa0b8, metalness: 1, roughness: 0.03, envMapIntensity: 1.6, side: THREE.DoubleSide }),
  cells: std({ color: 0xffffff, map: cellsSi, metalness: 0.55, roughness: 0.24 }),
  gaas: std({ color: 0xffffff, map: cellsGaAs, metalness: 0.55, roughness: 0.22 }),
  wire: std({ color: 0xffffff, map: wireTex, metalness: 0.75, roughness: 0.42, side: THREE.DoubleSide }),
  dishMesh: std({ color: 0xffffff, map: dishTex, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }),
  chev: std({ color: 0xa9adb3, metalness: 0.85, roughness: 0.38 }),
  fender: std({ color: 0xc2bdb1, metalness: 0, roughness: 0.6, side: THREE.DoubleSide }),
  webbing: std({ color: 0xffffff, map: webbing, metalness: 0, roughness: 0.85 }),
  fabric: std({ color: 0xe0d9c6, metalness: 0, roughness: 0.92, normalMap: foldsN, normalScale: n2(1.1) }),
  rtg: std({ color: 0x3a3d42, metalness: 0.55, roughness: 0.5, roughnessMap: brushed }),
  console: std({ color: 0xffffff, map: consoleTex, metalness: 0.2, roughness: 0.6 }),
  array: std({ color: 0xffffff, map: arrayTex, metalness: 0, roughness: 0.6 }),
  cable: std({ color: 0xd9d6cf, metalness: 0.2, roughness: 0.6 }),
  whiteDS: std({ color: 0xeceae4, metalness: 0.1, roughness: 0.5, side: THREE.DoubleSide }),
};
// a material with its own copy of a texture, repeated
function tiledMat(mat, rx, ry) {
  const m = mat.clone();
  for (const k of ['map', 'alphaMap', 'normalMap', 'roughnessMap']) if (m[k]) { m[k] = m[k].clone(); m[k].repeat.set(rx, ry); m[k].needsUpdate = true; }
  return m;
}

// ---------------------------------------------------------------- geometry helpers
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0, seg = 32, open = false) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), mat); m.position.set(x, y, z); return m; }
function sph(r, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.position.set(x, y, z); return m; }
const UP = V(0, 1, 0);
function orient(m, a, b) { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
function rod(a, b, r, mat, seg = 10) { return orient(new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), seg), mat), a, b); }
function strut(a, b, r1, r2, mat) { return orient(new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, a.distanceTo(b), 12), mat), a, b); } // r1 at a
function path(pts, r, mat, closed = false) { const g = new THREE.Group(); for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) g.add(rod(pts[i], pts[(i + 1) % pts.length], r, mat)); return g; }
function tube(pts, r, mat, seg = 64) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8), mat); }
function lathe(profile, mat, seg = 48) { return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat); }
function dish(r, depth, mat, seg = 56) { // parabolic dish opening +y
  const pts = []; for (let i = 0; i <= 18; i++) { const x = (i / 18) * r; pts.push([Math.max(x, 0.001), (x * x) / (r * r) * depth]); }
  return lathe(pts, mat, seg);
}
function bell(r0, r1, h, mat) { // rocket nozzle opening -y
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([r0 + (r1 - r0) * Math.pow(t, 1.6), -t * h]); }
  const m = lathe(pts, mat, 32); m.material = mat.clone(); m.material.side = THREE.DoubleSide; return m;
}
function helix(r, len, turns, wire, mat) { // along +y from the origin
  const pts = []; const n = turns * 24; for (let i = 0; i <= n; i++) { const a = (i / 24) * TAU; pts.push(V(Math.cos(a) * r, (i / n) * len, Math.sin(a) * r)); }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 6), mat);
}
function panel(w, d, mat = MAT.cells, frame = MAT.alu, k = 1.5) { // flat solar panel in the xz plane; k = cell tiles per metre
  const g = new THREE.Group();
  g.add(box(w, 0.016, d, tiledMat(mat, w * k, d * k)));
  g.add(box(w, 0.012, d, MAT.white, 0, -0.012, 0)); // substrate
  g.add(box(w + 0.03, 0.03, 0.015, frame, 0, -0.004, d / 2), box(w + 0.03, 0.03, 0.015, frame, 0, -0.004, -d / 2));
  g.add(box(0.015, 0.03, d, frame, w / 2, -0.004, 0), box(0.015, 0.03, d, frame, -w / 2, -0.004, 0));
  return g;
}
function ribbonCable(a, b, mat = MAT.cable, wiggle = 0.25) { // a flat cable lying on the ground
  const pts = [a.clone()]; const n = 5;
  for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); p.x += (rnd() - 0.5) * wiggle; p.z += (rnd() - 0.5) * wiggle; p.y = 0.008; pts.push(p); }
  pts.push(b.clone());
  const m = tube(pts, 0.007, mat, 80); m.scale.y = 1; return m;
}
function shadows(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

// ================================================================ Lunar Roving Vehicle
// 3.1 m long, 2.3 m wide; wheelbase 2.29 m, track 1.83 m, 81.8 cm wire-mesh wheels.
function lrvWheel() {
  const w = new THREE.Group();
  // woven zinc-coated piano-wire tyre, rounded profile
  const tyre = lathe([[0.25, -0.104], [0.31, -0.114], [0.36, -0.113], [0.392, -0.1], [0.405, -0.075], [0.409, -0.035], [0.409, 0.035], [0.405, 0.075], [0.392, 0.1], [0.36, 0.113], [0.31, 0.114], [0.25, 0.104]], MAT.wire, 80);
  tyre.rotation.x = Math.PI / 2; w.add(tyre);
  // inner bump-stop frame, seen through the mesh
  const bump = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.007, 6, 60), MAT.chev); w.add(bump);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; w.add(rod(V(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0), V(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0), 0.005, MAT.chev, 6)); }
  // titanium chevron treads over half the contact area
  const N = 26, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.1, 0.019), MAT.chev, N * 2), o = new THREE.Object3D();
  let k = 0;
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
    const a = (i / N) * TAU; o.position.set(Math.cos(a) * 0.4115, Math.sin(a) * 0.4115, s * 0.046); o.rotation.set(s * 0.8, 0, a, 'ZXY'); o.updateMatrix(); inst.setMatrixAt(k++, o.matrix);
  }
  w.add(inst);
  // spun aluminium hub discs + cap
  for (const s of [-1, 1]) { const d = lathe([[0.001, 0.02], [0.08, 0.016], [0.2, 0.004], [0.252, 0]], MAT.alu, 56); d.rotation.x = s * Math.PI / 2; d.position.z = s * 0.104; w.add(d); }
  const rivets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 8, 6), MAT.aluDark, 24), ro = new THREE.Object3D();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; ro.position.set(Math.cos(a) * 0.235, Math.sin(a) * 0.235, 0.106); ro.updateMatrix(); rivets.setMatrixAt(i, ro.matrix); }
  w.add(rivets);
  const cone = cyl(0.07, 0.2, 0.05, MAT.alu, 0, 0, 0.125, 48); cone.rotation.x = -Math.PI / 2; w.add(cone);
  const cap = cyl(0.06, 0.06, 0.03, MAT.aluDark, 0, 0, 0.16, 32); cap.rotation.x = Math.PI / 2; w.add(cap);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const b = cyl(0.008, 0.008, 0.01, MAT.dark, Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0.177, 8); b.rotation.x = Math.PI / 2; w.add(b); }
  return w;
}
function lrv() {
  const g = new THREE.Group();
  const WX = 1.145, WZ = 0.915, WR = 0.409, yF = 0.44;
  // ---- chassis: forward, centre and aft sections of welded aluminium tube
  for (const z of [-0.56, 0.56]) g.add(box(2.72, 0.055, 0.05, MAT.alu, 0, yF, z));
  for (const x of [-1.34, -0.64, 0, 0.64, 1.34]) g.add(box(0.05, 0.055, 1.12, MAT.alu, x, yF, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(rod(V(x * 0.64, yF, z * 0.56), V(x * 0.05, yF, z * 0.05), 0.012, MAT.alu, 6)); // floor bracing
  g.add(box(1.24, 0.02, 1.08, MAT.aluDark, 0, yF + 0.035, 0)); // centre floor (honeycomb panel)
  // outboard handholds
  for (const z of [-1, 1]) g.add(path([V(-0.55, yF + 0.03, z * 0.56), V(-0.48, 0.74, z * 0.6), V(0.42, 0.74, z * 0.6), V(0.5, yF + 0.03, z * 0.56)], 0.011, MAT.alu));

  // ---- wheels, fenders, double-wishbone suspension, traction drives
  g.userData.wheels = []; g.userData.wheelR = WR; // driven on the surface: spin + four-wheel steering
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wh = lrvWheel(); wh.position.set(sx * WX, WR, sz * WZ); if (sz < 0) wh.rotation.y = Math.PI; wh.rotation.z = -sx * 0.5; g.add(wh);
    g.userData.wheels.push({ obj: wh, front: sx > 0, steer: true, flip: sz < 0, y0: wh.rotation.y, z0: wh.rotation.z });
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.3, 48, 1, true, Math.PI - 1.35, 2.7), MAT.fender);
    f.rotation.x = Math.PI / 2; f.position.set(sx * WX, WR, sz * WZ); g.add(f);
    g.add(rod(V(sx * (WX - 0.32), yF + 0.03, sz * 0.58), V(sx * (WX - 0.26), WR + 0.36, sz * (WZ - 0.12)), 0.01, MAT.alu, 6)); // fender stay
    const cz = sz * 0.56, wz = sz * (WZ - 0.2);
    for (const dx of [-0.16, 0.16]) {
      g.add(rod(V(sx * WX + dx, yF + 0.045, cz), V(sx * WX + dx * 0.3, WR + 0.085, wz), 0.014, MAT.alu, 8)); // upper wishbone
      g.add(rod(V(sx * WX + dx, yF - 0.045, cz), V(sx * WX + dx * 0.3, WR - 0.07, wz), 0.014, MAT.alu, 8)); // lower wishbone
    }
    const tb = cyl(0.022, 0.022, 0.4, MAT.dark, sx * WX, yF - 0.045, cz, 12); tb.rotation.z = Math.PI / 2; g.add(tb); // torsion bar
    g.add(strut(V(sx * (WX - 0.3), yF + 0.06, cz), V(sx * WX, WR - 0.04, wz), 0.024, 0.014, MAT.dark)); // damper
    const td = cyl(0.1, 0.1, 0.13, MAT.dark, sx * WX, WR, sz * (WZ - 0.165), 32); td.rotation.x = Math.PI / 2; g.add(td); // traction drive
    const kp = cyl(0.03, 0.03, 0.2, MAT.alu, sx * WX, WR, wz, 12); g.add(kp); // steering kingpin
  }

  // ---- crew station: two folding seats with nylon webbing, footrests, armrest, hand controller
  for (const sz of [-0.31, 0.31]) {
    const s = new THREE.Group(); s.position.z = sz;
    const pan = [V(-0.44, 0.6, -0.2), V(0.02, 0.6, -0.2), V(0.02, 0.6, 0.2), V(-0.44, 0.6, 0.2)];
    s.add(path(pan, 0.012, MAT.alu, true));
    s.add(path([V(-0.44, 0.6, -0.2), V(-0.56, 1.02, -0.2), V(-0.56, 1.02, 0.2), V(-0.44, 0.6, 0.2)], 0.012, MAT.alu));
    for (const p of pan) s.add(rod(p, V(p.x, yF + 0.04, p.z), 0.01, MAT.alu, 6));
    s.add(box(0.44, 0.008, 0.38, MAT.webbing, -0.21, 0.6, 0));
    const back = box(0.008, 0.42, 0.38, MAT.webbing, -0.5, 0.81, 0); back.rotation.z = 0.28; s.add(back);
    for (const z of [-0.12, 0.12]) { const belt = box(0.36, 0.006, 0.04, MAT.white, -0.2, 0.612, z); s.add(belt); } // seat belts
    const foot = box(0.2, 0.012, 0.34, MAT.aluDark, 0.48, yF + 0.11, 0); foot.rotation.z = -0.55; s.add(foot);
    g.add(s);
  }
  g.add(path([V(-0.42, yF + 0.04, 0), V(-0.4, 0.74, 0), V(0.0, 0.74, 0)], 0.014, MAT.alu)); // centre armrest
  g.add(rod(V(0.12, yF + 0.04, 0), V(0.12, 0.68, 0), 0.02, MAT.alu));
  g.add(box(0.06, 0.05, 0.08, MAT.dark, 0.12, 0.7, 0), box(0.035, 0.13, 0.035, MAT.black, 0.13, 0.78, 0), box(0.03, 0.03, 0.12, MAT.black, 0.13, 0.84, 0)); // T-handle
  // control and display console on its post, facing the crew
  g.add(rod(V(0.52, yF + 0.04, 0), V(0.6, 0.98, 0), 0.022, MAT.alu));
  const con = new THREE.Group(); con.position.set(0.62, 1.07, 0); con.rotation.z = -0.38;
  con.add(box(0.06, 0.25, 0.33, MAT.dark));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.23), MAT.console); face.rotation.y = -Math.PI / 2; face.position.x = -0.031; con.add(face);
  con.add(cyl(0.05, 0.05, 0.004, MAT.white, 0, 0.13, 0, 24), box(0.004, 0.05, 0.004, MAT.black, 0, 0.155, 0)); // sun-shadow device
  con.add(box(0.1, 0.09, 0.08, MAT.dark, 0, 0.06, 0.21), cyl(0.018, 0.022, 0.05, MAT.glass, 0.03, 0.06, 0.26, 16)); // 16 mm camera
  g.add(con);

  // ---- forward chassis: batteries and signal electronics under dust covers, open to show radiators
  g.add(box(0.6, 0.13, 1.02, MAT.white, 0.98, yF + 0.1, 0));
  for (const z of [-0.26, 0.26]) {
    g.add(box(0.38, 0.006, 0.4, MAT.mirror, 0.98, yF + 0.17, z));
    const piv = new THREE.Group(); piv.position.set(1.2, yF + 0.175, z); piv.rotation.z = -1.0;
    piv.add(box(0.42, 0.008, 0.44, MAT.white, -0.21, 0, 0)); g.add(piv);
  }
  // Lunar Communications Relay Unit (foil-wrapped) at the front
  g.add(box(0.1, 0.16, 0.26, MAT.alu, 1.32, yF + 0.13, 0));
  g.add(box(0.28, 0.22, 0.36, MAT.foil, 1.36, yF + 0.32, 0), box(0.24, 0.008, 0.3, MAT.mirror, 1.36, yF + 0.434, 0));
  // high-gain umbrella antenna
  const hb = V(1.3, yF + 0.43, -0.16), ht = V(1.36, 1.62, -0.24);
  g.add(rod(hb, ht, 0.013, MAT.alu), box(0.05, 0.05, 0.05, MAT.dark, ht.x, ht.y, ht.z));
  const hga = new THREE.Group(); hga.position.copy(ht).add(V(0.02, 0.05, 0)); hga.rotation.set(0.25, 0, -0.95);
  const R = 0.46, D = 0.17;
  hga.add(dish(R, D, MAT.dishMesh));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, c = Math.cos(a), s = Math.sin(a); hga.add(path([V(0, 0, 0), V(c * R * 0.5, D * 0.25, s * R * 0.5), V(c * R, D, s * R)], 0.0045, MAT.alu)); }
  hga.add(rod(V(0, 0, 0), V(0, D * 1.4, 0), 0.006, MAT.alu), cyl(0.03, 0.02, 0.05, MAT.white, 0, D * 1.45, 0, 16));
  g.add(hga);
  // low-gain helical antenna on its mast
  const lb = V(1.32, yF + 0.43, 0.16), lt = V(1.34, 1.42, 0.2);
  g.add(rod(lb, lt, 0.009, MAT.alu));
  const lga = helix(0.026, 0.34, 7, 0.004, MAT.alu); lga.position.copy(lt); g.add(lga, cyl(0.05, 0.05, 0.006, MAT.alu, lt.x, lt.y, lt.z, 24), rod(lt, lt.clone().add(V(0, 0.34, 0)), 0.004, MAT.white, 6));
  // ground-controlled TV camera on its pan-tilt mount
  g.add(rod(V(1.42, yF + 0.2, 0), V(1.44, 1.04, 0), 0.018, MAT.alu));
  const tv = new THREE.Group(); tv.position.set(1.46, 1.12, 0); tv.rotation.set(0, 0.25, -0.12);
  tv.add(box(0.07, 0.07, 0.09, MAT.dark, 0, -0.07, 0), box(0.26, 0.13, 0.15, MAT.white));
  const lens = cyl(0.042, 0.048, 0.12, MAT.black, 0.18, 0, 0, 24); lens.rotation.z = Math.PI / 2; tv.add(lens);
  const shade = cyl(0.062, 0.052, 0.08, MAT.dark, 0.27, 0, 0, 24, true); shade.rotation.z = Math.PI / 2; shade.material = MAT.dark.clone(); shade.material.side = THREE.DoubleSide; tv.add(shade);
  const glassL = cyl(0.036, 0.036, 0.004, MAT.glass, 0.241, 0, 0, 24); glassL.rotation.z = Math.PI / 2; tv.add(glassL);
  g.add(tv);

  // ---- aft chassis: payload pallet with the tool carrier and sample bags
  g.add(box(0.6, 0.05, 0.96, MAT.aluDark, -1.02, yF + 0.04, 0));
  const tc = new THREE.Group(); tc.position.set(-1.08, yF + 0.07, 0);
  const c8 = []; for (const x of [-0.18, 0.18]) for (const y of [0, 0.5]) for (const z of [-0.4, 0.4]) c8.push(V(x, y, z));
  [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => tc.add(rod(c8[a], c8[b], 0.012, MAT.alu, 6)));
  tc.add(box(0.34, 0.3, 0.3, MAT.dark, 0, 0.17, -0.2), box(0.3, 0.22, 0.24, MAT.white, 0, 0.13, 0.2)); // carrier bags
  for (let i = 0; i < 4; i++) tc.add(box(0.08, 0.1, 0.07, MAT.white, -0.12 + i * 0.08, 0.38, -0.32)); // sample bag dispenser
  // long-handled tools: tongs, scoop, rake
  tc.add(rod(V(-0.12, 0.05, 0.3), V(-0.24, 0.98, 0.34), 0.011, MAT.alu), box(0.04, 0.12, 0.03, MAT.alu, -0.25, 1.04, 0.34));
  tc.add(rod(V(0.0, 0.05, 0.36), V(-0.1, 1.02, 0.38), 0.011, MAT.alu), box(0.1, 0.03, 0.08, MAT.alu, -0.11, 1.06, 0.38));
  tc.add(rod(V(0.12, 0.05, 0.3), V(0.04, 0.95, 0.24), 0.011, MAT.alu));
  const rake = new THREE.Group(); rake.position.set(0.04, 0.98, 0.24); rake.add(box(0.03, 0.03, 0.2, MAT.alu)); for (let i = 0; i < 9; i++) rake.add(box(0.006, 0.08, 0.006, MAT.alu, 0, 0.05, -0.09 + i * 0.0225)); tc.add(rake);
  // gnomon (colour chart and shadow stick) clipped to the carrier
  tc.add(rod(V(0.18, 0.5, 0.0), V(0.24, 0.85, 0.0), 0.006, MAT.black), box(0.004, 0.06, 0.06, MAT.white, 0.24, 0.84, 0.05));
  g.add(tc);
  return shadows(g);
}

// ================================================================ ALSEP science station
// spread: the instruments sit ~1 m apart for the small viewer; the surface view spreads them out
function alsep(spread = 1) {
  const g = new THREE.Group();
  const at = (grp, x, z) => grp.position.set(x * spread, 0, z * spread);
  // ---- Central Station: foil-wrapped electronics, radiator, sunshield on posts, end curtains
  const cs = new THREE.Group();
  cs.add(box(0.62, 0.28, 0.42, MAT.foil, 0, 0.14, 0), box(0.5, 0.01, 0.32, MAT.mirror, 0, 0.285, 0));
  for (const x of [-0.31, 0.31]) for (const z of [-0.2, 0.2]) cs.add(rod(V(x, 0.28, z), V(x, 0.7, z), 0.009, MAT.alu, 6));
  cs.add(box(0.68, 0.012, 0.46, MAT.white, 0, 0.705, 0), box(0.68, 0.004, 0.46, MAT.foil, 0, 0.697, 0));
  for (const x of [-0.335, 0.335]) cs.add(box(0.004, 0.4, 0.44, MAT.foil, x, 0.5, 0));
  // modular helical antenna on its aiming mechanism, pointed at Earth
  cs.add(rod(V(0.22, 0.71, 0.14), V(0.22, 1.02, 0.14), 0.016, MAT.alu), box(0.08, 0.06, 0.08, MAT.dark, 0.22, 1.05, 0.14));
  const ant = new THREE.Group(); ant.position.set(0.22, 1.08, 0.14); ant.rotation.set(0.3, 0, -0.75);
  ant.add(rod(V(0, 0, 0), V(0, 0.62, 0), 0.012, MAT.white), helix(0.045, 0.56, 9, 0.005, MAT.alu), cyl(0.07, 0.07, 0.008, MAT.alu, 0, 0.0, 0, 24));
  cs.add(ant);
  g.add(cs);

  // ---- SNAP-27 radioisotope generator: finned cylinder on its subpallet
  const rtg = new THREE.Group(); at(rtg, -1.1, 0.4);
  rtg.add(box(0.5, 0.05, 0.42, MAT.alu, 0, 0.025, 0));
  rtg.add(cyl(0.2, 0.2, 0.46, MAT.rtg, 0, 0.3, 0, 32), cyl(0.12, 0.2, 0.06, MAT.rtg, 0, 0.56, 0, 32), cyl(0.06, 0.06, 0.04, MAT.dark, 0, 0.6, 0, 16));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; const f = box(0.16, 0.44, 0.012, MAT.rtg, Math.cos(a) * 0.27, 0.3, Math.sin(a) * 0.27); f.rotation.y = -a; rtg.add(f); }
  for (const s of [-1, 1]) rtg.add(rod(V(0, 0.07, s * 0.2), V(0, 0.07, s * 0.2).add(V(0, 0.2, 0)), 0.008, MAT.alu, 6));
  g.add(rtg);

  // ---- Passive Seismic Experiment: sensor drum under an aluminised-Mylar shroud spread on the ground
  const pse = new THREE.Group(); at(pse, 1.0, 0.75);
  const skirtGeo = new THREE.CircleGeometry(0.5, 72, 0, TAU); const sp = skirtGeo.attributes.position, sv = new THREE.Vector3();
  for (let i = 0; i < sp.count; i++) { sv.fromBufferAttribute(sp, i); const r = Math.hypot(sv.x, sv.y); sp.setZ(i, 0.012 + Math.sin(Math.atan2(sv.y, sv.x) * 7) * 0.008 * r + (rnd() - 0.5) * 0.006 * r); }
  skirtGeo.computeVertexNormals();
  const skirtMat = tiledMat(MAT.foil, 1.2, 1.2); skirtMat.roughness = 0.38; const skirt = new THREE.Mesh(skirtGeo, skirtMat); skirt.rotation.x = -Math.PI / 2; pse.add(skirt);
  pse.add(cyl(0.12, 0.14, 0.3, MAT.foil, 0, 0.16, 0, 32), cyl(0.125, 0.125, 0.02, MAT.alu, 0, 0.32, 0, 32), box(0.05, 0.02, 0.05, MAT.dark, 0.06, 0.34, 0.04));
  g.add(pse);

  // ---- Lunar Surface Magnetometer: three sensor booms on a tripod
  const lsm = new THREE.Group(); at(lsm, 0.85, -0.95); lsm.scale.setScalar(spread > 1 ? 1 : 0.8);
  lsm.add(box(0.22, 0.16, 0.22, MAT.white, 0, 0.5, 0), box(0.26, 0.01, 0.26, MAT.foil, 0, 0.6, 0), cyl(0.025, 0.025, 0.02, MAT.glass, 0.06, 0.6, 0.06, 16));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU, c = Math.cos(a), s = Math.sin(a);
    lsm.add(rod(V(c * 0.1, 0.55, s * 0.1), V(c * 0.8, 0.72, s * 0.8), 0.011, MAT.alu, 6));
    const sensor = cyl(0.045, 0.045, 0.14, MAT.white, c * 0.84, 0.74, s * 0.84, 16); sensor.rotation.set(0, -a, Math.PI / 2); lsm.add(sensor);
    lsm.add(rod(V(c * 0.8, 0.72, s * 0.8), V(c * 0.82, 0, s * 0.82), 0.008, MAT.alu, 6));
    const la = a + Math.PI / 3; lsm.add(rod(V(0, 0.43, 0), V(Math.cos(la) * 0.32, 0, Math.sin(la) * 0.32), 0.011, MAT.alu, 6));
  }
  g.add(lsm);

  // ---- Solar Wind Spectrometer: seven Faraday cups on a box on legs
  const sws = new THREE.Group(); at(sws, -0.85, -0.85);
  sws.add(box(0.36, 0.2, 0.28, MAT.white, 0, 0.42, 0), box(0.38, 0.01, 0.3, MAT.foil, 0, 0.53, 0));
  [[0, 0], [0.09, 0], [-0.09, 0], [0.045, 0.08], [-0.045, 0.08], [0.045, -0.08], [-0.045, -0.08]].forEach(([x, z]) => sws.add(cyl(0.032, 0.036, 0.07, MAT.alu, x, 0.57, z, 20), cyl(0.026, 0.026, 0.004, MAT.black, x, 0.606, z, 20)));
  for (const x of [-0.16, 0.16]) for (const z of [-0.12, 0.12]) sws.add(rod(V(x, 0.33, z), V(x * 1.4, 0, z * 1.4), 0.01, MAT.alu, 6));
  g.add(sws);

  // ---- Suprathermal Ion Detector + Cold Cathode Gauge
  const side = new THREE.Group(); at(side, -0.2, 1.1);
  side.add(box(0.26, 0.24, 0.2, MAT.foil, 0, 0.32, 0), box(0.18, 0.06, 0.12, MAT.white, 0, 0.47, 0));
  for (const x of [-0.12, 0.12]) for (const z of [-0.09, 0.09]) side.add(rod(V(x, 0.2, z), V(x * 1.5, 0, z * 1.5), 0.009, MAT.alu, 6));
  side.add(cyl(0.05, 0.05, 0.16, MAT.white, 0.38, 0.1, 0.05, 16));
  g.add(side);

  // ---- flat cables back to the central station
  [[-0.3, 0.15, -0.88, 0.4], [0.31, 0.18, 0.9, 0.7], [0.2, -0.21, 0.8, -0.85], [-0.2, -0.21, -0.78, -0.75], [0, 0.21, -0.18, 1.0], [-0.2, 1.1, 0.1, 1.15]].forEach(([ax, az, bx, bz]) => { const k = (x, z) => (Math.hypot(x, z) < 0.4 ? 1 : spread); g.add(ribbonCable(V(ax * k(ax, az), 0.01, az * k(ax, az)), V(bx * spread, 0.01, bz * spread), MAT.cable, 0.25 * spread)); });
  return shadows(g);
}

// ================================================================ Laser Ranging Retroreflectors
// Apollo 11 & 14: 46 cm panel of 100 fused-silica corner cubes (3.8 cm), tilted toward Earth.
// Apollo 15: a larger array of 300 cubes.
function retroArray(cols, rows, keep = () => true) {
  const s = 0.046, W = cols * s + 0.05, D = rows * s + 0.05;
  const g = new THREE.Group();
  g.add(box(W, 0.045, D, MAT.alu, 0, -0.0225, 0));
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (keep(c, r)) cells.push([(c - (cols - 1) / 2) * s, (r - (rows - 1) / 2) * s]);
  const n = cells.length, o = new THREE.Object3D();
  // corner cube: three mirror facets meeting at the apex = a three-sided pyramid, point down
  const cubeGeo = new THREE.ConeGeometry(0.0185, 0.016, 3, 1, true); cubeGeo.rotateX(Math.PI);
  const collarMat = MAT.alu.clone(); collarMat.side = THREE.DoubleSide;
  const sets = [
    [new THREE.CylinderGeometry(0.0195, 0.0195, 0.016, 24, 1, true), collarMat, 0.008],
    [cubeGeo, MAT.prism, 0.008],
    [new THREE.TorusGeometry(0.0205, 0.0028, 6, 24).rotateX(Math.PI / 2), MAT.alu, 0.016],
    [new THREE.CircleGeometry(0.0195, 24).rotateX(-Math.PI / 2), MAT.black, 0.001],
  ];
  for (const [geo, mat, y] of sets) {
    const inst = new THREE.InstancedMesh(geo, mat, n);
    cells.forEach(([x, z], i) => { o.position.set(x, y, z); o.rotation.set(0, (i * 1.7) % TAU, 0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
    g.add(inst);
  }
  g.userData.size = [W, D];
  return g;
}
function retroreflector(big) {
  const g = new THREE.Group();
  const arr = big ? retroArray(22, 14, (c, r) => !((c < 3 || c > 18) && (r < 2 || r > 11))) : retroArray(10, 10);
  const [W, D] = arr.userData.size;
  // base pallet with feet
  g.add(box(W * 0.92, 0.035, D * 0.9, MAT.alu, 0, 0.04, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(cyl(0.035, 0.045, 0.025, MAT.alu, x * W * 0.42, 0.012, z * D * 0.4, 16));
  // panel hinged at the front edge, tilted up toward Earth
  const tilt = big ? 0.32 : 0.42, piv = new THREE.Group(); piv.position.set(W * 0.44, 0.08, 0); piv.rotation.z = -tilt;
  arr.position.set(-W / 2, 0.03, 0); piv.add(arr); g.add(piv);
  g.add(box(0.05, 0.05, D * 0.8, MAT.aluDark, W * 0.44, 0.07, 0)); // hinge line
  const rearX = W * 0.44 - Math.cos(tilt) * W * 0.92, rearY = 0.08 + Math.sin(tilt) * W * 0.92;
  for (const z of [-D * 0.3, D * 0.3]) g.add(rod(V(rearX + 0.02, 0.05, z), V(rearX, rearY - 0.01, z), 0.014, MAT.alu, 8)); // rear support legs
  // carry handle, sun compass and bubble level
  g.add(path([V(-W * 0.3, 0.06, D * 0.47), V(-W * 0.25, 0.16, D * 0.52), V(W * 0.2, 0.16, D * 0.52), V(W * 0.25, 0.06, D * 0.47)], 0.009, MAT.alu));
  g.add(cyl(0.05, 0.05, 0.008, MAT.white, W * 0.3, 0.062, -D * 0.38, 32), box(0.004, 0.06, 0.004, MAT.black, W * 0.3, 0.09, -D * 0.38));
  g.add(cyl(0.022, 0.022, 0.014, MAT.glass, W * 0.18, 0.064, -D * 0.38, 24));
  return shadows(g);
}
const lrrr = () => retroreflector(false);
const lrrr15 = () => retroreflector(true);

// ================================================================ Surveyor lander (≈3 m tall)
function surveyor() {
  const g = new THREE.Group();
  const H = 0.95, R = 0.82, TOP = 2.85;
  const ang = [0, 1, 2].map((i) => (i / 3) * TAU + Math.PI / 2);
  const C = ang.map((a) => V(Math.cos(a) * R, H, Math.sin(a) * R));
  const mastBase = V(0, H + 0.95, 0);
  // tubular aluminium spaceframe
  for (let i = 0; i < 3; i++) {
    const a = C[i], b = C[(i + 1) % 3];
    g.add(rod(a, b, 0.024, MAT.alu), rod(a, mastBase, 0.019, MAT.alu));
    g.add(rod(a.clone().lerp(b, 0.5), V(0, H + 0.45, 0).lerp(a.clone().lerp(b, 0.5), 0.2), 0.013, MAT.alu, 6));
    g.add(rod(a.clone().lerp(b, 0.5), a.clone().lerp(mastBase, 0.5), 0.011, MAT.alu, 6), rod(a.clone().lerp(b, 0.5), b.clone().lerp(mastBase, 0.5), 0.011, MAT.alu, 6));
  }
  g.add(rod(mastBase, V(0, TOP - 0.1, 0), 0.032, MAT.alu));
  // landing legs: hinged leg, A-frame braces, shock absorber, crushable footpad
  for (let i = 0; i < 3; i++) {
    const a = ang[i], c = C[i], dir = V(Math.cos(a), 0, Math.sin(a));
    const hinge = c.clone().add(V(0, -0.06, 0)), foot = dir.clone().multiplyScalar(R + 0.95).setY(0.11);
    g.add(rod(hinge, foot, 0.034, MAT.alu));
    const mid = hinge.clone().lerp(foot, 0.42);
    g.add(rod(c.clone().lerp(C[(i + 1) % 3], 0.22), mid, 0.016, MAT.alu, 8), rod(c.clone().lerp(C[(i + 2) % 3], 0.22), mid, 0.016, MAT.alu, 8));
    g.add(strut(c.clone().lerp(mastBase, 0.32), hinge.clone().lerp(foot, 0.28), 0.03, 0.02, MAT.white)); // shock absorber
    const pad = lathe([[0.001, 0], [0.12, 0.01], [0.16, 0.04], [0.165, 0.08], [0.06, 0.1], [0.001, 0.1]], MAT.alu, 40); pad.position.copy(foot).setY(0.0); g.add(pad);
    g.add(box(0.15, 0.12, 0.15, MAT.gold, c.x * 0.92, H - 0.13, c.z * 0.92)); // crushable block
    const vern = bell(0.03, 0.065, 0.14, MAT.dark); vern.position.set(c.x * 0.6, H - 0.03, c.z * 0.6); g.add(vern, cyl(0.04, 0.03, 0.06, MAT.alu, c.x * 0.6, H + 0.01, c.z * 0.6, 16));
    // propellant tanks (fuel + oxidiser) and helium bottle
    const t = dir.clone().applyAxisAngle(UP, 0.5).multiplyScalar(0.42), t2 = dir.clone().applyAxisAngle(UP, -0.5).multiplyScalar(0.42);
    g.add(sph(0.1, MAT.alu, t.x, H + 0.1, t.z), sph(0.1, MAT.alu, t2.x, H + 0.1, t2.z));
  }
  g.add(sph(0.12, MAT.white, 0, H + 0.3, 0));
  // thermal compartments A and B: white boxes with mirrored lids
  const compA = new THREE.Group(); compA.position.set(0.32, H + 0.26, -0.18); compA.rotation.y = 0.5;
  compA.add(box(0.5, 0.36, 0.42, MAT.white), box(0.5, 0.012, 0.42, MAT.mirror, 0, 0.186, 0));
  for (let i = 0; i < 6; i++) compA.add(box(0.06, 0.26, 0.004, MAT.alu, -0.18 + i * 0.072, 0, 0.212)); // louvres
  const compB = new THREE.Group(); compB.position.set(-0.35, H + 0.22, 0.12); compB.rotation.y = -0.4;
  compB.add(box(0.38, 0.3, 0.34, MAT.white), box(0.38, 0.012, 0.34, MAT.mirror, 0, 0.156, 0));
  g.add(compA, compB);
  // TV camera: tall body and a mirror hood that scans the scene
  const cam = new THREE.Group(); cam.position.set(0.55, H + 0.05, 0.42); cam.rotation.z = 0.08;
  cam.add(cyl(0.075, 0.08, 0.55, MAT.white, 0, 0.3, 0, 24), cyl(0.09, 0.09, 0.16, MAT.white, 0, 0.64, 0, 24));
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), MAT.mirror); mir.position.set(0, 0.66, 0); mir.rotation.set(0, Math.PI / 2, Math.PI / 4); cam.add(mir);
  cam.add(cyl(0.1, 0.06, 0.04, MAT.dark, 0, 0.74, 0, 24));
  g.add(cam);
  // mast head: solar panel and planar array antenna on their positioners
  const head = V(0, TOP - 0.05, 0);
  g.add(box(0.12, 0.1, 0.12, MAT.dark, head.x, head.y, head.z));
  const sp = panel(0.9, 0.86, MAT.cells, MAT.alu, 1.6); sp.position.set(0.38, TOP + 0.05, 0.12); sp.rotation.set(0.15, 0.4, 0.55); g.add(sp, rod(head, V(0.3, TOP + 0.02, 0.1), 0.016, MAT.alu, 8));
  const pa = new THREE.Group(); pa.position.set(-0.35, TOP + 0.2, -0.08); pa.rotation.set(-0.2, -0.3, -0.75);
  pa.add(box(0.95, 0.025, 0.95, MAT.white), new THREE.Mesh(new THREE.PlaneGeometry(0.93, 0.93), MAT.array).rotateX(-Math.PI / 2).translateZ(0.014));
  g.add(pa, rod(head, V(-0.3, TOP + 0.15, -0.06), 0.016, MAT.alu, 8));
  // two omnidirectional antennas on folding booms
  for (const [i, s] of [[0, 1], [1, -1]]) {
    const base = C[i].clone().lerp(mastBase, 0.55), tip = base.clone().add(V(Math.cos(ang[i] + s * 0.6), 0.9, Math.sin(ang[i] + s * 0.6)).multiplyScalar(0.75));
    g.add(rod(base, tip, 0.01, MAT.alu, 6));
    const omni = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 16), MAT.white); orient(omni, tip, tip.clone().add(tip.clone().sub(base).normalize().multiplyScalar(0.12))); g.add(omni);
  }
  // surface sampler: lazy-tongs arm reaching to the ground, with its scoop
  const sb = C[2].clone().lerp(C[0], 0.5).add(V(0, 0.08, 0)), sd = V(Math.cos(ang[2] - 0.6), 0, Math.sin(ang[2] - 0.6)).multiplyScalar(1.5).setY(0.07);
  g.add(box(0.16, 0.12, 0.12, MAT.white, sb.x, sb.y, sb.z));
  for (let i = 0; i < 4; i++) { const a = sb.clone().lerp(sd, i / 4), b = sb.clone().lerp(sd, (i + 1) / 4); g.add(rod(a.clone().add(V(0, 0.04, 0)), b.clone().add(V(0, -0.04, 0)), 0.008, MAT.alu, 6), rod(a.clone().add(V(0, -0.04, 0)), b.clone().add(V(0, 0.04, 0)), 0.008, MAT.alu, 6)); }
  g.add(box(0.12, 0.06, 0.08, MAT.alu, sd.x, sd.y, sd.z), box(0.04, 0.05, 0.08, MAT.dark, sd.x + 0.07, sd.y + 0.01, sd.z));
  return shadows(g);
}

// ================================================================ Mars Pathfinder lander (petals open, airbags retracted)
function crumple(seed, r, flat) {
  const geo = new THREE.IcosahedronGeometry(1, 4), p = geo.attributes.position, v = new THREE.Vector3(), rr = seeded(seed);
  const ph = Array.from({ length: 9 }, () => rr() * TAU), fr = Array.from({ length: 9 }, () => 1.5 + rr() * 5);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1;
    for (let j = 0; j < 3; j++) k += Math.sin(v.x * fr[j] + ph[j]) * Math.sin(v.z * fr[j + 3] + ph[j + 3]) * (0.16 / (j + 1)) + Math.sin(v.y * fr[j + 6] + ph[j + 6]) * 0.05;
    v.multiplyScalar(k); v.y = Math.max(v.y, -0.3) * flat; p.setXYZ(i, v.x * r, v.y * r, v.z * r);
  }
  geo.computeVertexNormals();
  return geo;
}
function pathfinder() {
  const g = new THREE.Group();
  const L = 1.3, Rv = L / Math.sqrt(3), yB = 0.2;
  const vtx = [0, 1, 2].map((i) => V(Math.sin((i / 3) * TAU) * Rv, yB, Math.cos((i / 3) * TAU) * Rv));
  const tri = (a, b, c, t, inset, mat) => { // a flat triangular slab between three points (y up)
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3), shrink = (p) => p.clone().lerp(cen, inset);
    const [A, B, Cc] = [shrink(a), shrink(b), shrink(c)];
    const s = new THREE.Shape([new THREE.Vector2(A.x, -A.z), new THREE.Vector2(B.x, -B.z), new THREE.Vector2(Cc.x, -Cc.z)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    return new THREE.Mesh(geo, mat);
  };
  const cellMat = tiledMat(MAT.gaas, 1.6, 1.6);
  // base petal with the lander's thermally-insulated electronics enclosure
  g.add(tri(vtx[0], vtx[1], vtx[2], 0.05, 0, MAT.white).translateY(yB - 0.05));
  const box3 = cyl(Rv * 0.62, Rv * 0.66, 0.26, MAT.gold, 0, yB + 0.13, 0, 3); g.add(box3, cyl(Rv * 0.6, Rv * 0.6, 0.012, MAT.white, 0, yB + 0.265, 0, 3));
  // three side petals folded open, each covered in GaAs solar cells, sloping down onto the airbags
  const petals = [];
  for (let i = 0; i < 3; i++) {
    const a = vtx[(i + 1) % 3], b = vtx[(i + 2) % 3], far = a.clone().add(b).sub(vtx[i]);
    const mid = a.clone().lerp(b, 0.5), axis = b.clone().sub(a).normalize();
    let q = new THREE.Quaternion().setFromAxisAngle(axis, 0.12);
    if (far.clone().sub(mid).applyQuaternion(q).y > 0) q = new THREE.Quaternion().setFromAxisAngle(axis, -0.12);
    const piv = new THREE.Group(); piv.position.copy(mid); piv.quaternion.copy(q);
    const rel = (p) => p.clone().sub(mid);
    piv.add(tri(rel(a), rel(b), rel(far), 0.04, 0, MAT.white).translateY(-0.045));
    piv.add(tri(rel(a), rel(b), rel(far), 0.004, 0.07, cellMat).translateY(-0.002));
    g.add(piv); petals.push({ a, b, far, piv, mid });
  }
  // retracted airbags bunched in the gaps between the petals and under their edges
  vtx.forEach((v, i) => {
    const out = V(v.x, 0, v.z).normalize();
    for (let k = 0; k < 3; k++) {
      const p = out.clone().multiplyScalar(Rv + 0.22 + k * 0.12).add(out.clone().cross(UP).multiplyScalar((k - 1) * 0.16));
      const m = new THREE.Mesh(crumple(i * 10 + k, 0.3 - k * 0.04, 0.5), MAT.fabric); m.position.set(p.x, 0.1, p.z); m.rotation.y = rnd() * TAU; g.add(m);
    }
  });
  petals.forEach(({ a, b, far }, i) => {
    for (const [p, q] of [[a, far], [b, far]]) for (const t of [0.35, 0.7]) {
      const e = p.clone().lerp(q, t), out = e.clone().sub(a.clone().add(b).add(far).multiplyScalar(1 / 3)).setY(0).normalize();
      const m = new THREE.Mesh(crumple(100 + i * 7 + t * 10, 0.2, 0.45), MAT.fabric); m.position.set(e.x + out.x * 0.12, 0.07, e.z + out.z * 0.12); m.rotation.y = rnd() * TAU; g.add(m);
    }
  });
  // Imager for Mars Pathfinder (IMP) on its deployed mast
  const impB = V(0, yB + 0.27, Rv * 0.25), impT = impB.clone().add(V(0, 0.62, 0));
  g.add(rod(impB, impT, 0.018, MAT.alu), box(0.05, 0.05, 0.05, MAT.dark, impT.x, impT.y, impT.z));
  const imp = new THREE.Group(); imp.position.copy(impT).add(V(0, 0.08, 0)); imp.rotation.y = 0.4;
  imp.add(box(0.22, 0.1, 0.1, MAT.white), box(0.22, 0.012, 0.1, MAT.foil, 0, 0.056, 0));
  for (const x of [-0.07, 0.07]) { const e = cyl(0.024, 0.028, 0.03, MAT.black, x, 0, 0.06, 20); e.rotation.x = Math.PI / 2; imp.add(e, cyl(0.016, 0.016, 0.003, MAT.glass, x, 0, 0.076, 20).rotateX(Math.PI / 2)); }
  g.add(imp);
  // high-gain antenna (flat disc on a two-axis gimbal) and low-gain antenna
  const hgaB = vtx[1].clone().multiplyScalar(0.32).setY(yB + 0.27);
  g.add(rod(hgaB, hgaB.clone().add(V(0, 0.2, 0)), 0.02, MAT.alu), box(0.06, 0.06, 0.06, MAT.dark, hgaB.x, hgaB.y + 0.22, hgaB.z));
  const hga = cyl(0.17, 0.17, 0.025, MAT.white, hgaB.x, hgaB.y + 0.3, hgaB.z, 40); hga.rotation.set(0.6, 0, 0.4); g.add(hga);
  const lgaB = vtx[2].clone().multiplyScalar(0.3).setY(yB + 0.27);
  g.add(rod(lgaB, lgaB.clone().add(V(0, 0.32, 0)), 0.008, MAT.alu, 6), cyl(0.02, 0.012, 0.06, MAT.white, lgaB.x, lgaB.y + 0.35, lgaB.z, 12));
  // ASI/MET weather mast on a petal: three windsocks and a wind sensor
  const mp = petals[0], mb = mp.mid.clone().lerp(mp.far, 0.45).setY(yB - 0.06);
  g.add(rod(mb, mb.clone().add(V(0, 1.0, 0)), 0.012, MAT.alu, 8));
  [0.35, 0.6, 0.85].forEach((h, k) => { const p = mb.clone().add(V(0, h, 0)); g.add(rod(p, p.clone().add(V(0.09, 0, 0)), 0.004, MAT.alu, 6)); const sock = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 12, 1, true), MAT.white); sock.position.copy(p).add(V(0.1, -0.04, 0)); sock.rotation.z = 0.3 + k * 0.1; g.add(sock); });
  g.add(cyl(0.03, 0.03, 0.04, MAT.white, mb.x, mb.y + 1.02, mb.z, 16));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; g.add(sph(0.012, MAT.white, mb.x + Math.cos(a) * 0.05, mb.y + 1.05, mb.z + Math.sin(a) * 0.05)); }
  // two rolled-out ramps off a petal, down to the ground (the rover drove off the rear one)
  const rp = petals[1], rc = rp.a.clone().add(rp.b).add(rp.far).multiplyScalar(1 / 3);
  [rp.a, rp.b].forEach((p) => {
    const top = p.clone().lerp(rp.far, 0.5).setY(0.14);
    const out = top.clone().sub(rc).setY(0).normalize(), side = out.clone().cross(UP);
    const bot = top.clone().addScaledVector(out, 0.7).setY(0.015);
    for (const s of [-1, 1]) g.add(rod(top.clone().addScaledVector(side, s * 0.11), bot.clone().addScaledVector(side, s * 0.11), 0.008, MAT.alu, 6));
    for (let k = 1; k < 9; k++) { const p = top.clone().lerp(bot, k / 9); g.add(rod(p.clone().addScaledVector(side, -0.11), p.clone().addScaledVector(side, 0.11), 0.005, MAT.white, 6)); }
  });
  return shadows(g);
}

// ================================================================ Sojourner (65 × 48 × 30 cm)
function sojourner() {
  const g = new THREE.Group();
  const WR = 0.0665, WW = 0.079, ZS = 0.215;
  // warm electronics box
  g.add(box(0.44, 0.13, 0.3, MAT.aluDark, 0, 0.215, 0), box(0.442, 0.03, 0.302, tiledMat(MAT.gold, 0.4, 0.15), 0, 0.15, 0));
  // solar panel on posts, a little larger than the body
  const sp = panel(0.55, 0.42, MAT.gaas, MAT.alu, 4); sp.position.set(-0.01, 0.315, 0); g.add(sp);
  for (const x of [-0.18, 0.18]) for (const z of [-0.12, 0.12]) g.add(rod(V(x, 0.28, z), V(x, 0.305, z), 0.008, MAT.alu, 6));
  // rocker-bogie suspension and six cleated wheels
  const wheelX = [0.24, 0.0, -0.24];
  g.userData.wheels = []; g.userData.wheelR = WR;
  for (const sz of [-1, 1]) {
    const z = sz * ZS, zb = sz * 0.16;
    const piv = V(0.04, 0.2, zb), bog = V(0.12, 0.14, z), rear = V(wheelX[2], WR, z), front = V(wheelX[0], WR, z), midW = V(wheelX[1], WR, z);
    g.add(rod(piv, V(0.04, 0.2, z), 0.009, MAT.alu, 8));
    g.add(path([V(0.04, 0.2, z), V(-0.12, 0.17, z), rear.clone().add(V(0, 0.03, 0))], 0.009, MAT.alu)); // rocker to the rear wheel
    g.add(rod(V(0.04, 0.2, z), bog, 0.009, MAT.alu, 8));
    g.add(path([front.clone().add(V(0, 0.03, 0)), bog, midW.clone().add(V(0, 0.03, 0))], 0.009, MAT.alu)); // bogie
    for (const x of wheelX) {
      const w = new THREE.Group(); w.position.set(x, WR, z);
      const rim = cyl(WR, WR, WW, MAT.alu, 0, 0, 0, 40); rim.rotation.x = Math.PI / 2; w.add(rim);
      for (const s of [-1, 1]) { const hub = cyl(WR * 0.72, WR * 0.72, 0.004, MAT.aluDark, 0, 0, s * (WW / 2 + 0.001), 32); hub.rotation.x = Math.PI / 2; w.add(hub); }
      const motor = cyl(0.022, 0.022, 0.04, MAT.dark, 0, 0, -sz * (WW / 2 + 0.02), 16); motor.rotation.x = Math.PI / 2; w.add(motor);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const c = box(0.006, 0.012, WW + 0.002, MAT.chev, Math.cos(a) * (WR + 0.004), Math.sin(a) * (WR + 0.004), 0); c.rotation.z = a; w.add(c); }
      g.add(w);
      g.userData.wheels.push({ obj: w, front: x > 0.1, steer: x !== 0, flip: false, y0: 0, z0: 0 });
      g.add(rod(V(x, WR + 0.03, z), V(x, WR + 0.002, z), 0.006, MAT.alu, 6));
    }
  }
  // front: stereo cameras and laser stripers; rear: colour camera and the APXS on its deployment arm
  for (const z of [-0.06, 0.06]) { const c = box(0.03, 0.035, 0.04, MAT.black, 0.235, 0.24, z); g.add(c, cyl(0.009, 0.009, 0.006, MAT.glass, 0.252, 0.24, z, 12).rotateZ(Math.PI / 2)); }
  for (const z of [-0.12, 0, 0.12]) g.add(box(0.012, 0.012, 0.02, MAT.dark, 0.228, 0.18, z));
  g.add(box(0.025, 0.03, 0.035, MAT.black, -0.235, 0.24, 0.08));
  g.add(path([V(-0.22, 0.2, -0.04), V(-0.3, 0.2, -0.04), V(-0.34, 0.1, -0.04)], 0.007, MAT.alu), cyl(0.025, 0.025, 0.05, MAT.white, -0.345, 0.07, -0.04, 20));
  // UHF antenna
  g.add(cyl(0.012, 0.012, 0.02, MAT.dark, -0.17, 0.335, 0.15, 12), rod(V(-0.17, 0.34, 0.15), V(-0.17, 0.62, 0.15), 0.003, MAT.black, 6));
  return shadows(g);
}

// ================================================================ Ranger 7, seconds before impact
function ranger() {
  const g = new THREE.Group();
  // hexagonal bus with electronics boxes around its rim
  g.add(cyl(0.76, 0.76, 0.22, MAT.alu, 0, 0, 0, 6), cyl(0.7, 0.7, 0.012, MAT.gold, 0, -0.116, 0, 6));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; const b = box(0.36, 0.2, 0.16, i % 2 ? MAT.gold : MAT.white, Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55); b.rotation.y = -a + Math.PI / 2; g.add(b); }
  // television tower: six cameras in a polished truncated cone, omni antenna on top
  g.add(cyl(0.32, 0.48, 1.25, MAT.mirror, 0, 0.74, 0, 6), cyl(0.33, 0.33, 0.04, MAT.alu, 0, 1.38, 0, 6));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const lens = cyl(0.045, 0.055, 0.08, MAT.black, Math.cos(a) * 0.24, 1.42, Math.sin(a) * 0.24, 16); g.add(lens, cyl(0.035, 0.035, 0.004, MAT.glass, Math.cos(a) * 0.24, 1.462, Math.sin(a) * 0.24, 16)); }
  g.add(rod(V(0, 1.4, 0), V(0, 1.85, 0), 0.03, MAT.alu), new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 24), MAT.white).translateY(1.95));
  // two solar panels and the high-gain dish on its hinge
  for (const s of [-1, 1]) {
    const p = panel(1.54, 0.74, MAT.cells, MAT.alu, 1.5); p.position.set(s * 1.6, 0, 0); g.add(p);
    g.add(rod(V(s * 0.66, 0, 0), V(s * 0.84, 0, 0), 0.03, MAT.alu, 8), rod(V(s * 0.66, -0.08, 0.3), V(s * 1.2, -0.01, 0.3), 0.01, MAT.alu, 6));
  }
  const hga = new THREE.Group(); hga.position.set(0.1, -0.55, 0.55); hga.rotation.set(-2.2, 0, 0.25);
  hga.add(dish(0.6, 0.2, MAT.mirror.clone()), rod(V(0, 0, 0), V(0, 0.26, 0), 0.01, MAT.alu, 6));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; hga.add(rod(V(Math.cos(a) * 0.55, 0.17, Math.sin(a) * 0.55), V(0, 0.26, 0), 0.005, MAT.alu, 6)); }
  g.add(hga, rod(V(0, -0.1, 0.35), V(0.1, -0.45, 0.5), 0.025, MAT.alu, 8));
  // attitude-control jets
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; const j = bell(0.012, 0.025, 0.05, MAT.dark); j.position.set(Math.cos(a) * 0.7, -0.11, Math.sin(a) * 0.7); g.add(j); }
  // diving at the Moon, cameras first
  const dive = new THREE.Group(); g.rotation.set(Math.PI * 0.72, 0.3, 0.2); dive.add(g);
  dive.userData.hover = 0.75; // the viewer floats it above the ground
  return shadows(dive);
}


// ================================================================ ISRO spacecraft
function bus(w, h, d, mat = MAT.gold) { // a foil-wrapped box with a white top radiator
  const g = new THREE.Group();
  g.add(box(w, h, d, tiledMat(mat, 1.5, 1.5)), box(w * 0.92, 0.012, d * 0.92, MAT.white, 0, h / 2 + 0.006, 0));
  return g;
}
function wing(n, pw, pd, k = 1.6) { // a solar array of n panels along +x, with its yoke
  const g = new THREE.Group();
  g.add(rod(V(0, 0, 0), V(0.35, 0, 0), 0.025, MAT.alu, 8));
  for (let i = 0; i < n; i++) { const p = panel(pw, pd, MAT.cells, MAT.alu, k); p.position.x = 0.35 + pw / 2 + i * (pw + 0.04); g.add(p); }
  return g;
}
// Chandrayaan-1 (2008): a 1.5 m cube, one solar wing, a gimballed high-gain dish on a boom
function ch1() {
  const g = new THREE.Group();
  g.add(bus(1.5, 1.5, 1.5));
  const w = wing(1, 2.15, 1.8); w.position.set(0.75, 0, 0); w.rotation.x = Math.PI / 2; g.add(w);
  g.add(rod(V(-0.75, 0.2, 0), V(-1.4, 0.75, 0), 0.03, MAT.alu, 8));
  const d = dish(0.36, 0.13, MAT.whiteDS); d.position.set(-1.45, 0.8, 0); d.rotation.z = 0.9; g.add(d);
  g.add(box(0.35, 0.3, 0.3, MAT.white, 0.3, 0.9, 0.35), box(0.25, 0.2, 0.4, MAT.dark, -0.35, 0.85, -0.3), cyl(0.07, 0.07, 0.25, MAT.black, 0.1, 0.88, -0.45, 16));
  return shadows(g);
}
// Chandrayaan-2 orbiter (2019): larger bus, one solar wing, high-gain dish, radar antenna
function ch2orb() {
  const g = new THREE.Group();
  g.add(bus(2.0, 2.2, 1.9));
  const w = wing(2, 1.5, 1.6); w.position.set(1.0, 0.2, 0); w.rotation.x = Math.PI / 2; g.add(w);
  const d = dish(0.5, 0.16, MAT.whiteDS); d.position.set(-0.4, 1.35, 0.4); d.rotation.set(0.5, 0, 0.3); g.add(d, rod(V(-0.4, 1.1, 0.3), V(-0.4, 1.3, 0.38), 0.03, MAT.alu, 8));
  g.add(box(1.6, 0.05, 0.9, MAT.dark, 0, -1.13, 0)); // DFSAR radar panel
  g.add(box(0.4, 0.4, 0.35, MAT.white, 0.5, 1.3, -0.5), cyl(0.12, 0.12, 0.3, MAT.black, 0.5, 1.6, -0.5, 20));
  return shadows(g);
}
// Mangalyaan (2013): 1.5 m bus, a 2.2 m high-gain dish on top, one three-panel solar wing, the 440 N engine below
function mom() {
  const g = new THREE.Group();
  g.add(bus(1.5, 1.5, 1.5));
  const d = dish(1.1, 0.3, MAT.whiteDS); d.position.set(0, 0.95, 0); g.add(d, cyl(0.1, 0.12, 0.25, MAT.alu, 0, 0.82, 0, 16), rod(V(0, 0.95, 0), V(0, 1.45, 0), 0.015, MAT.alu, 6));
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; g.add(rod(V(Math.cos(a) * 1.0, 1.2, Math.sin(a) * 1.0), V(0, 1.45, 0), 0.008, MAT.alu, 6)); }
  const w = wing(3, 1.4, 1.8); w.position.set(0.75, 0, 0); w.rotation.x = Math.PI / 2; g.add(w);
  const n = bell(0.08, 0.2, 0.35, MAT.dark); n.position.y = -0.75; g.add(n);
  g.add(box(0.25, 0.2, 0.25, MAT.black, -0.5, 0.85, 0.5), box(0.3, 0.25, 0.2, MAT.white, 0.45, 0.85, -0.5));
  return shadows(g);
}
// Aditya-L1 (2023): sun-pointed bus with the VELC coronagraph tube and one solar wing
function aditya() {
  const g = new THREE.Group();
  g.add(bus(1.6, 1.5, 1.6));
  const w = wing(2, 1.3, 1.5); w.position.set(0.8, 0, 0); w.rotation.x = Math.PI / 2; g.add(w);
  const velc = cyl(0.22, 0.22, 1.1, MAT.white, -0.2, 0.2, 0.9, 24); velc.rotation.x = Math.PI / 2; g.add(velc, cyl(0.16, 0.16, 0.02, MAT.black, -0.2, 0.2, 1.46, 24).rotateX(Math.PI / 2));
  const suit = cyl(0.12, 0.12, 0.6, MAT.alu, 0.45, 0.35, 0.95, 20); suit.rotation.x = Math.PI / 2; g.add(suit);
  const d = dish(0.3, 0.1, MAT.whiteDS); d.position.set(-0.4, -0.9, -0.3); d.rotation.x = Math.PI; g.add(d);
  return shadows(g);
}
// Vikram (Chandrayaan-3 lander, 2023): about 2 m box on four legs, solar panels on its sides and top,
// the ramp Pragyan rolled down, four 800 N engines, NASA's little laser reflector on top
function vikram() {
  const g = new THREE.Group();
  const H0 = 0.75, BW = 1.9, BH = 1.15;
  g.add(box(BW, BH, BW, tiledMat(MAT.gold, 2, 2), 0, H0 + BH / 2, 0), box(BW * 0.96, 0.02, BW * 0.96, MAT.white, 0, H0 + BH + 0.01, 0));
  const top = panel(1.5, 1.2, MAT.cells, MAT.alu, 3); top.position.set(-0.1, H0 + BH + 0.06, 0.1); g.add(top);
  for (const s of [-1, 1]) { const sp = panel(1.6, 0.9, MAT.cells, MAT.alu, 3); sp.rotation.x = Math.PI / 2; sp.position.set(0, H0 + BH * 0.55, s * (BW / 2 + 0.03)); g.add(sp); }
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { // legs
    const hip = V(x * BW * 0.45, H0 + 0.15, z * BW * 0.45), foot = V(x * 1.35, 0.06, z * 1.35);
    g.add(rod(hip, foot, 0.045, MAT.alu), rod(V(x * BW * 0.45, H0 + 0.7, z * BW * 0.45), hip.clone().lerp(foot, 0.5), 0.03, MAT.white, 8));
    g.add(lathe([[0.001, 0], [0.2, 0.01], [0.24, 0.05], [0.08, 0.08], [0.001, 0.08]], MAT.alu, 32).translateX(foot.x).translateZ(foot.z));
    const e = bell(0.06, 0.13, 0.25, MAT.dark); e.position.set(x * 0.45, H0, z * 0.45); g.add(e);
  }
  const ramp = new THREE.Group(); ramp.position.set(BW / 2, H0 + 0.05, 0); ramp.rotation.z = -0.6;
  for (const s of [-1, 1]) ramp.add(box(1.6, 0.03, 0.08, MAT.alu, 0.8, 0, s * 0.32));
  for (let i = 1; i < 7; i++) ramp.add(box(0.03, 0.02, 0.64, MAT.alu, i * 0.22, 0, 0));
  g.add(ramp);
  const d = dish(0.22, 0.08, MAT.whiteDS); d.position.set(-0.6, H0 + BH + 0.35, -0.55); g.add(d, rod(V(-0.6, H0 + BH, -0.55), V(-0.6, H0 + BH + 0.33, -0.55), 0.02, MAT.alu, 6));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8, 0, TAU, 0, Math.PI / 2), MAT.prism).translateX(0.55).translateY(H0 + BH + 0.03).translateZ(-0.6)); // LRA
  g.add(cyl(0.012, 0.012, 0.6, MAT.alu, -0.95, 0.35, 0.6, 8), box(0.18, 0.1, 0.18, MAT.white, -0.95, 0.68, 0.6)); // ChaSTE probe
  return shadows(g);
}
// Pragyan (2023): 26 kg, six wheels on a rocker-bogie, a tilted solar panel, two navigation cameras
function pragyan() {
  const g = new THREE.Group();
  const WR = 0.09, WW = 0.08, ZS = 0.36;
  g.add(box(0.7, 0.2, 0.52, tiledMat(MAT.gold, 0.8, 0.8), 0, 0.3, 0), box(0.68, 0.01, 0.5, MAT.white, 0, 0.405, 0));
  const sp = panel(0.72, 0.55, MAT.cells, MAT.alu, 6); sp.position.set(-0.08, 0.5, 0); sp.rotation.z = 0.5; g.add(sp, rod(V(0.2, 0.41, 0), V(0.22, 0.6, 0), 0.01, MAT.alu, 6));
  g.add(rod(V(0.3, 0.4, 0), V(0.3, 0.62, 0), 0.015, MAT.alu, 8), box(0.06, 0.06, 0.2, MAT.dark, 0.32, 0.65, 0));
  for (const z of [-0.06, 0.06]) g.add(cyl(0.018, 0.018, 0.02, MAT.glass, 0.36, 0.65, z, 12).rotateZ(Math.PI / 2));
  g.userData.wheels = []; g.userData.wheelR = WR;
  for (const sz of [-1, 1]) {
    const z = sz * ZS;
    g.add(path([V(0.3, WR + 0.03, z), V(0.12, 0.26, z), V(-0.1, 0.2, z), V(-0.3, WR + 0.03, z)], 0.012, MAT.alu), rod(V(0.12, 0.26, z), V(0.12, 0.26, sz * 0.26), 0.012, MAT.alu, 6));
    for (const x of [0.3, 0.0, -0.3]) {
      const w = new THREE.Group(); w.position.set(x, WR, z);
      const rim = cyl(WR, WR, WW, MAT.alu, 0, 0, 0, 32); rim.rotation.x = Math.PI / 2; w.add(rim);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; const c = box(0.008, 0.016, WW, MAT.chev, Math.cos(a) * (WR + 0.005), Math.sin(a) * (WR + 0.005), 0); c.rotation.z = a; w.add(c); }
      g.add(w); g.userData.wheels.push({ obj: w, front: x > 0.1, steer: x !== 0, flip: false, y0: 0, z0: 0 });
      g.add(rod(V(x, WR + 0.03, z), V(x, WR, z), 0.008, MAT.alu, 6));
    }
  }
  return shadows(g);
}
// Moon Impact Probe (Chandrayaan-1, 2008): 35 kg, with the Indian flag painted on its sides
function mip() {
  const g = new THREE.Group();
  g.add(box(0.38, 0.47, 0.38, MAT.white));
  const flag = toTex(makeCanvas(96, 64, (c, w, h) => { c.fillStyle = '#ff9933'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#ffffff'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#138808'; c.fillRect(0, (2 * h) / 3, w, h / 3); c.strokeStyle = '#000080'; c.lineWidth = 2; c.beginPath(); c.arc(w / 2, h / 2, h / 7, 0, TAU); c.stroke(); }));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardMaterial({ map: flag, roughness: 0.7 })); f.position.set(0, 0.05, 0.191); g.add(f);
  const n = bell(0.04, 0.09, 0.14, MAT.dark); n.position.y = -0.235; g.add(n);
  return shadows(g);
}

export { makeCanvas, toTex, normalFrom, seeded };
export const BUILDERS = { lrv, alsep, lrrr, lrrr15, surveyor, pathfinder, sojourner, ranger, ch1, ch2orb, mom, aditya, vikram, pragyan, mip };
