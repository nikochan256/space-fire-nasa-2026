/* Spacefire Explorer — surface mode.
   Clicking a site on the Moon or Mars lands you there: a walkable landscape around the real landing
   spot with the hardware at its real size, lit by a low Sun (Moon: black sky with Earth hanging in
   it, placed from the site's real coordinates; Mars: dusty butterscotch sky).
   Everything can be clicked. Rovers can be driven (wheels turn and steer, dust flies, tracks stay),
   Ingenuity can fly, laser mirrors can be fired at from Earth, seismometers feel quakes, the Apollo
   lunar module replays its liftoff and Ranger 7 its impact.
   Units: metres. Ground frame: +x east, -z north, +y up. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDERS, MAT, makeCanvas, toTex, normalFrom, seeded } from './builders.js';
import { BASE_LAYOUT } from './skylab.js';
import { sfx, loop as sfxLoop, play as sfxPlay } from './audio.js';

const TAU = Math.PI * 2;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ---------------------------------------------------------------- 2D noise (terrain)
function hash2(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, s, oct = 5) { let a = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { t += a * (vnoise(x * f, y * f, s + i * 17) * 2 - 1); f *= 2.03; a *= 0.5; } return t; }
function ridged(x, y, s, oct = 5) { let a = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { const n = 1 - Math.abs(vnoise(x * f, y * f, s + i * 31) * 2 - 1); t += a * n * n; f *= 2.1; a *= 0.5; } return t; }

// ---------------------------------------------------------------- worlds, sites, hardware
const BODY = {
  moon: { R: 1737400, g: 1.62, sunEl: 13, sunAz: 98, sunI: 3.3, sunColor: 0xfffaf2, hemi: [0x141820, 0x77736b, 0.6], ground: [0.43, 0.425, 0.41], dust: [0.29, 0.285, 0.275], track: 0x2e2d2b },
  mars: { R: 3389500, g: 3.71, sunEl: 34, sunAz: 225, sunI: 2.7, sunColor: 0xfff0dc, hemi: [0xd9a47c, 0x6b3a22, 0.95], ground: [0.56, 0.33, 0.2], dust: [0.46, 0.3, 0.2], track: 0x4a2c1d },
};
// terrain character per landing site
const SITE = {
  apollo11: { rough: 0.6, rocks: 0.7, hills: 0.25 },
  apollo12: { rough: 0.7, rocks: 0.7, hills: 0.3, craters: [[46, -25, 16, 0.22]] }, // Surveyor crater
  apollo14: { rough: 1.0, rocks: 1.1, hills: 0.5 },
  apollo15: { rough: 0.8, rocks: 0.8, hills: 1.25 }, // Apennine front, Mount Hadley
  apollo16: { rough: 1.0, rocks: 1.3, hills: 0.7 },
  apollo17: { rough: 0.8, rocks: 1.5, hills: 1.35 }, // the valley between the massifs
  surveyor1: { rough: 0.6, rocks: 0.6, hills: 0.3 },
  surveyor5: { rough: 0.6, rocks: 0.5, hills: 0.2 },
  surveyor6: { rough: 0.7, rocks: 0.7, hills: 0.3 },
  surveyor7: { rough: 1.5, rocks: 2.2, hills: 0.7 }, // Tycho ejecta blanket
  ranger7: { rough: 0.7, rocks: 0.6, hills: 0.25, impact: true },
  viking1: { rough: 0.6, rocks: 1.6, hills: 0.3, dunes: 0.5 },
  viking2: { rough: 0.4, rocks: 2.8, hills: 0.15 },
  pathfinder: { rough: 0.6, rocks: 2.0, hills: 0.3, peaks: true }, // Twin Peaks on the horizon
  spirit: { rough: 0.7, rocks: 1.0, hills: 0.8, ripples: 0.5 },
  opportunity: { rough: 0.6, rocks: 0.35, hills: 0.9, ripples: 1 },
  phoenix: { rough: 0.3, rocks: 0.25, hills: 0.1, polygons: true },
  insight: { rough: 0.25, rocks: 0.2, hills: 0.15 },
  jezero: { rough: 0.6, rocks: 0.9, hills: 0.8 },
  // ISRO, near the south pole: the Sun skims the horizon and Earth hangs low
  chandrayaan3: { rough: 0.9, rocks: 1.3, hills: 0.7, sunEl: 6, sunAz: 40 },
  chandrayaan2: { rough: 0.9, rocks: 1.1, hills: 0.6, impact: true, impactR: 4, sunEl: 7, sunAz: 40 },
  chandrayaan1: { rough: 1.1, rocks: 1.0, hills: 1.0, impact: true, impactR: 2.2, sunEl: 2.5, sunAz: 30 },
};
// crash sites: what is left, and what to replay
const CRASH = {
  ranger: { probe: 'ranger', size: 4.6, label: 'Ranger 7 impact crater', dir: [-0.62, 0.5, -0.6], debris: 1,
    toast: 'Ranger 7 hit the Moon at 2.6 km/s, sending pictures until the last instant. The final frame showed craters smaller than a metre across.' },
  vikramCrash: { probe: 'vikram', size: 3.2, label: 'Vikram crash site', dir: [-0.35, 0.9, -0.25], debris: 0.8,
    toast: 'Chandrayaan-2’s Vikram lost control about 2 km up during braking and hit the surface. Its scattered pieces were later found in NASA orbiter images.' },
  mipCrash: { probe: 'mip', size: 0.6, label: 'Moon Impact Probe site', dir: [-0.3, 0.75, -0.6], debris: 0.25,
    toast: 'The Moon Impact Probe fell for 25 minutes, measuring the Moon’s thin exosphere, and struck near Shackleton crater at about 1.7 km/s.' },
};
// where each piece stands: [x, z, heading] (real layouts, compressed so everything is a short walk apart)
const PLACE = {
  'a11-lm': [0, 0, 0.2], 'a11-lrrr': [-8, 13, 0.3],
  'a12-lm': [0, 0, 0.6], 'a12-alsep': [-30, -16, 0.3], surveyor3: [40, -20, 1.1],
  'a14-lm': [0, 0, 0.3], 'a14-alsep': [-32, -8, 0.2], 'a14-lrrr': [-40, 5, 0.2],
  'a15-lm': [0, 0, -0.3], 'a15-lrv': [22, 7, Math.PI], 'a15-alsep': [-34, -14, 0.1], 'a15-lrrr': [-42, -2, 0.2],
  'a16-lm': [0, 0, 0.1], 'a16-lrv': [20, -9, 2.8], 'a16-alsep': [-32, 10, 0.4],
  'a17-lm': [0, 0, 0.5], 'a17-lrv': [24, 10, 3.3], 'a17-alsep': [-30, -16, 0.2],
  pathfinder: [0, 0, 0.3], sojourner: [6, 4, 2.4],
  'c3-vikram': [0, 0, 0.4], 'c3-pragyan': [6, 3.5, 2.2],
};
// footprint radius (m) before the models load, used to level the ground under them
const RADIUS = { lm: 5, lrv: 2, alsep: 4.5, lrrr: 0.8, lrrr15: 1.1, surveyor: 2.6, pathfinder: 2.6, sojourner: 0.6, mer: 1.4, viking: 2, insight: 3.2, ingenuity: 0.8, ranger: 0, vikram: 2, pragyan: 0.6, vikramCrash: 0, mipCrash: 0 };
// NASA glTF models are rescaled to their real size (largest horizontal extent, m)
const REAL = { lm: 9.4, mer: 2.3, viking: 3.0, insight: 6.0, ingenuity: 1.2 };
const REAL_ITEM = { phoenix: 5.5 };
// drivable rovers (game speeds; the real ones were far slower, see `note`)
const ROVER = {
  lrv: { max: 3.6, accel: 1.4, wb: 1.15, track: 1.83, turn: 0.45, tread: 0.23, fwd: 0, name: 'Lunar Roving Vehicle', note: 'The real one topped out around 13 km/h.' },
  sojourner: { max: 0.6, accel: 0.6, wb: 0.48, track: 0.43, turn: 0.8, tread: 0.08, fwd: 0, name: 'Sojourner', note: 'Sped up: the real Sojourner crawled at 1 cm/s.' },
  mer: { max: 1.2, accel: 0.8, wb: 1.1, track: 1.2, turn: 0.7, tread: 0.16, fwd: -Math.PI / 2, name: 'Mars Exploration Rover', note: 'Sped up: Spirit and Opportunity drove at about 5 cm/s.' },
  pragyan: { max: 0.5, accel: 0.5, wb: 0.6, track: 0.72, turn: 0.75, tread: 0.08, fwd: 0, name: 'Pragyan', note: 'Sped up: the real Pragyan moved at about 1 cm/s.' },
};
const LM_CUT = 0.39; // lunar module parts that start above this fraction of its height belong to the ascent stage
// the Skylab repair bases (skylab.js): terrain, layout, footprints, and the drivable crew rover
Object.assign(SITE, BASE_LAYOUT.site); Object.assign(PLACE, BASE_LAYOUT.place); Object.assign(RADIUS, BASE_LAYOUT.radius); Object.assign(ROVER, BASE_LAYOUT.rover);
const LANDERS_PHONE = new Set(['viking', 'pathfinder', 'surveyor', 'vikram']);

// ---------------------------------------------------------------- shared textures
const regolithMap = toTex(makeCanvas(1024, 1024, (g, w, h) => {
  const r = seeded(77);
  g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30000; i++) { const v = (150 + r() * 90) | 0; g.fillStyle = `rgba(${v},${v},${v},.35)`; const s = 1 + r() * 2.5; g.fillRect(r() * w, r() * h, s, s); }
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 1.5 + r() * 4, v = r() < 0.5 ? 110 : 215; g.fillStyle = `rgba(${v},${v},${v},.45)`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
}));
const regolithN = normalFrom(makeCanvas(512, 512, (g, w, h) => {
  const r = seeded(78);
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = (100 + r() * 60) | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 18; i++) { // craterlets
    const x = r() * w, y = r() * h, s = 6 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(70,70,70,.45)'); gr.addColorStop(0.75, 'rgba(115,115,115,.2)'); gr.addColorStop(0.9, 'rgba(170,170,170,.3)'); gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
  for (let i = 0; i < 900; i++) { // pebbles
    const x = r() * w, y = r() * h, s = 1.2 + r() * 3.5, gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(235,235,235,.9)'); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
  }
}), 1.6);
const treadTex = toTex(makeCanvas(64, 128, (g, w, h) => {
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h); // used as an alpha mask: grey = faint, white = chevron
  g.strokeStyle = '#ffffff'; g.lineWidth = 7;
  for (let y = -16; y < h + 16; y += 22) { g.beginPath(); g.moveTo(4, y + 12); g.lineTo(w / 2, y); g.lineTo(w - 4, y + 12); g.stroke(); }
}), false);
const glowTex = toTex(makeCanvas(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,248,230,.8)'); gr.addColorStop(0.45, 'rgba(255,230,190,.18)'); gr.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}));
const flagTex = toTex(makeCanvas(256, 160, (g, w, h) => { // half a century of unfiltered sunlight has faded the Apollo flags
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ece7df' : '#b98a82'; g.fillRect(0, (i * h) / 13, w, h / 13 + 1); }
  g.fillStyle = '#7d8398'; g.fillRect(0, 0, w * 0.4, (h * 7) / 13);
  g.fillStyle = '#ece7df';
  for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { g.beginPath(); g.arc(8 + c * 16 + (r % 2 ? 8 : 0), 6 + r * 9.4, 1.8, 0, TAU); g.fill(); }
}));

// ---------------------------------------------------------------- small builders
function flagModel(fallen) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.25, 10), MAT.alu).translateY(1.125));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 8), MAT.alu); bar.rotation.z = Math.PI / 2; bar.position.set(0.5, 2.2, 0); g.add(bar);
  const geo = new THREE.PlaneGeometry(0.95, 0.6, 12, 6), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 9) * 0.025 + Math.sin(x * 4 + 1) * 0.02); }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.9, side: THREE.DoubleSide })); cloth.position.set(0.49, 1.89, 0); g.add(cloth);
  if (fallen) { g.rotation.set(0, 0, -Math.PI / 2 + 0.06); g.position.y = 0.03; } // Apollo 11's flag was blown over by the ascent engine
  return g;
}
function seismoDecor(lander, along) { // InSight's SEIS under its wind and thermal shield, and the HP3 heat probe
  const g = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 16, 0, TAU, 0, Math.PI / 2), MAT.gold); g.add(dome);
  const skirt = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 40), MAT.dark); skirt.rotation.x = Math.PI / 2; skirt.position.y = 0.03; g.add(skirt);
  const hp3 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.22), MAT.white); hp3.position.set(along ? -0.1 : 1.2, 0.13, along ? 1.2 : -0.1); g.add(hp3);
  g.position.set(along ? 2.1 : 0.4, 0, along ? 0.4 : 2.1);
  return g;
}
function impactDebris(seed, k = 1) { // a crash leaves only scattered fragments around a fresh crater
  const g = new THREE.Group(), r = seeded(seed), mats = [MAT.alu, MAT.gold, MAT.dark, MAT.cells, MAT.mirror];
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, d = (1.5 + Math.pow(r(), 0.7) * 16) * Math.max(k, 0.4), s = (0.04 + Math.pow(r(), 3) * 0.35) * Math.max(k, 0.3);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * (0.1 + r() * 0.4), s * (0.4 + r())), mats[i % mats.length]);
    m.position.set(Math.cos(a) * d, s * 0.05, Math.sin(a) * d); m.rotation.set(r() * 0.6, r() * TAU, r() * 0.6); g.add(m);
  }
  return g;
}
function rockGeos(seed) {
  return [0, 1, 2].map((k) => {
    const geo = new THREE.IcosahedronGeometry(1, 2), p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = vnoise(v.x * 1.7 + k * 9, v.y * 1.7 + v.z, seed + k) * 0.55 + vnoise(v.x * 4 + v.z * 3, v.y * 4, seed + k + 5) * 0.2; v.multiplyScalar(0.72 + n); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    return geo;
  });
}

// ================================================================ the surface
export function createSurface({ renderer, canvas, loadModel, items, earthMap, getShift = () => ({ x: 0, y: 0 }), onSelect = () => {}, onToast = () => {}, onState = () => {},
  status = () => 'working', baseOf = () => null, onRepair = () => {}, onBay = () => {}, onRepaired = () => {} }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 9000);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enabled: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.5, zoomSpeed: 0.9, panSpeed: 0.8, screenSpacePanning: false, minDistance: 1.2, maxDistance: 420, maxPolarAngle: Math.PI / 2 - 0.02 });
  const sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
  scene.add(sun, sun.target, hemi);
  const pmrem = new THREE.PMREMGenerator(renderer);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; // only the surface casts shadows

  let world = null, active = false, camTween = null, lastUser = 0, shake = 0, recovering = false, stepT = 0;
  let drive = null, fly = null; const fx = []; // running effects
  const flags = { dig: 0, drill: 0, fast: 0 }, relayDir = V(0.3, 0.8, -0.5).normalize(), animCtx = { sunDir: null, earthDir: null, relayDir, dig: false, drill: false, fast: false };
  const keys = new Set();

  // ---------------------------------------------------------- dust (soft points, per-particle colour)
  const DUST_N = 3000;
  const dust = { pos: new Float32Array(DUST_N * 3), vel: new Float32Array(DUST_N * 3), col: new Float32Array(DUST_N * 3), age: new Float32Array(DUST_N), life: new Float32Array(DUST_N), alpha: new Float32Array(DUST_N), size: new Float32Array(DUST_N), floor: new Float32Array(DUST_N), next: 0 };
  dust.life.fill(0); dust.age.fill(1);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dust.pos, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aColor', new THREE.BufferAttribute(dust.col, 3).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dust.alpha, 1).setUsage(THREE.DynamicDrawUsage));
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dust.size, 1).setUsage(THREE.DynamicDrawUsage));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uScale: { value: 400 }, uLight: { value: 1 } },
    vertexShader: 'attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale; varying vec3 vC; varying float vA; void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(-mv.z, 0.1) : 0.0; }',
    fragmentShader: 'uniform float uLight; varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC * uLight, a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const dustPts = new THREE.Points(dustGeo, dustMat); dustPts.frustumCulled = false; dustPts.renderOrder = 5;
  function emit(x, y, z, vx, vy, vz, life, size, col, floor) {
    const i = dust.next; dust.next = (dust.next + 1) % DUST_N;
    dust.pos.set([x, y, z], i * 3); dust.vel.set([vx, vy, vz], i * 3); dust.col.set(col, i * 3);
    dust.age[i] = 0; dust.life[i] = life; dust.size[i] = size; dust.floor[i] = floor;
  }
  function updateDust(dt) {
    const g = world ? BODY[world.body].g : 1.62, mars = world && world.body === 'mars', drag = mars ? Math.exp(-dt * 1.4) : 1;
    for (let i = 0; i < DUST_N; i++) {
      if (dust.age[i] >= dust.life[i]) { dust.alpha[i] = 0; continue; }
      dust.age[i] += dt; const k = i * 3;
      dust.vel[k + 1] -= g * dt * (mars ? 0.35 : 1);
      dust.vel[k] *= drag; dust.vel[k + 1] *= drag; dust.vel[k + 2] *= drag;
      if (mars) dust.vel[k] += 0.25 * dt; // a light breeze
      dust.pos[k] += dust.vel[k] * dt; dust.pos[k + 1] += dust.vel[k + 1] * dt; dust.pos[k + 2] += dust.vel[k + 2] * dt;
      if (dust.pos[k + 1] < dust.floor[i]) { dust.pos[k + 1] = dust.floor[i]; dust.vel[k] = dust.vel[k + 1] = dust.vel[k + 2] = 0; if (!mars) dust.life[i] = Math.min(dust.life[i], dust.age[i] + 0.25); }
      const t = dust.age[i] / dust.life[i];
      dust.alpha[i] = (mars ? 0.45 : 0.6) * sstep(0, 0.06, t) * (1 - sstep(0.55, 1, t));
      if (mars) dust.size[i] += dt * 0.25;
    }
    dustGeo.attributes.position.needsUpdate = dustGeo.attributes.aAlpha.needsUpdate = dustGeo.attributes.aSize.needsUpdate = dustGeo.attributes.aColor.needsUpdate = true;
  }

  // ---------------------------------------------------------- tracks (instanced tread marks, ring buffer)
  const TRK_N = 6000;
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x2e2d2b, alphaMap: treadTex, transparent: true, opacity: 0.6, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const tracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), trackMat, TRK_N);
  tracks.count = 0; tracks.frustumCulled = false; tracks.receiveShadow = true;
  let trackN = 0, groundH = () => 0; // groundH: the current site's height function
  const tq = new THREE.Quaternion(), tm = new THREE.Matrix4(), tv = new THREE.Vector3(), ts = new THREE.Vector3();
  function stamp(x, z, yaw, w, len) {
    tq.setFromAxisAngle(V(0, 1, 0), yaw); tv.set(x, groundH(x, z) + 0.015, z); ts.set(len, 1, w);
    tm.compose(tv, tq, ts); tracks.setMatrixAt(trackN % TRK_N, tm); trackN++;
    tracks.count = Math.min(trackN, TRK_N); tracks.instanceMatrix.needsUpdate = true;
  }
  function stampPair(x, z, yaw, cfg) {
    const px = Math.sin(yaw), pz = Math.cos(yaw); // perpendicular to (cos yaw, -sin yaw)
    for (const s of [-1, 1]) stamp(x + px * s * cfg.track / 2, z + pz * s * cfg.track / 2, yaw, cfg.tread, 0.36);
  }
  function seedTracks(pts, cfg) { // tracks already on the ground when you arrive
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z))), L = curve.getLength(), n = Math.floor(L / 0.34);
    for (let i = 0; i <= n; i++) { const p = curve.getPointAt(i / n), t = curve.getTangentAt(i / n); stampPair(p.x, p.z, Math.atan2(-t.z, t.x), cfg); }
  }

  // ---------------------------------------------------------- sky
  const skyGroup = new THREE.Group(); // follows the camera
  scene.add(skyGroup);
  const stars = (() => {
    const n = 2600, pos = new Float32Array(n * 3), r = seeded(5);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u); pos.set([Math.cos(a) * s * 5000, u * 5000, Math.sin(a) * s * 5000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9aa0ad, size: 1.4, sizeAttenuation: false, fog: false, depthWrite: false }));
  })();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.85, metalness: 0, fog: false }));
  earth.scale.setScalar(80);
  const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6fa0ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  earthGlow.scale.setScalar(260);
  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  const marsSky = new THREE.Mesh(new THREE.SphereGeometry(5200, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sunDir: { value: V(0, 1, 0) }, dim: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 sunDir; uniform float dim; varying vec3 vD;
      void main(){ vec3 d = normalize(vD); float el = max(d.y, 0.0);
        vec3 hor = vec3(0.80, 0.60, 0.43), zen = vec3(0.40, 0.29, 0.21);
        vec3 c = mix(hor, zen, pow(el, 0.55)); float s = max(dot(d, sunDir), 0.0);
        c += vec3(0.45, 0.6, 0.85) * pow(s, 14.0) * 0.55; // Mars's blue glow around the Sun
        if (d.y < 0.0) c = hor * 0.92;
        gl_FragColor = vec4(c * dim, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));

  // ---------------------------------------------------------- labels + HUD
  const labelHost = document.createElement('div'); labelHost.className = 'slabels'; document.body.appendChild(labelHost);
  const hud = document.getElementById('shud'), hudRead = document.getElementById('shud-read');

  // ---------------------------------------------------------- terrain
  function makeHeight(site, body, cfg, seed, flats) {
    const rr = seeded(seed), big = [], cells = new Map(), CS = 16;
    const add = (x, z, r, depth) => { const c = { x, z, r, d: depth * r, r2: (2.2 * r) ** 2 }; if (r > 7) big.push(c); else { const k = Math.floor(x / CS) + ',' + Math.floor(z / CS); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(c); } };
    const k = body === 'moon' ? 1 : 0.3, rough = cfg.rough ?? 0.7;
    for (let i = 0; i < 260 * k; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 1500; add(Math.cos(a) * d, Math.sin(a) * d, 4 + 60 * rr() ** 4, 0.18); }
    for (let i = 0; i < 1400 * k * rough; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 170; add(Math.cos(a) * d, Math.sin(a) * d, 0.35 + 4.5 * rr() ** 3, 0.2); }
    (cfg.craters || []).forEach(([x, z, r, dd]) => add(x, z, r, dd));
    if (cfg.impact) add(0, 0, cfg.impactR || 6.5, 0.22);
    const craterSum = (x, z) => {
      let h = 0;
      const visit = (c) => { const dx = x - c.x, dz = z - c.z, d2 = dx * dx + dz * dz; if (d2 > c.r2) return; const d = Math.sqrt(d2) / c.r; h += (d < 1 ? d * d - 1 : 0) * c.d + c.d * 0.28 * Math.exp(-(((d - 1) / 0.32) ** 2)); };
      for (const c of big) visit(c);
      const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = cells.get((cx + i) + ',' + (cz + j)); if (l) for (const c of l) visit(c); }
      return h;
    };
    const poly = (x, z) => { // Phoenix's polygonal patterned ground: troughs along cell edges
      const s = 3.5, gx = Math.floor(x / s), gz = Math.floor(z / s); let f1 = 1e9, f2 = 1e9;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const cx = gx + i, cz = gz + j, px = (cx + 0.15 + 0.7 * hash2(cx, cz, seed)) * s, pz = (cz + 0.15 + 0.7 * hash2(cx, cz, seed + 1)) * s, d = Math.hypot(x - px, z - pz);
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      return 1 - sstep(0, 0.45, f2 - f1);
    };
    const raw = (x, z) => {
      const r = Math.hypot(x, z);
      let h = fbm(x / 70, z / 70, seed, 4) * 2.2 * rough + fbm(x / 11, z / 11, seed + 7, 3) * 0.22 * rough;
      h += craterSum(x, z);
      if (cfg.ripples) h += Math.sin(x * 1.7 + z * 0.4 + fbm(x / 25, z / 25, seed + 3, 2) * 4) * 0.07 * cfg.ripples * (0.6 + 0.4 * fbm(x / 40, z / 40, seed + 4, 2));
      if (cfg.dunes) h += Math.sin(x * 0.12 + z * 0.05 + fbm(x / 90, z / 90, seed + 5, 2) * 3) * 0.9 * cfg.dunes;
      if (cfg.polygons) h -= poly(x, z) * 0.22;
      if (cfg.peaks) for (const [px, pz, ph, pr] of [[-650, 820, 34, 170], [-470, 990, 28, 150]]) h += ph * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (pr * pr));
      const far = sstep(220, 1500, r);
      if (far > 0 && cfg.hills) h += far * (ridged(x / 650, z / 650, seed + 9) * (body === 'moon' ? 340 : 160) + fbm(x / 160, z / 160, seed + 2, 3) * 30) * cfg.hills;
      return h;
    };
    flats.forEach((f) => { f.h0 = raw(f.x, f.z); });
    const R = BODY[body].R;
    const height = (x, z) => {
      let h = raw(x, z);
      for (const f of flats) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r * 2.4) h = lerp(f.h0, h, sstep(f.r * 0.9, f.r * 2.4, d)); }
      return h - (x * x + z * z) / (2 * R); // the curve of the horizon
    };
    return { height, poly };
  }
  function makeColor(site, body, cfg, seed, trails, poly) {
    const G = BODY[body].ground, lmAt0 = site.items.some((id) => items[id].model === 'lm');
    return (x, z) => {
      const d = Math.hypot(x, z);
      if (body === 'moon') {
        let b = 1 + 0.12 * fbm(x / 180, z / 180, seed + 11, 3) + 0.06 * fbm(x / 25, z / 25, seed + 12, 2);
        if (lmAt0) b += 0.07 * sstep(5, 12, d) * (1 - sstep(25, 75, d)); // the bright halo the descent engine blew clean
        for (const [ax, az, bx, bz] of trails) { // darker paths the astronauts trampled
          const vx = bx - ax, vz = bz - az, t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1);
          const wob = fbm(x / 6, z / 6, seed + 20, 2) * 1.2, dd = Math.hypot(x - ax - vx * t, z - az - vz * t) + wob;
          b -= 0.13 * (1 - sstep(0.4, 1.8, dd));
        }
        if (cfg.impact) { const a = Math.atan2(z, x); b += 0.22 * Math.pow(Math.max(0, Math.cos(a * 7 + fbm(x / 20, z / 20, seed, 2) * 2)), 6) * Math.exp(-d / 70) + 0.16 * Math.exp(-d / 14); }
        return [G[0] * b, G[1] * b, G[2] * b];
      }
      const dark = sstep(-0.1, 0.45, fbm(x / 60, z / 60, seed + 13, 3)), b = 1 + 0.1 * fbm(x / 120, z / 120, seed + 11, 3);
      let c = [lerp(G[0], 0.36, dark * 0.5) * b, lerp(G[1], 0.25, dark * 0.5) * b, lerp(G[2], 0.18, dark * 0.5) * b];
      if (cfg.ripples) { const k = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 0.4 + fbm(x / 25, z / 25, seed + 3, 2) * 4); c = c.map((v) => v * (0.88 + 0.12 * k)); }
      if (cfg.polygons) { const k = poly(x, z) * (cfg.polyTint ?? 0.8); c = [lerp(c[0] * 1.1, 0.8, k), lerp(c[1] * 1.15, 0.77, k), lerp(c[2] * 1.2, 0.75, k)]; }
      return c;
    };
  }
  function terrainMesh(height, colorAt, maxR = 3200) {
    const SEG = 384, rings = [0]; let r = 0;
    while (r < 100) { r += 0.625; rings.push(r); }
    while (r < maxR) { r = Math.min(r * 1.036, maxR); rings.push(r); }
    const nV = 1 + (rings.length - 1) * SEG, pos = new Float32Array(nV * 3), col = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const put = (i, x, z) => { const y = height(x, z); pos.set([x, y, z], i * 3); col.set(colorAt(x, z), i * 3); uv.set([x / 6, z / 6], i * 2); };
    put(0, 0, 0);
    for (let i = 1; i < rings.length; i++) for (let k = 0; k < SEG; k++) { const a = ((k + (i % 2) * 0.5) / SEG) * TAU; put(1 + (i - 1) * SEG + k, Math.cos(a) * rings[i], Math.sin(a) * rings[i]); }
    const idx = [];
    for (let k = 0; k < SEG; k++) idx.push(0, 1 + ((k + 1) % SEG), 1 + k);
    for (let i = 1; i < rings.length - 1; i++) {
      const a0 = 1 + (i - 1) * SEG, b0 = 1 + i * SEG;
      for (let k = 0; k < SEG; k++) { const a = a0 + k, a1 = a0 + ((k + 1) % SEG), b = b0 + k, b1 = b0 + ((k + 1) % SEG); idx.push(a, a1, b, a1, b1, b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: regolithMap, normalMap: regolithN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1, metalness: 0, envMapIntensity: 0.25 });
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; m.name = 'terrain';
    return m;
  }
  function scatterRocks(group, height, body, cfg, seed, flats) {
    const geos = rockGeos(seed), rr = seeded(seed + 3), N = Math.min(5000, Math.round(1800 * (cfg.rocks ?? 1)));
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, flatShading: true, envMapIntensity: 0.3 });
    const base = body === 'moon' ? [0.36, 0.355, 0.34] : [0.42, 0.26, 0.17];
    const meshes = geos.map((g) => { const m = new THREE.InstancedMesh(g, mat, Math.ceil(N / 3)); m.castShadow = m.receiveShadow = true; m.count = 0; group.add(m); return m; });
    const o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const a = rr() * TAU, d = 3 + Math.pow(rr(), 0.85) * 260, x = Math.cos(a) * d, z = Math.sin(a) * d;
      const s = rr() < 0.012 ? 0.7 + rr() * 1.3 : 0.04 + 0.75 * rr() ** 6;
      if (flats.some((f) => Math.hypot(x - f.x, z - f.z) < f.r * 1.25 + s)) continue;
      o.position.set(x, height(x, z) - s * 0.3, z); o.rotation.set(rr() * 0.6, rr() * TAU, rr() * 0.6);
      o.scale.set(s * (0.8 + rr() * 0.5), s * (0.5 + rr() * 0.4), s * (0.8 + rr() * 0.5)); o.updateMatrix();
      const m = meshes[i % 3]; m.setMatrixAt(m.count, o.matrix);
      const v = 0.8 + rr() * 0.4; c.setRGB(base[0] * v, base[1] * v, base[2] * v); m.setColorAt(m.count, c); m.count++;
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  }
  function envFor(body, sunDir) { // reflections that match this sky and ground
    const s = new THREE.Scene(), moon = body === 'moon';
    s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: { sky: { value: new THREE.Color(...(moon ? [0.0, 0.0, 0.0] : [0.8, 0.6, 0.43])) }, gnd: { value: new THREE.Color(...(moon ? [0.32, 0.31, 0.3] : [0.5, 0.3, 0.18])) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 sky, gnd; varying vec3 vP; void main(){ float y = normalize(vP).y; gl_FragColor = vec4(mix(gnd, sky, smoothstep(-0.05, 0.08, y)), 1.0); }',
    })));
    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 29, 27) })); sp.position.copy(sunDir).multiplyScalar(8); s.add(sp);
    const rt = pmrem.fromScene(s, 0.02);
    s.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt.texture;
  }

  // ---------------------------------------------------------- building a site
  async function build(site) {
    const body = site.body, B = BODY[body], cfg = SITE[site.id] || { rough: 0.7, rocks: 1, hills: 0.4 }, seed = hashStr(site.id) % 100000;
    const group = new THREE.Group();
    const places = site.items.map((id, i) => {
      const p = PLACE[id] || (i === 0 ? [0, 0, (seed % 628) / 100] : [Math.cos(i * 2.1) * 14 * i, Math.sin(i * 2.1) * 14 * i, i]);
      return { id, x: p[0], z: p[1], yaw: p[2], r: RADIUS[items[id].model] ?? 2 };
    });
    const isApollo = site.items.some((id) => items[id].model === 'lm');
    const flagAt = isApollo ? [6.5, -5] : null;
    const flats = places.filter((p) => p.r > 0).map((p) => ({ x: p.x, z: p.z, r: p.r }));
    if (flagAt) flats.push({ x: flagAt[0], z: flagAt[1], r: 0.8 });
    const trails = isApollo ? [...places.filter((p) => p.x || p.z).map((p) => [1.5, 1.5, p.x, p.z]), [0, 0, flagAt[0], flagAt[1]]] : [];
    const { height, poly } = makeHeight(site, body, cfg, seed, flats);
    groundH = height;
    const terrain = terrainMesh(height, makeColor(site, body, cfg, seed, trails, poly));
    group.add(terrain);
    scatterRocks(group, height, body, cfg, seed, flats);
    if (site.id === 'pathfinder') { // the boulder Yogi, beside Sojourner
      const y = new THREE.Mesh(rockGeos(seed + 50)[0], new THREE.MeshStandardMaterial({ color: 0x6e4430, roughness: 0.95, flatShading: true }));
      y.scale.set(1.1, 0.75, 0.9); y.position.set(7.4, height(7.4, 2.6) + 0.1, 2.6); y.castShadow = y.receiveShadow = true; group.add(y);
    }
    if (flagAt) { const f = flagModel(site.id === 'apollo11'); f.position.set(flagAt[0], height(flagAt[0], flagAt[1]), flagAt[1]); f.rotation.y += 0.6; f.traverse((o) => { if (o.isMesh) o.castShadow = true; }); group.add(f); }

    // hardware
    const ents = [];
    await Promise.all(places.map(async (p) => {
      const item = items[p.id], key = item.model;
      let model;
      if (key === 'alsep') model = BUILDERS.alsep(3);
      else if (CRASH[key]) model = impactDebris(seed, CRASH[key].debris);
      else model = await loadModel(key);
      model.updateMatrixWorld(true);
      let ascent = [];
      if (key === 'lm') { // the ascent stage flew the crew home; only the descent stage stayed
        const bb = new THREE.Box3().setFromObject(model), cut = bb.min.y + (bb.max.y - bb.min.y) * LM_CUT, mb = new THREE.Box3();
        model.traverse((o) => { if (o.isMesh) { mb.setFromObject(o); if (mb.min.y > cut) { o.visible = false; ascent.push(o); } } });
      }
      const real = REAL_ITEM[p.id] || REAL[key];
      if (real) { const s = new THREE.Box3().setFromObject(model).getSize(V()); model.scale.multiplyScalar(real / Math.max(s.x, s.z)); model.updateMatrixWorld(true); }
      const bb = new THREE.Box3(); model.traverse((o) => { if (o.isMesh && o.visible) bb.expandByObject(o); });
      if (bb.isEmpty()) bb.setFromObject(model);
      const c = bb.getCenter(V()), size = bb.getSize(V());
      model.position.x -= c.x; model.position.z -= c.z; model.position.y -= bb.min.y + 0.02;
      model.traverse((o) => {
        if (!o.isMesh) return; o.castShadow = o.receiveShadow = true;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m && 'envMapIntensity' in m) m.envMapIntensity = 1; });
      });
      const root = new THREE.Group(), bodyG = new THREE.Group(), spin = new THREE.Group();
      const rover = ROVER[key];
      spin.rotation.y = rover ? rover.fwd : 0; spin.add(model); bodyG.add(spin); root.add(bodyG);
      if (p.id === 'insight') { const along = size.x > size.z; bodyG.add(seismoDecor(model, along)); }
      root.position.set(p.x, height(p.x, p.z), p.z); root.rotation.y = p.yaw;
      group.add(root);
      const e = { id: p.id, item, key, root, body: bodyG, model, x: p.x, z: p.z, yaw: p.yaw, radius: Math.max(size.x, size.z) / 2, height: size.y, ascent, scaleY: model.scale.y, wheels: model.userData.wheels || [], wheelR: model.userData.wheelR || 0.3, builder: !!BUILDERS[key] || key === 'alsep' || key === 'ranger' };
      if (CRASH[key]) { e.radius = 7 * Math.max(CRASH[key].debris, 0.4); e.height = 0.5; }
      if (key === 'ingenuity') e.rotors = ['rotors_01', 'rotors_02'].map((n) => pivotFor(model.getObjectByName(n))).filter(Boolean);
      // label
      const el = document.createElement('button'); el.type = 'button'; el.className = 'slbl';
      el.innerHTML = `<span class="slbl__name"></span><span class="slbl__kind"></span>`;
      el.querySelector('.slbl__name').textContent = CRASH[key] ? CRASH[key].label : item.name;
      el.querySelector('.slbl__kind').textContent = item.kind;
      el.addEventListener('click', (ev) => { ev.stopPropagation(); select(e.id); });
      el.addEventListener('pointerenter', () => setHover(e)); el.addEventListener('pointerleave', () => setHover(null));
      labelHost.appendChild(el); e.label = el;
      root.traverse((o) => { o.userData.ent = e; });
      ents.push(e);
    }));
    ents.sort((a, b) => site.items.indexOf(a.id) - site.items.indexOf(b.id));
    // tracks the rovers left before they stopped
    for (const e of ents) {
      const cfgR = ROVER[e.key]; if (!cfgR) continue;
      const back = (d, side) => [e.x - Math.cos(e.yaw) * d + Math.sin(e.yaw) * side, e.z + Math.sin(e.yaw) * d + Math.cos(e.yaw) * side];
      const pts = e.key === 'lrv' ? [[3, 3], [9, -6], back(9, 4), back(4, 1), [e.x, e.z]]
        : e.key === 'sojourner' ? [[1.9, 1.6], [3.2, 3.4], back(1.2, 0.2), [e.x, e.z]]
          : e.key === 'skPRover' ? [[e.x + 30, e.z + 22], back(14, 3), back(6, 0.5), [e.x, e.z]]
          : [back(34, 6), back(22, -3), back(11, 2), back(4, 0.4), [e.x, e.z]];
      seedTracks(pts, cfgR);
    }
    return { site, body, cfg, seed, group, terrain, height, ents, sunEl: cfg.sunEl ?? B.sunEl, sunAz: cfg.sunAz ?? B.sunAz };
  }
  function pivotFor(obj) { // spin a rotor about the vertical axis through its own centre
    if (!obj || !obj.parent) return null;
    const parent = obj.parent, c = new THREE.Box3().setFromObject(obj).getCenter(V());
    parent.worldToLocal(c);
    const p = new THREE.Group(); p.position.set(c.x, 0, c.z); parent.add(p);
    obj.position.x -= c.x; obj.position.z -= c.z; p.add(obj);
    return p;
  }
  function dispose() {
    if (!world) return;
    stopDrive(); stopFly(); fx.length = 0; recovering = false;
    scene.remove(world.group); world.group.remove(dustPts, tracks); // shared buffers, kept for the next site
    world.group.traverse((o) => {
      if (o.userData.ent && !o.userData.ent.builder) return; // glTF geometry is shared with the model cache
      if (o.geometry) o.geometry.dispose();
    });
    world.terrain.material.dispose();
    world.ents.forEach((e) => e.label.remove());
    trackN = 0; tracks.count = 0; dust.age.fill(1); dust.life.fill(0);
    world = null;
  }

  // ---------------------------------------------------------- sun and sky
  const sunDir = V(0, 1, 0);
  function setSun(elDeg, azDeg = world.sunAz) {
    world.sunEl = elDeg; world.sunAz = azDeg;
    const el = THREE.MathUtils.degToRad(elDeg), az = THREE.MathUtils.degToRad(azDeg);
    sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    const B = BODY[world.body], low = sstep(-2, 12, elDeg);
    sun.intensity = B.sunI * low; hemi.intensity = B.hemi[2] * (0.25 + 0.75 * low);
    sunDisc.position.copy(sunDir).multiplyScalar(4800);
    if (world.body === 'mars') {
      marsSky.material.uniforms.sunDir.value.copy(sunDir); const dim = 0.35 + 0.65 * sstep(-4, 20, elDeg); marsSky.material.uniforms.dim.value = dim;
      scene.fog.color.setRGB(0.8 * dim, 0.6 * dim, 0.43 * dim);
    }
    dustMat.uniforms.uLight.value = 0.35 + 0.65 * low;
  }
  function applyEnv() {
    if (scene.environment) scene.environment.dispose();
    scene.environment = envFor(world.body, sunDir);
  }
  function setupSky() {
    skyGroup.clear();
    const moon = world.body === 'moon', B = BODY[world.body];
    sun.color.setHex(B.sunColor); hemi.color.setHex(B.hemi[0]); hemi.groundColor.setHex(B.hemi[1]);
    trackMat.color.setHex(B.track);
    if (moon) {
      scene.background = new THREE.Color(0x000000); scene.fog = null;
      skyGroup.add(stars, earth, earthGlow, sunDisc);
      sunDisc.scale.setScalar(900); sunDisc.material.color.setRGB(1.6, 1.55, 1.45);
      // Earth stands still in the lunar sky, at a place set by the site's latitude and longitude
      const s = world.site, la = THREE.MathUtils.degToRad(s.lat), lo = THREE.MathUtils.degToRad(s.lon);
      const dir = V(-Math.sin(lo), Math.cos(la) * Math.cos(lo), Math.sin(la) * Math.cos(lo)).normalize();
      world.earthDir = dir; earth.position.copy(dir).multiplyScalar(4300); earthGlow.position.copy(earth.position);
      earth.rotation.set(0.4, 2.2, 0.41);
    } else {
      scene.background = null; scene.fog = new THREE.FogExp2(0xcc9a6e, 0.0011);
      skyGroup.add(marsSky, sunDisc);
      sunDisc.scale.setScalar(420); sunDisc.material.color.setRGB(1.3, 1.25, 1.2);
    }
    setSun(world.sunEl); applyEnv();
  }

  // ---------------------------------------------------------- camera
  function flyCam(toPos, toTgt, dur, fromPos) {
    camTween = { t: 0, dur, fromPos: (fromPos || camera.position).clone(), fromTgt: controls.target.clone(), toPos, toTgt };
    if (fromPos) camera.position.copy(fromPos);
  }
  function viewOf(e) {
    const big = !!e.item.base;
    const tgt = e.root.position.clone().add(V(0, big ? Math.min(e.height * 0.4, 9) : Math.min(e.height * 0.42, 2.4), 0));
    const dist = big ? clamp(Math.max(e.radius * 2.1 + 6, e.height * 1.5), 12, 70) : clamp(e.radius * 2.7 + 2.4, 3, 30), az = THREE.MathUtils.degToRad(world.sunAz) + 0.6, el = big ? 0.36 : 0.3;
    const pos = tgt.clone().add(V(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -Math.cos(az) * Math.cos(el) * dist));
    return { pos, tgt };
  }
  function clampCam() {
    const gh = world.height(camera.position.x, camera.position.z) + 0.45;
    if (camera.position.y < gh) camera.position.y = gh;
  }
  controls.addEventListener('start', () => { camTween = null; lastUser = performance.now(); });

  // ---------------------------------------------------------- selection, hover, picking
  function select(id, { descend = false } = {}) {
    if (!world) return;
    const e = world.ents.find((x) => x.id === id); if (!e) return;
    if (drive && drive.e !== e) stopDrive();
    if (fly && fly.e !== e) stopFly();
    world.sel = e;
    world.ents.forEach((x) => x.label.classList.toggle('is-sel', x === e));
    const v = viewOf(e);
    if (descend) {
      const az = THREE.MathUtils.degToRad(world.sunAz) + 0.9;
      controls.target.copy(v.tgt).add(V(0, -20, 0)); // look down at the site while descending
      flyCam(v.pos, v.tgt, reducedMotion() ? 0.01 : 3.6, v.tgt.clone().add(V(Math.sin(az) * 70, 95, -Math.cos(az) * 70)));
    } else flyCam(v.pos, v.tgt, reducedMotion() ? 0.01 : 1.5);
    onSelect(id);
  }
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hoverEnt = null;
  function setHover(e) { if (hoverEnt === e) return; if (hoverEnt) hoverEnt.label.classList.remove('is-hover'); hoverEnt = e; if (e) e.label.classList.add('is-hover'); canvas.classList.toggle('is-pointer', !!e); }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitAt(ev, withGround = false) {
    const r = canvas.getBoundingClientRect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const objs = world.ents.filter((e) => e.root.visible).map((e) => e.root); if (withGround) objs.push(world.terrain);
    return ray.intersectObjects(objs, true).find((h) => h.object.visible) || null;
  }
  let down = null, hoverQueued = false, lastMove = null;
  canvas.addEventListener('pointermove', (ev) => {
    if (!active || ev.buttons) return; lastMove = ev;
    if (hoverQueued) return; hoverQueued = true;
    requestAnimationFrame(() => { hoverQueued = false; if (!active || !lastMove) return; const h = hitAt(lastMove); setHover(h ? h.object.userData.ent : null); });
  });
  canvas.addEventListener('pointerdown', (ev) => { if (active) down = [ev.clientX, ev.clientY]; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!active || !down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 6) return;
    const h = hitAt(ev); if (h && h.object.userData.ent) select(h.object.userData.ent.id);
  });
  canvas.addEventListener('dblclick', (ev) => { // walk to a spot on the ground
    if (!active || drive || fly) return;
    const h = hitAt(ev, true); if (!h || h.object !== world.terrain) return;
    const tgt = h.point.clone().add(V(0, 1, 0)), off = camera.position.clone().sub(controls.target);
    if (off.length() > 14) off.setLength(14);
    flyCam(tgt.clone().add(off), tgt, 1.2);
  });

  // ---------------------------------------------------------- keyboard (walk, drive, fly)
  const KEYMAP = { arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd' };
  addEventListener('keydown', (ev) => {
    if (!active || /input|textarea|select/i.test(ev.target.tagName)) return;
    const k = KEYMAP[ev.key.toLowerCase()] || ev.key.toLowerCase();
    if (['w', 'a', 's', 'd', ' ', 'q', 'e', 'shift'].includes(k)) { keys.add(k); if (k !== 'shift') ev.preventDefault(); }
    if (k === ' ' && fly) { fly.target = fly.target > 0 ? 0 : 4; }
  });
  addEventListener('keyup', (ev) => { const k = KEYMAP[ev.key.toLowerCase()] || ev.key.toLowerCase(); keys.delete(k); });
  addEventListener('blur', () => keys.clear());
  const axis = (pos, neg) => (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  function camForward() { const f = controls.target.clone().sub(camera.position); f.y = 0; return f.lengthSq() ? f.normalize() : V(0, 0, -1); }
  function moveCamWith(dx, dz, dy = 0) { camera.position.x += dx; camera.position.z += dz; camera.position.y += dy; controls.target.x += dx; controls.target.z += dz; controls.target.y += dy; }

  // ---------------------------------------------------------- driving
  function startDrive(e) {
    stopFly();
    const cfg = ROVER[e.key];
    drive = { e, cfg, speed: 0, steer: 0, heading: e.yaw, odo: 0, acc: 0, spin: 0, dustAcc: 0, snd: sfxLoop('motor') };
    showHud('drive', cfg); onState();
    onToast(`Driving the ${cfg.name}. W/S or arrows to drive, A/D to steer, Space to brake. ${cfg.note}`);
  }
  function stopDrive() { if (!drive) return; drive.snd.stop(); drive = null; hideHud(); onState(); }
  function blocked(x, z, self) {
    for (const o of world.ents) if (o !== self && o.root.visible && !CRASH[o.key] && Math.hypot(x - o.x, z - o.z) < o.radius * 0.85 + self.radius * 0.7) return true;
    return Math.hypot(x, z) > 600;
  }
  function placeOnGround(e, heading, lift = 0) {
    const cfg = ROVER[e.key] || { wb: e.radius, track: e.radius }, c = Math.cos(heading), s = Math.sin(heading);
    const H = world.height, fx = c * cfg.wb / 2, fz = -s * cfg.wb / 2, lx = -s * cfg.track / 2, lz = -c * cfg.track / 2;
    const hf = H(e.x + fx, e.z + fz), hb = H(e.x - fx, e.z - fz), hl = H(e.x + lx, e.z + lz), hr = H(e.x - lx, e.z - lz);
    e.root.position.set(e.x, Math.max((hf + hb + hl + hr) / 4, H(e.x, e.z) - 0.05) + lift, e.z);
    e.root.rotation.set(0, heading, 0);
    e.body.rotation.set(Math.atan2(hl - hr, cfg.track), 0, Math.atan2(hf - hb, cfg.wb));
  }
  function updateDrive(dt) {
    const d = drive, e = d.e, c = d.cfg;
    const thr = axis('w', 's'), st = axis('a', 'd'), brake = keys.has(' ');
    const want = thr > 0 ? c.max : thr < 0 ? -c.max * 0.5 : 0;
    const rate = brake ? c.accel * 3 : thr ? c.accel : c.accel * 0.6;
    d.speed += clamp((brake ? 0 : want) - d.speed, -rate * dt, rate * dt);
    d.steer += (st * c.turn - d.steer) * (1 - Math.exp(-dt * 5));
    d.heading += (d.speed / c.wb) * Math.tan(d.steer) * dt;
    const nx = e.x + Math.cos(d.heading) * d.speed * dt, nz = e.z - Math.sin(d.heading) * d.speed * dt;
    const ox = e.root.position.x, oy = e.root.position.y, oz = e.root.position.z;
    if (blocked(nx, nz, e)) { if (Math.abs(d.speed) > 0.3) onToast('Blocked: drive around it.'); d.speed = 0; } else { e.x = nx; e.z = nz; }
    e.yaw = d.heading; placeOnGround(e, d.heading);
    moveCamWith(e.root.position.x - ox, e.root.position.z - oz, (e.root.position.y - oy) * 0.6);
    // wheels: roll and steer
    const roll = (d.speed * dt) / (e.wheelR || 0.3); d.spin += roll;
    for (const w of e.wheels) { w.obj.rotation.z = w.z0 + (w.flip ? d.spin : -d.spin); if (w.steer) w.obj.rotation.y = w.y0 + d.steer * (w.front ? 1 : -1) * 0.8; }
    // tracks + dust from the rear wheels
    const v = Math.abs(d.speed);
    d.snd.set(v / c.max);
    d.acc += v * dt; d.odo += v * dt;
    while (d.acc > 0.34) { d.acc -= 0.34; const bx = e.x - Math.cos(d.heading) * c.wb * 0.45, bz = e.z + Math.sin(d.heading) * c.wb * 0.45; stampPair(bx, bz, d.heading, c); }
    if (v > 0.15) {
      d.dustAcc += dt * v * (world.body === 'moon' ? 70 : 45);
      const B = BODY[world.body], s = Math.sin(d.heading), co = Math.cos(d.heading);
      while (d.dustAcc > 1) {
        d.dustAcc -= 1;
        const side = Math.random() < 0.5 ? -1 : 1, wx = e.x - co * c.wb * 0.5 * Math.sign(d.speed) - s * side * c.track / 2, wz = e.z + s * c.wb * 0.5 * Math.sign(d.speed) - co * side * c.track / 2;
        const gy = world.height(wx, wz), back = -Math.sign(d.speed) * (0.4 + Math.random() * 0.6) * v;
        // the LRV's famous rooster tails: on the airless Moon dust flies in clean arcs and drops straight back
        emit(wx, gy + 0.08, wz, co * back + (Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 1.3 * Math.min(v, 2.5), -s * back + (Math.random() - 0.5) * 0.6,
          world.body === 'moon' ? 3 : 2.6, c.tread * (0.18 + Math.random() * 0.25), B.dust.map((x) => x * (0.85 + Math.random() * 0.3)), gy);
      }
    }
    // chase camera: swing in behind the rover while it moves, unless the visitor is steering the view
    if (v > 0.25 && performance.now() - lastUser > 2500 && !camTween) {
      const off = camera.position.clone().sub(controls.target), dist = off.length(), want3 = V(-Math.cos(d.heading), 0, Math.sin(d.heading)).multiplyScalar(Math.max(dist, e.radius * 3 + 3) * 0.92);
      want3.y = Math.max(off.y, e.radius * 0.9 + 1.2);
      off.lerp(want3, 1 - Math.exp(-dt * 1.2)); camera.position.copy(controls.target).add(off);
    }
    if (hudRead) hudRead.textContent = `${(v * 3.6).toFixed(1)} km/h · ${d.odo.toFixed(0)} m driven`;
  }

  // ---------------------------------------------------------- flying (Ingenuity)
  function startFly(e) {
    stopDrive();
    fly = { e, alt: 0, target: 4, rpm: 0, vel: V(), tilt: V(), odo: 0, snd: sfxLoop('rotor') };
    showHud('fly'); onState();
    onToast('Spinning up. Ingenuity flew 72 times in air 1% as thick as Earth’s. W/A/S/D to fly, Q/E to change height, Space to land or take off.');
  }
  function stopFly() { if (!fly) return; fly.snd.stop(1.2); const e = fly.e; fly = null; e.root.position.y = world ? world.height(e.x, e.z) : e.root.position.y; e.body.rotation.set(0, 0, 0); hideHud(); onState(); }
  function updateFly(dt) {
    const f = fly, e = f.e, wantRpm = f.target > 0 || f.alt > 0.02 ? 50 : 0;
    f.rpm += clamp(wantRpm - f.rpm, -18 * dt, 18 * dt); f.snd.set(f.rpm / 50);
    if (e.rotors) { e.rotors[0] && (e.rotors[0].rotation.y += f.rpm * dt); e.rotors[1] && (e.rotors[1].rotation.y -= f.rpm * dt); }
    if (f.rpm > 40 && f.target > 0) f.target = clamp(f.target + axis('e', 'q') * 2 * dt, 1, 12);
    const lift = f.rpm > 40 || f.target === 0;
    if (lift) f.alt += clamp((f.target - f.alt) * 1.5, -1.2, 1.2) * dt;
    f.alt = Math.max(f.alt, 0);
    const fw = camForward(), rt = V(-fw.z, 0, fw.x), ax = axis('w', 's'), ay = axis('d', 'a');
    const wantV = fw.multiplyScalar(ax).add(rt.multiplyScalar(ay)); if (wantV.lengthSq()) wantV.setLength(f.alt > 0.5 ? 3.5 : 0);
    f.vel.lerp(wantV, 1 - Math.exp(-dt * 2));
    const ox = e.root.position.x, oy = e.root.position.y, oz = e.root.position.z;
    const nx = e.x + f.vel.x * dt, nz = e.z + f.vel.z * dt;
    if (f.alt > 0.4 && !blocked(nx, nz, e)) { e.x = nx; e.z = nz; f.odo += f.vel.length() * dt; }
    const gy = world.height(e.x, e.z);
    e.root.position.set(e.x, gy + f.alt, e.z);
    // lean into the direction of travel
    const lean = f.vel.clone().applyAxisAngle(V(0, 1, 0), -e.root.rotation.y);
    e.body.rotation.x = lerp(e.body.rotation.x, lean.z * 0.08, 1 - Math.exp(-dt * 4)); e.body.rotation.z = lerp(e.body.rotation.z, -lean.x * 0.08, 1 - Math.exp(-dt * 4));
    moveCamWith(e.root.position.x - ox, e.root.position.z - oz, e.root.position.y - oy);
    // rotor downwash lifts dust off the ground
    if (f.rpm > 25 && f.alt < 3.5) {
      const n = Math.round((1 - f.alt / 3.5) * 10 * (f.rpm / 50)), B = BODY.mars;
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 0.4 + Math.random() * 0.4; emit(e.x + Math.cos(a) * r, gy + 0.05, e.z + Math.sin(a) * r, Math.cos(a) * (2 + Math.random() * 2), 0.2 + Math.random() * 0.5, Math.sin(a) * (2 + Math.random() * 2), 2.2, 0.12 + Math.random() * 0.15, B.dust, gy); }
    }
    if (f.target === 0 && f.alt <= 0.01 && f.rpm <= 0.5) { stopFly(); onToast('Landed. Ingenuity’s last flight ended in January 2024 with a damaged rotor blade.'); return; }
    if (hudRead) hudRead.textContent = f.alt < 0.05 ? (f.rpm < 40 ? 'Spinning up the rotors…' : 'On the ground') : `${f.alt.toFixed(1)} m up · ${f.odo.toFixed(0)} m flown`;
  }

  // ---------------------------------------------------------- one-shot effects
  function laser(e) {
    const fromOrbit = e.key === 'vikram', top = e.root.position.clone().add(V(0, fromOrbit ? e.height + 0.05 : 0.25, 0)), dir = fromOrbit ? V(0.12, 1, 0.08).normalize() : world.earthDir || V(0, 1, 0), L = 4200;
    const mk = (r, color, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); return m; };
    const beam = mk(0.05, 0x3dff7a, 0.22), pulse = mk(0.14, 0x9dffb8, 0.95);
    beam.scale.set(1, L, 1); beam.position.copy(top).addScaledVector(dir, L / 2);
    pulse.scale.set(1, 40, 1);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x6dff9a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flash.position.copy(top); flash.scale.setScalar(0.01);
    world.group.add(beam, pulse, flash); sfx.laser();
    // stand back so the beam reaches up toward Earth in the frame
    const away = V(-dir.x, 0, -dir.z).normalize(); const tgt = top.clone().addScaledVector(dir, 3);
    flyCam(top.clone().addScaledVector(away, 8).add(V(0, 2.2, 0)), tgt, 1.2);
    fx.push({ t: 0, dur: 4.2, update(t) {
      const k = t < 1.4 ? 1 - t / 1.4 : t < 1.6 ? 0 : (t - 1.6) / 1.4; // down, bounce, back up
      pulse.visible = t < 3.0; pulse.position.copy(top).addScaledVector(dir, k * 600 + 20);
      const fl = Math.exp(-(((t - 1.5) / 0.18) ** 2)); flash.scale.setScalar(0.3 + fl * 3); flash.material.opacity = fl;
      beam.material.opacity = 0.22 * (1 - sstep(3.2, 4.2, t));
    }, end() { world && world.group.remove(beam, pulse, flash); [beam, pulse].forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); flash.material.dispose(); } });
    onToast(fromOrbit ? 'NASA’s Lunar Reconnaissance Orbiter fires its laser altimeter at Vikram’s little 8-cube reflector. In December 2023 this worked for the first time: a reflector on the Moon ranged from lunar orbit, a step toward a precise lunar reference network.' : 'A laser pulse from an observatory on Earth hits the mirror and comes straight back 2.5 seconds later. Timing it measures the Earth–Moon distance to a few millimetres: the Moon drifts 3.8 cm farther away every year.');
  }
  function quake(e) {
    const c = e.root.position.clone(), rings = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 128).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf3d09a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false }));
      m.position.copy(c).add(V(0, 0.08, 0)); world.group.add(m); rings.push(m);
    }
    shake = 2.4; sfx.quake(4.5);
    fx.push({ t: 0, dur: 4.5, update(t) { rings.forEach((m, i) => { const k = clamp((t - i * 0.45) / 3, 0, 1); m.scale.setScalar(0.5 + k * 70); m.material.opacity = k > 0 && k < 1 ? 0.55 * (1 - k) : 0; }); },
      end() { rings.forEach((m) => { world && world.group.remove(m); m.geometry.dispose(); m.material.dispose(); }); } });
    onToast(world.body === 'moon'
      ? 'The Apollo seismometers recorded about 12,500 moonquakes from 1969 to 1977. The Moon “rang like a bell”: shaking lasted for up to an hour.'
      : 'InSight recorded 1,319 marsquakes, enough to map Mars’s crust, mantle and liquid core.');
  }
  function liftoff(e) {
    if (!e.ascent.length) return;
    e.ascent.forEach((m) => { m.visible = true; m.userData.y0 = m.position.y; });
    const top = e.root.position.clone().add(V(0, e.height + 0.1, 0));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.4, 24, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    world.group.add(flame);
    sfxPlay('rocket', 8.5, (t) => (t < 1.2 ? 0 : 0.85 * (1 - sstep(3.5, 8.5, t)))); setTimeout(() => sfx.clunk(1.2), 1150); // pyrotechnic bolts, then the engine
    const v0 = viewOf(e); flyCam(v0.pos.clone().add(V(0, 2, 0)).addScaledVector(v0.pos.clone().sub(v0.tgt).setY(0).normalize(), 6), top.clone(), 1.0);
    fx.push({ t: 0, dur: 9, update(t, dt) {
      const k = Math.max(0, t - 1.2), dy = 0.5 * 4.2 * k * k; // engine lights at 1.2 s
      e.ascent.forEach((m) => { m.position.y = m.userData.y0 + dy / e.scaleY; });
      flame.visible = t > 1.2 && t < 8; flame.position.copy(top).add(V(0, dy - 1.3, 0)); flame.scale.set(1, 0.8 + Math.random() * 0.4, 1);
      if (t > 1.2 && t < 2.6) for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; emit(top.x + Math.cos(a) * 1.4, top.y - 0.2, top.z + Math.sin(a) * 1.4, Math.cos(a) * (3 + Math.random() * 6), 1 + Math.random() * 3, Math.sin(a) * (3 + Math.random() * 6), 4, 0.08 + Math.random() * 0.1, Math.random() < 0.5 ? [1.0, 0.75, 0.3] : [0.85, 0.85, 0.82], world.height(top.x, top.z)); }
      if (!camTween) controls.target.lerp(top.clone().add(V(0, dy * 0.85, 0)), 1 - Math.exp(-dt * 3));
    }, end() { e.ascent.forEach((m) => { m.position.y = m.userData.y0; m.visible = false; }); world && world.group.remove(flame); flame.geometry.dispose(); flame.material.dispose(); if (world && world.sel) select(world.sel.id); } });
    onToast('The ascent stage fires and climbs away, using the descent stage as its launch pad. Gold insulation flies everywhere. That pad is what stays behind on the Moon.');
  }
  async function impact(e) {
    const C = CRASH[e.key], c = e.root.position.clone(), dir = V(...C.dir).normalize();
    const probe = await loadModel(C.probe);
    const s = new THREE.Box3().setFromObject(probe).getSize(V()); probe.scale.multiplyScalar(C.size / Math.max(s.x, s.y, s.z));
    probe.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const holder = new THREE.Group(); holder.add(probe); world.group.add(holder);
    holder.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flash.position.copy(c).add(V(0, 1, 0)); world.group.add(flash);
    flyCam(c.clone().add(V(22, 10, 20)), c.clone().add(V(0, 3, 0)), 1.0);
    sfx.boom(2.3); // no air on the Moon: what you would feel is the jolt through the ground
    let hit = false;
    fx.push({ t: 0, dur: 5.5, update(t) {
      const k = clamp((t - 1.0) / 1.3, 0, 1);
      holder.visible = k < 1; holder.position.copy(c).addScaledVector(dir, (1 - k) * 260);
      if (k >= 1 && !hit) {
        hit = true; shake = 1.6;
        for (let i = 0; i < 700; i++) { const a = Math.random() * TAU, sp = 4 + Math.random() * 16, up = 3 + Math.random() * 12; emit(c.x, c.y + 0.2, c.z, Math.cos(a) * sp, up, Math.sin(a) * sp, 6, 0.1 + Math.random() * 0.25, BODY.moon.dust.map((x) => x * (0.9 + Math.random() * 0.3)), c.y - 0.5); }
      }
      const fl = hit ? Math.exp(-(t - 2.3) * 4) : 0; flash.material.opacity = fl; flash.scale.setScalar(4 + (1 - fl) * 30);
    }, end() { world && world.group.remove(holder, flash); flash.material.dispose(); } });
    onToast(C.toast);
  }
  // ---------------------------------------------------------- Skylab: recovery hopper, field cleaning, base demos
  function plumeMesh(mars) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.2, 20, 1, true).translate(0, -1.6, 0).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: mars ? 0xffb070 : 0xa9ccff, transparent: true, opacity: mars ? 0.75 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.userData.noShadow = true; return m;
  }
  function addPlumes(h) { // cones point along each canted engine's thrust axis
    return h.userData.engines.map((en) => { const m = plumeMesh(world.body === 'mars'); m.position.copy(en.pos); m.quaternion.setFromUnitVectors(V(0, 1, 0), en.dir); h.add(m); return m; });
  }
  function setPlumes(ps, on, k = 1) { ps.forEach((p) => { p.visible = on; p.scale.set(1, (0.7 + Math.random() * 0.5) * k, 1); }); }
  function groundBlast(x, z, height, strength) { // plume ejecta: dust blasted out sideways, in clean arcs on the Moon
    const gy = world.height(x, z), B = BODY[world.body], n = Math.round(clamp(1 - height / 16, 0, 1) * 26 * strength);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.random() * 3, sp = 6 + Math.random() * 10; emit(x + Math.cos(a) * r, gy + 0.1, z + Math.sin(a) * r, Math.cos(a) * sp, 0.4 + Math.random() * 1.6, Math.sin(a) * sp, 3, 0.12 + Math.random() * 0.2, B.dust.map((v) => v * (0.9 + Math.random() * 0.3)), gy); }
  }
  function cablesTo(h, k, attachY, r) { // bridles from the winch down to the machine's top
    const c = h.userData.cables; c.visible = k > 0.01;
    c.children.forEach((m) => { const a = m.userData.a, p = V(Math.cos(a) * r, attachY - c.position.y, Math.sin(a) * r), L = p.length(); m.quaternion.setFromUnitVectors(V(0, -1, 0), p.clone().normalize()); m.scale.set(1, Math.max(0.001, L * k), 1); });
  }
  async function hopperFor(base) { const h = await loadModel(base.body === 'mars' ? 'skHopperMars' : 'skHopper'); h.traverse((o) => { if (o.isMesh) o.castShadow = !o.userData.noShadow; }); return h; }
  // fly in, winch the machine up, fly it away to the bay; resolves when it has gone
  async function recover(id, { base, km, dir }) {
    const e = world && world.ents.find((x) => x.id === id); if (!e || recovering) return;
    stopDrive(); stopFly(); recovering = true; onState();
    const h = await hopperFor(base), holder = new THREE.Group(); holder.add(h); world.group.add(holder);
    const plumes = addPlumes(h), d = V(dir[0], 0, dir[1]).normalize(), gy = world.height(e.x, e.z), roar = sfxLoop('hopper');
    let winch = null, lifted = false;
    e.home = e.root.position.clone();
    const top = e.root.position.y + e.height, hover = top + 0.7, att = Math.min(e.radius * 0.45, 0.9);
    const P0 = V(e.x, top + 140, e.z).addScaledVector(d, 260), P1 = V(e.x, hover + 9, e.z), P2 = V(e.x, hover, e.z);
    const side = V(-d.z, 0, d.x), camD = Math.max(16, e.radius * 6 + 8), prev = V();
    flyCam(e.root.position.clone().addScaledVector(side, camD).addScaledVector(d, -camD * 0.35).add(V(0, camD * 0.5, 0)), e.root.position.clone().add(V(0, e.height + 2, 0)), 1.4);
    onToast(`${base.name}’s recovery hopper is on its way: a ${km.toLocaleString('en-US')} km hop on ${base.fuel}.${world.body === 'moon' ? ' Hydrogen–oxygen exhaust is almost invisible, so look for the dust.' : ''}`);
    return new Promise((res) => {
      fx.push({ t: 0, dur: 11.5, update(t, dt) {
        let p;
        if (t < 3.6) { const k = 1 - Math.pow(1 - t / 3.6, 2.4); p = P0.clone().lerp(P1, k); p.y += Math.sin(k * Math.PI) * 30; h.rotation.set(0, 0, 0); holder.rotation.z = (1 - k) * 0.25; }
        else if (t < 5.2) { const k = easeIO((t - 3.6) / 1.6); p = P1.clone().lerp(P2, k); holder.rotation.z = 0; }
        else if (t < 6.4) { p = P2.clone(); cablesTo(h, easeIO((t - 5.2) / 1.2), -0.7 + 0.02, att); }
        else if (t < 7.6) { const k = easeIO((t - 6.4) / 1.2); p = P2.clone().add(V(0, k * 3.5, 0)); }
        else { const k = (t - 7.6) / 3.9; p = P2.clone().add(V(0, 3.5 + k * k * 120, 0)).addScaledVector(d, k * k * 220); holder.rotation.z = -Math.min(k * 1.5, 0.3); }
        holder.position.copy(p);
        if (t >= 6.4) { prev.copy(e.root.position); e.root.position.set(p.x, e.home.y + (p.y - P2.y), p.z); if (t < 9.4 && !camTween) { const dl = e.root.position.clone().sub(prev); camera.position.addScaledVector(dl, 0.85); controls.target.add(dl); } }
        setPlumes(plumes, t > 2.6, t < 3.6 ? 1.4 : t > 7.6 ? 1.3 : 0.9);
        roar.set(t < 2.6 ? 0.15 * t / 2.6 : t < 3.6 ? 1 : t < 7.6 ? 0.7 : 1 - sstep(8.5, 11.5, t));
        if (t > 5.2 && t < 6.4 && !winch) winch = sfxPlay('whirr', 1.2, () => 0.8);
        if (t >= 6.4 && !lifted) { lifted = true; sfx.clunk(); }
        if (t > 2.6) for (const en of h.userData.engines) { const w = h.localToWorld(en.pos.clone()); groundBlast(w.x, w.z, w.y - world.height(w.x, w.z), t > 7.6 ? 0.5 : 1); }
      }, end() {
        roar.stop(0.5); e.root.visible = false; e.label.classList.add('is-hidden'); world && world.group.remove(holder);
        recovering = false; res(); onState();
      } });
    });
  }
  // fly the repaired machine back and set it down where it was
  async function deliver(id, { base, dir }) {
    const e = world && world.ents.find((x) => x.id === id); if (!e) return;
    recovering = true;
    const h = await hopperFor(base), holder = new THREE.Group(); holder.add(h); world.group.add(holder);
    const plumes = addPlumes(h), d = V(dir[0], 0, dir[1]).normalize(), home = e.home || e.root.position.clone();
    const top = home.y + e.height, hover = top + 0.7, att = Math.min(e.radius * 0.45, 0.9);
    const P0 = V(e.x, top + 150, e.z).addScaledVector(d, 240), P1 = V(e.x, hover + 8, e.z), P2 = V(e.x, hover, e.z);
    const side = V(-d.z, 0, d.x), camD = Math.max(16, e.radius * 6 + 8);
    camera.position.copy(home).addScaledVector(side, camD).addScaledVector(d, -camD * 0.3).add(V(0, e.height + 7.5, 0)); controls.target.copy(home).add(V(0, e.height + 3, 0)); camera.lookAt(controls.target);
    e.root.visible = true; cablesTo(h, 1, -0.68, att);
    const roar = sfxLoop('hopper'); let down = false;
    return new Promise((res) => {
      fx.push({ t: 0, dur: 10.5, update(t, dt) {
        let p;
        if (t < 3.6) { const k = 1 - Math.pow(1 - t / 3.6, 2.4); p = P0.clone().lerp(P1, k); p.y += Math.sin(k * Math.PI) * 26; holder.rotation.z = (1 - k) * 0.25; }
        else if (t < 5.4) { const k = easeIO((t - 3.6) / 1.8); p = P1.clone().lerp(P2, k); holder.rotation.z = 0; }
        else if (t < 6.6) { p = P2.clone(); cablesTo(h, 1 - easeIO((t - 5.4) / 1.2), -0.68, att); }
        else { const k = (t - 6.6) / 3.9; p = P2.clone().add(V(0, k * k * 110, 0)).addScaledVector(d, k * k * 200); holder.rotation.z = -Math.min(k * 1.5, 0.3); }
        holder.position.copy(p);
        if (t < 5.4) e.root.position.set(p.x, home.y + (p.y - P2.y), p.z); else e.root.position.copy(home);
        setPlumes(plumes, true, t < 3.6 ? 1.4 : 0.9);
        roar.set(t < 3.6 ? 0.3 + 0.7 * t / 3.6 : t < 6.6 ? 0.75 : 1 - sstep(7.5, 10.5, t));
        if (t >= 5.4 && !down) { down = true; sfx.clunk(); sfxPlay('whirr', 1.2, () => 0.8); }
        for (const en of h.userData.engines) { const w = h.localToWorld(en.pos.clone()); groundBlast(w.x, w.z, w.y - world.height(w.x, w.z), t > 6.6 ? 0.5 : 1); }
        if (!camTween && t > 3.0) controls.target.lerp(home.clone().add(V(0, t < 5.4 ? e.height + 2.5 : e.height * 0.5, 0)), 1 - Math.exp(-dt * 2));
      }, end() {
        roar.stop(0.5); e.root.position.copy(home); world && world.group.remove(holder);
        recovering = false; res(); if (world) select(e.id);
      } });
    });
  }
  function restore(id) { const e = world && world.ents.find((x) => x.id === id); if (!e) return; if (e.home) e.root.position.copy(e.home); e.root.visible = true; }
  // electrodynamic dust shield, fitted in place: the reflector's exact position is a 50-year record
  function cleanMirrors(e) {
    const c = e.root.position.clone(), w = Math.max(e.radius * 2.2, 1.0);
    const field = new THREE.Mesh(new THREE.PlaneGeometry(w, w).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.75, 1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    field.position.copy(c).add(V(0, e.height + 0.04, 0)); world.group.add(field);
    flyCam(c.clone().add(V(2.2, 1.8, 2.4)), c.clone().add(V(0, e.height * 0.5, 0)), 1.0);
    sfxPlay('field', 3.4, (t) => sstep(0, 0.3, t) * (1 - sstep(2.9, 3.4, t)));
    fx.push({ t: 0, dur: 3.4, update(t) {
      field.material.opacity = 0.35 * Math.max(0, Math.sin(t * 22)) * sstep(0, 0.3, t) * (1 - sstep(2.9, 3.4, t));
      if (t < 2.8) for (let i = 0; i < 6; i++) { const x = c.x + (Math.random() - 0.5) * w, z = c.z + (Math.random() - 0.5) * w; emit(x, c.y + e.height + 0.02, z, (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8, 2.5, 0.025 + Math.random() * 0.03, BODY.moon.dust, world.height(x, z)); }
    }, end() { world && world.group.remove(field); field.geometry.dispose(); field.material.dispose(); onRepaired(e.id); onState(); } });
    onToast('An electrodynamic dust shield ripples electric fields across the mirrors and the dust hops off. The reflector stays exactly where it is: its position is a 50-year record of the Moon’s orbit. It should now return about ten times more laser light.');
  }
  // Surveyor 6 hopped about 3 m in 1967; Vikram about 40 cm in 2023
  function hop(e) {
    const small = e.key === 'vikram', H = small ? 0.4 : 3.2, D = small ? 0.38 : 2.5, x0 = e.x, z0 = e.z, x1 = x0 + Math.cos(e.yaw + 1.4) * D, z1 = z0 - Math.sin(e.yaw + 1.4) * D;
    const flames = [0, 1, 2].map((k) => { const m = plumeMesh(false); m.scale.setScalar(small ? 0.35 : 0.3); m.material.color.setHex(0xffc890); m.material.opacity = 0.8; e.root.add(m); const a = (k / 3) * TAU; m.position.set(Math.cos(a) * e.radius * 0.35, 0.35, Math.sin(a) * e.radius * 0.35); return m; });
    flyCam(e.root.position.clone().add(V(e.radius * 3 + 3, 2.5, e.radius * 3 + 3)), e.root.position.clone().add(V(0, 1.2, 0)), 1.0);
    sfxPlay('hopper', 4.6, (t) => (t > 0.3 && t < 3.3 ? 0.55 : 0)); setTimeout(() => sfx.clunk(small ? 0.5 : 1), 3250);
    fx.push({ t: 0, dur: 4.6, update(t) {
      const k = clamp((t - 0.6) / 2.6, 0, 1), y = Math.sin(k * Math.PI) * H;
      e.x = lerp(x0, x1, easeIO(k)); e.z = lerp(z0, z1, easeIO(k));
      e.root.position.set(e.x, world.height(e.x, e.z) + y, e.z);
      const on = t > 0.3 && t < 3.3; flames.forEach((f) => { f.visible = on; f.scale.y = (small ? 0.35 : 0.3) * (0.7 + Math.random() * 0.6); });
      if (on && y < 1.5) groundBlast(e.x, e.z, y * 6, 0.25);
    }, end() { flames.forEach((f) => { e.root.remove(f); f.geometry.dispose(); f.material.dispose(); }); e.root.position.set(e.x, world.height(e.x, e.z), e.z); if (e.home) e.home.copy(e.root.position); } });
    onToast(small ? 'Vikram fires its engines, rises about 40 cm and sets down 30–40 cm away, the hop ISRO made on 3 September 2023 to test landing again.' : 'Surveyor fires its three vernier engines, rises about 3 m and lands 2.5 m away, as Surveyor 6 did on 17 November 1967: the first liftoff from the Moon.');
  }
  // a radio signal home (or, at the pole, up to a relay satellite)
  function phone(e, viaRelay) {
    const top = e.root.position.clone().add(V(0, Math.max(e.height * 0.8, 0.6), 0));
    const earthUp = world.earthDir && world.earthDir.y > 0.06;
    const dir = world.body === 'moon' && earthUp && !viaRelay ? world.earthDir.clone() : relayDir.clone(), L = 3000;
    const mk = (r, color, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); return m; };
    const beam = mk(0.04, 0x7fd4ff, 0.18), pulses = [0, 1, 2].map(() => mk(0.12, 0xc8ecff, 0.9));
    beam.scale.set(1, L, 1); beam.position.copy(top).addScaledVector(dir, L / 2); pulses.forEach((p) => p.scale.set(1, 18, 1));
    world.group.add(beam, ...pulses); sfx.signal();
    const away = V(-dir.x, 0, -dir.z); if (away.lengthSq() < 1e-4) away.set(1, 0, 0); away.normalize();
    flyCam(top.clone().addScaledVector(away, Math.max(10, e.radius * 4 + 6)).add(V(0, 3, 0)), top.clone().addScaledVector(dir, 4), 1.1);
    fx.push({ t: 0, dur: 4.0, update(t) { pulses.forEach((p, i) => { const k = (t - i * 0.35) / 2.6; p.visible = k > 0 && k < 1; p.position.copy(top).addScaledVector(dir, k * 700 + 10); }); beam.material.opacity = 0.18 * (1 - sstep(3.2, 4, t)); },
      end() { world && world.group.remove(beam, ...pulses); [beam, ...pulses].forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); } });
    const relay = dir === relayDir || !(world.body === 'moon' && earthUp && !viaRelay);
    onToast(world.body === 'moon'
      ? (relay ? 'Earth is below the horizon here right now, so the signal goes up to a relay satellite in lunar orbit, then down to Earth: about 1.3 seconds in all.' : 'The signal crosses 384,000 km and reaches Earth about 1.3 seconds later.')
      : 'The signal climbs to an orbiter such as MRO, which relays it to NASA’s Deep Space Network. Depending on where the planets are, it reaches Earth 4 to 24 minutes later.');
  }
  function hopTest(e) {
    const h = e.model.userData.hopper; if (!h) return;
    const plumes = addPlumes(h);
    flyCam(e.root.position.clone().add(V(34, 14, 30)), e.root.position.clone().add(V(0, 8, 0)), 1.2);
    sfxPlay('hopper', 10, (t) => (t < 0.6 ? 0 : t < 1.6 ? 1 : t < 9.4 ? 0.7 : 0));
    fx.push({ t: 0, dur: 10, update(t) {
      const y = t < 1.2 ? 0 : t < 4.2 ? 18 * easeIO((t - 1.2) / 3) : t < 6.2 ? 18 : t < 9.2 ? 18 * (1 - easeIO((t - 6.2) / 3)) : 0;
      h.position.y = y; setPlumes(plumes, t > 0.6 && t < 9.4, t < 1.4 ? 1.5 : 1);
      if (t > 0.6 && t < 9.4) for (const en of h.userData.engines) { const w = h.localToWorld(en.pos.clone()); groundBlast(w.x, w.z, w.y - world.height(w.x, w.z), 0.6); }
    }, end() { h.position.y = 0; plumes.forEach((p) => { h.remove(p); p.geometry.dispose(); p.material.dispose(); }); } });
    onToast(world.body === 'moon' ? 'Test hop: four throttled engines lift the hopper 18 m and hold it there. The pad is sintered regolith and the berm stops the blasted dust, which on the airless Moon would otherwise fly for kilometres.' : 'Test hop on methane and oxygen made at the base. With full tanks it can hop half way round Mars to fetch a rover.');
  }
  function sweepSun() {
    const az0 = world.sunAz; flags.fast = 3.2; sfxPlay('whirr', 3.2, (t) => 0.7 * sstep(0, 0.4, t) * (1 - sstep(2.8, 3.2, t)));
    fx.push({ t: 0, dur: 3.2, update(t) { setSun(world.sunEl, az0 + 90 * easeIO(t / 3.2)); }, end() { applyEnv(); } });
    onToast('A week passes in three seconds. At the pole the Sun circles the horizon once a month instead of rising and setting, so the towers turn to follow it all the way round.');
  }
  function puffs(e, at, n = 3, col = [0.92, 0.92, 0.9]) { const p = e.model.localToWorld(at.clone()); for (let i = 0; i < n; i++) emit(p.x, p.y, p.z, (Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, 2.6, 0.18 + Math.random() * 0.2, col, -999); }
  function baseAct(e, act) {
    if (act === 'dig') { flags.dig = 6; sfxPlay('drill', 6, (t) => 0.45 * sstep(0, 0.5, t) * (1 - sstep(5.4, 6, t))); sfxPlay('whirr', 6, () => 0.6); const rx = e.model.userData.rassor; flyCam(e.root.position.clone().add(V(9, 6, 10)), e.root.position.clone().add(V(0, 1, 2)), 1.1); fx.push({ t: 0, dur: 6, update() { const p = rx.getWorldPosition(V()); for (let i = 0; i < 3; i++) emit(p.x + (Math.random() - 0.5) * 2.4, p.y + 0.3, p.z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5, 2.2, 0.06 + Math.random() * 0.08, BODY.moon.dust, world.height(p.x, p.z)); }, end() {} });
      onToast('The bucket drums spin in opposite directions, so their pushes cancel and the light robot can dig without anchoring itself, the trick behind NASA’s RASSOR. Icy regolith goes up the belt to be baked; the steam is caught and condensed.'); }
    else if (act === 'drill') { flags.drill = 6; sfxPlay('drill', 6, (t) => sstep(0, 0.6, t) * (1 - sstep(5.3, 6, t))); flyCam(e.root.position.clone().add(V(10, 6, 11)), e.root.position.clone().add(V(0, 3, 0)), 1.1); fx.push({ t: 0, dur: 6, update(t) { if (Math.random() < 0.5) puffs(e, e.model.userData.vent, 2); }, end() {} });
      onToast('The bit reaches the ice a few metres down. Hot water is pumped in to melt a pool, and the meltwater pumped up: a Rodriguez well, as used at the South Pole station.'); }
    else if (act === 'vent') { sfxPlay('jet', 4.5, (t) => 0.25 + 0.25 * Math.sin(t * 2.4) ** 2); sfxPlay('hum', 4.5, () => 0.6); flyCam(e.root.position.clone().add(V(7, 4.5, 8)), e.root.position.clone().add(V(0, 1.5, 0)), 1.1); fx.push({ t: 0, dur: 4.5, update() { if (Math.random() < 0.45) puffs(e, e.model.userData.vent, 2, [0.85, 0.82, 0.8]); }, end() {} });
      onToast('Martian air is pulled in, compressed and heated to 800 °C; a ceramic membrane pulls the oxygen out. MOXIE’s best was 12 g an hour. This plant makes about 2 kg an hour, the rate NASA’s plans call for to fill a return rocket over a year and a half.'); }
    else if (act === 'lights') { sfx.click(); const on = e.model.userData.toggle && e.model.userData.toggle(); onToast(on ? 'Grow lights on: red and blue LEDs, the colours chlorophyll absorbs best.' : 'Grow lights off. Plants need about 12–16 hours of light a day; Mars’s day (a sol) is 24 h 40 min, close to Earth’s.'); }
    else if (act === 'track') sweepSun();
    else if (act === 'hoptest') hopTest(e);
    else if (act === 'ping') phone(e, true);
    else if (act === 'bay') onBay(e.id);
  }
  function action(id, act) {
    const e = world && world.ents.find((x) => x.id === id); if (!e || recovering) return;
    if (act === 'repair') { onRepair(id); return; }
    if (act === 'drive') { drive && drive.e === e ? stopDrive() : startDrive(e); }
    else if (act === 'fly') { if (fly && fly.e === e) fly.target = fly.target > 0 ? 0 : 4; else startFly(e); onState(); }
    else if (act === 'laser') laser(e);
    else if (act === 'quake') quake(e);
    else if (act === 'liftoff') liftoff(e);
    else if (act === 'impact') impact(e);
    else if (act === 'clean') cleanMirrors(e);
    else if (act === 'hop') hop(e);
    else if (act === 'phone') phone(e);
    else baseAct(e, act);
  }
  const BASE_ACTS = { skHangar: ['bay', 'Enter the repair bay'], skHangarMars: ['bay', 'Enter the repair bay'], skPad: ['hoptest', 'Test-fire the hopper'], skPadMars: ['hoptest', 'Test-fire the hopper'],
    skVSAT: ['track', 'Let a week pass'], skIceMoon: ['dig', 'Run the excavator'], skComms: ['ping', 'Send a signal home'], skCommsMars: ['ping', 'Send a signal home'], skGreenhouse: ['lights', 'Switch the grow lights'],
    skDrill: ['drill', 'Run the drill'], skMoxie: ['vent', 'Run the oxygen plant'] };
  function actionsFor(id) {
    const e = world && world.ents.find((x) => x.id === id); if (!e) return [];
    const a = [], st = status(e.id), ok = st !== 'offline';
    if (recovering) return [{ id: 'wait', label: 'Recovery in progress…' }];
    if (st === 'offline') { const b = baseOf(e.id); a.push({ id: 'repair', label: `Repair at ${b ? b.name : 'the Skylab'}`, primary: true }); }
    if (ROVER[e.key] && ok) a.push({ id: 'drive', label: drive && drive.e === e ? 'Stop driving' : 'Drive it', primary: true });
    if (e.key === 'ingenuity' && ok) a.push({ id: 'fly', label: fly && fly.e === e ? (fly.target > 0 ? 'Land' : 'Take off') : 'Fly it', primary: true });
    if (e.key === 'lrrr' || e.key === 'lrrr15') { a.push({ id: 'laser', label: 'Fire a laser from Earth', primary: st !== 'dimmed' }); if (st === 'dimmed') a.push({ id: 'clean', label: 'Clean the mirrors', primary: true }); }
    if (e.key === 'alsep' && ok) a.push({ id: 'quake', label: 'Feel a moonquake', primary: true });
    if (e.id === 'insight' && ok) a.push({ id: 'quake', label: 'Feel a marsquake', primary: true });
    if (e.key === 'lm' && e.ascent.length) a.push({ id: 'liftoff', label: 'Replay the liftoff', primary: true });
    if (CRASH[e.key]) a.push({ id: 'impact', label: e.key === 'vikramCrash' ? 'Replay the crash' : 'Replay the impact', primary: true });
    if (e.key === 'vikram') a.push({ id: 'laser', label: 'Ping its laser reflector from orbit', primary: !ok });
    if ((e.key === 'surveyor' || e.key === 'vikram') && ok) a.push({ id: 'hop', label: 'Hop', primary: true });
    if ((LANDERS_PHONE.has(e.key) || e.id === 'phoenix') && ok) a.push({ id: 'phone', label: 'Send a signal home' });
    const ba = BASE_ACTS[e.key]; if (ba) a.push({ id: ba[0], label: ba[1], primary: true });
    return a;
  }

  // ---------------------------------------------------------- HUD
  function showHud(mode, cfg) {
    if (!hud) return;
    hud.hidden = false; hud.dataset.mode = mode;
    hud.querySelector('.shud__title').textContent = mode === 'drive' ? `Driving · ${cfg.name}` : 'Flying · Ingenuity';
    hud.querySelector('.shud__keys').textContent = mode === 'drive' ? 'W S drive · A D steer · Space brake · Esc stop' : 'W A S D fly · Q E height · Space land / take off · Esc stop';
  }
  function hideHud() { if (hud) hud.hidden = true; }
  if (hud) { // on-screen controls for touch screens
    hud.querySelectorAll('[data-key]').forEach((b) => {
      const k = b.dataset.key, on = (ev) => { ev.preventDefault(); keys.add(k); if (k === ' ' && fly) fly.target = fly.target > 0 ? 0 : 4; }, off = () => keys.delete(k);
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    const stop = hud.querySelector('.shud__stop'); if (stop) stop.addEventListener('click', () => { stopDrive(); stopFly(); });
  }

  // ---------------------------------------------------------- per frame
  const proj = new THREE.Vector3();
  function updateLabels() {
    const W = innerWidth, H = innerHeight;
    for (const e of world.ents) {
      proj.copy(e.root.position); proj.y += e.height + 0.45; proj.project(camera);
      const dist = camera.position.distanceTo(e.root.position);
      const show = e.root.visible && proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05 && dist < (e.item.base ? 420 : 260);
      e.label.classList.toggle('is-hidden', !show);
      if (show) e.label.style.transform = `translate3d(${(((proj.x + 1) / 2) * W).toFixed(1)}px,${(((1 - proj.y) / 2) * H).toFixed(1)}px,0) translate(-50%,-100%)`;
    }
  }
  function update(dt) {
    if (!active || !world) return;
    // walk on foot (when not driving or flying)
    if (!drive && !fly && !camTween) {
      const ax = axis('w', 's'), ay = axis('d', 'a');
      if (ax || ay) {
        const sp = (keys.has('shift') ? 16 : 5) * dt, f = camForward(), r = V(-f.z, 0, f.x);
        stepT -= dt; if (stepT <= 0) { stepT = keys.has('shift') ? 0.3 : 0.55; sfx.steps(1); }
        const d = f.multiplyScalar(ax * sp).add(r.multiplyScalar(ay * sp));
        moveCamWith(d.x, d.z);
        const gy = world.height(controls.target.x, controls.target.z) + 1.0; const dy = gy - controls.target.y; moveCamWith(0, 0, dy);
      }
    }
    if (drive) updateDrive(dt);
    if (fly) updateFly(dt);
    // the bases are alive: towers track the Sun, dishes track Earth, beacons blink, drums turn
    flags.dig = Math.max(0, flags.dig - dt); flags.drill = Math.max(0, flags.drill - dt); flags.fast = Math.max(0, flags.fast - dt);
    Object.assign(animCtx, { sunDir, earthDir: world.earthDir || null, dig: flags.dig > 0, drill: flags.drill > 0, fast: flags.fast > 0 });
    const now = performance.now() / 1000;
    for (const e of world.ents) { const an = e.model.userData.anim; if (an && e.root.visible) an(now, dt, animCtx); }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t += dt; f.update(f.t, dt); if (f.t >= f.dur) { fx.splice(i, 1); f.end(); } }
    if (camTween) {
      camTween.t += dt; const k = easeIO(clamp(camTween.t / camTween.dur, 0, 1));
      camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k); controls.target.lerpVectors(camTween.fromTgt, camTween.toTgt, k);
      camera.lookAt(controls.target);
      if (k >= 1) camTween = null;
    } else controls.update();
    clampCam();
    updateDust(dt);
    // shadows follow what you are looking at
    const span = clamp(camera.position.distanceTo(controls.target) * 1.1, 8, 70), sc = sun.shadow.camera;
    if (Math.abs(sc.right - span) > span * 0.08) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 400; sc.updateProjectionMatrix(); }
    sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(sunDir, 150);
    skyGroup.position.copy(camera.position);
    if (world.sel && !world.ents.includes(world.sel)) world.sel = null;
    updateLabels();
  }
  const shakeOff = V();
  function render() {
    if (!active || !world) return;
    const s = getShift(), W = innerWidth, H = innerHeight;
    camera.setViewOffset(W, H, -s.x, -s.y, W, H);
    if (shake > 0) { shake = Math.max(0, shake - 1 / 60); shakeOff.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.05 * shake); camera.position.add(shakeOff); }
    renderer.render(scene, camera);
    if (shakeOff.lengthSq()) { camera.position.sub(shakeOff); shakeOff.set(0, 0, 0); }
  }
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    dustMat.uniforms.uScale.value = (innerHeight * renderer.getPixelRatio()) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }

  // ---------------------------------------------------------- enter / leave
  async function enter(site, itemId, { quiet = false } = {}) {
    if (!world || world.site.id !== site.id) {
      dispose();
      world = await build(site);
      scene.add(world.group); world.group.add(dustPts, tracks);
      setupSky();
    }
    active = true; controls.enabled = true; labelHost.hidden = false; resize();
    if (!quiet) select(itemId && world.ents.some((e) => e.id === itemId) ? itemId : world.ents[0].id, { descend: true });
    return world;
  }
  function exit() {
    stopDrive(); stopFly(); keys.clear();
    active = false; controls.enabled = false; labelHost.hidden = true; setHover(null);
    canvas.classList.remove('is-pointer');
  }
  function escape() { if (recovering) return true; if (drive) { stopDrive(); return true; } if (fly) { stopFly(); return true; } return false; }
  labelHost.hidden = true;

  return {
    get active() { return active; }, get world() { return world; }, camera,
    enter, exit, escape, select, update, render, resize, action, actionsFor, recover, deliver, restore,
    get recovering() { return recovering; },
    setSun(el) { if (world) setSun(el); }, commitSun() { if (world) applyEnv(); },
    get sunEl() { return world ? world.sunEl : 0; },
    get busy() { return !!(drive || fly || recovering); },
  };
}
