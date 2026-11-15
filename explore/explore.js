/* =========================================================
   Spacefire Explorer — a 3D map of the hardware NASA left behind.
   Scene (schematic distances, real landing coordinates):
     Sun · Mercury · Venus · Earth + Moon (Apollo, Surveyor, Ranger sites) · Kepler trailing Earth ·
     Eros + NEAR · Mars (Viking, Pathfinder/Sojourner, Spirit, Opportunity, Phoenix,
     InSight, Ingenuity) · asteroid belt + Ceres + Dawn · Jupiter + Galileo · Saturn ·
     Uranus · Neptune · Pioneer 10/11 and Voyager 1/2 on their way out of the solar system.
   Every body sits on a drawn orbit. Moon and Mars sites open a walkable surface (surface.js).
   URL: ?a=<item id> or ?site=<site id> opens that artifact.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BUILDERS } from './builders.js';
import { createSurface } from './surface.js';
import { createLaunch, buildRocket, ROCKET_NAMES } from './launch.js';
import { SKY_BUILDERS, createRepairBay } from './skylab.js';
import { narrate, stopNarration, isSpeaking, hasVoice, onSpeaking, sfx, loop as sfxLoop, setScene, setSfx, setVoice, sfxEnabled, voiceEnabled } from './audio.js';
Object.assign(BUILDERS, SKY_BUILDERS); // the Skylab bases load through the same model loader

const DATA = window.SF_EXPLORE;
const MISSIONS = window.SF_MISSIONS || {}, MISSION_OF = window.SF_MISSION_OF || {}, HARDWARE = window.SF_HARDWARE || {};
// ---- repair state: what each machine needs, and what this visitor has already fixed
const REPAIR = window.SF_REPAIR || {}, BASES = window.SF_BASES || {};
const repaired = new Set((() => { try { return JSON.parse(localStorage.getItem('sf-repaired') || '[]'); } catch (e) { return []; } })());
const saveRepaired = () => { try { localStorage.setItem('sf-repaired', JSON.stringify([...repaired])); } catch (e) { /* private mode */ } };
function statusOf(id) {
  const it = DATA.items[id]; if (it && it.base) return 'base';
  const p = REPAIR[id]; if (!p) return 'working';
  if (repaired.has(id)) return p.status === 'dimmed' ? 'cleaned' : p.status === 'offline' ? 'operational' : p.status;
  return p.status;
}
const baseOf = (id) => { const p = REPAIR[id]; return p && p.base ? BASES[p.base] : null; };
const SKY_COLOR = '#7ff0dc';
const $ = (id) => document.getElementById(id);
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const styled = (n) => { const w = n.split(' '); let k = w.length - 1; while (k > 0 && !/^[A-Za-z][a-z]{2,}$/.test(w[k])) k--; return w.map((x, i) => (i === k ? `<em>${esc(x)}</em>` : esc(x))).join(' '); };

// ------------------------------------------------------------ renderer
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020306);
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 30000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.55; controls.zoomSpeed = 0.9; controls.panSpeed = 0.6;
controls.minDistance = 20; controls.maxDistance = 1600;
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const sunLight = new THREE.PointLight(0xfff2e0, 2.6, 0, 0);
scene.add(sunLight, new THREE.AmbientLight(0x2a3450, 0.35));

// ------------------------------------------------------------ loading
const manager = new THREE.LoadingManager();
let texReady = false;
manager.onLoad = () => { texReady = true; };
const texLoader = new THREE.TextureLoader(manager);
const tex = (p, srgb = true) => { const t = texLoader.load(p); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
const T = {
  day: tex('../shared/assets/space/earth_atmos_2048.webp'), night: tex('../shared/assets/space/earth_lights_2048.webp'),
  spec: tex('../shared/assets/space/earth_specular_2048.webp', false), clouds: tex('../shared/assets/space/earth_clouds_1024.webp'),
  // Moon: NASA SVS CGI Moon Kit (LRO LROC colour mosaic + LOLA elevation), public domain
  moon: tex('tex/moon_lroc_4k.jpg'), moonBump: tex('tex/moon_ldem_2k.jpg', false),
  mars: tex('tex/mars_viking_4k.jpg') /* USGS Viking MDIM 2.1 colour mosaic, public domain */, marsBump: tex('tex/marsbump1k.jpg', false),
  neptune: tex('tex/neptune.jpg'), // NASA 3D Resources
  jupiter: tex('tex/jupitermap.jpg'), saturn: tex('tex/saturnmap.jpg'), ringCol: tex('tex/saturnringcolor.jpg'), ringPat: tex('tex/saturnringpattern.gif', false),
};
const draco = new DRACOLoader().setDecoderPath('./vendor/draco/');
const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
const modelCache = {};
function loadModel(key) {
  if (BUILDERS[key]) return Promise.resolve(BUILDERS[key]());
  if (!modelCache[key]) modelCache[key] = new Promise((res, rej) => gltfLoader.load(`models/${key}.glb`, (g) => res(g.scene), undefined, rej));
  return modelCache[key].then((s) => s.clone(true));
}
function fitObject(obj, size, ground) {
  const wrap = new THREE.Group(); wrap.add(obj);
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3());
  obj.scale.multiplyScalar(size / Math.max(s.x, s.y, s.z, 1e-6));
  box.setFromObject(obj); const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= ground ? box.min.y : c.y;
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m && 'envMapIntensity' in m) m.envMapIntensity = 0.75; }); } });
  return wrap;
}

// ------------------------------------------------------------ shaders
const OUT = '\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
const VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP;
  void main(){ vUv = uv; vOP = position; vN = normalize(mat3(modelMatrix) * normal);
    vec3 t = normalize(cross(vec3(0.0, 1.0, 0.0), normal + vec3(1e-5))); vT = normalize(mat3(modelMatrix) * t); vB = normalize(mat3(modelMatrix) * cross(normal, t));
    vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const NOISE = `
  vec3 hash3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
  float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float n000 = hash3(i).x, n100 = hash3(i + vec3(1,0,0)).x, n010 = hash3(i + vec3(0,1,0)).x, n110 = hash3(i + vec3(1,1,0)).x;
    float n001 = hash3(i + vec3(0,0,1)).x, n101 = hash3(i + vec3(1,0,1)).x, n011 = hash3(i + vec3(0,1,1)).x, n111 = hash3(i + vec3(1,1,1)).x;
    return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  float craters(vec3 p){ vec3 i = floor(p), f = fract(p); float h = 0.0;
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 g = vec3(float(x), float(y), float(z)); vec3 r = hash3(i + g); if (r.z < 0.42) continue;
      float rad = 0.16 + 0.34 * r.x * r.y; float d = length(g + 0.15 + r * 0.7 - f) / rad; if (d > 1.6) continue;
      h += ((d < 1.0 ? (d * d - 1.0) * 0.6 : 0.0) + exp(-pow((d - 1.0) * 4.0, 2.0)) * 0.24) * rad; }
    return h; }`;

// rocky worlds: Moon, Mars, Ceres, Eros (sun at the origin)
// bumpTexel: one texel of the bump source; gamma > 1 adds contrast to flat albedo maps
function rockyMaterial({ map = null, bump = null, color = 0xffffff, crater = 1, craterScale = 26, bumpK = 1.2, bumpTexel = 1 / 1024, gamma = 1, tint = [1, 0.985, 0.96] }) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, bump: { value: bump }, hasMap: { value: map ? 1 : 0 }, hasBump: { value: bump ? 1 : 0 }, color: { value: new THREE.Color(color) },
      uCraters: { value: crater }, cScale: { value: craterScale }, bumpK: { value: bumpK }, bumpTexel: { value: bumpTexel }, gamma: { value: gamma }, tint: { value: new THREE.Vector3(...tint) }, glow: { value: 0 } },
    vertexShader: VS,
    fragmentShader: `uniform sampler2D map, bump; uniform float hasMap, hasBump, uCraters, cScale, bumpK, bumpTexel, gamma, glow; uniform vec3 color, tint;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP;
      ${NOISE}
      float lum(vec2 uv){ return hasBump > 0.5 ? texture2D(bump, uv).r : dot(texture2D(map, uv).rgb, vec3(0.333)); }
      float H(vec3 p, float w1, float w2){ return craters(p * cScale) / cScale * w1 + craters(p * cScale * 3.4 + 17.3) / (cScale * 3.4) * w2; }
      void main(){
        vec3 Nw = normalize(vN), Tw = normalize(vT), Bw = normalize(vB), L = normalize(-vW);
        vec3 base = hasMap > 0.5 ? pow(texture2D(map, vUv).rgb, vec3(gamma)) : color * (0.75 + 0.5 * fbm(vOP * 6.0));
        float gu = 0.0, gv = 0.0;
        if (hasMap > 0.5 || hasBump > 0.5) { float o = bumpTexel; gu = (lum(vUv + vec2(o, 0.0)) - lum(vUv - vec2(o, 0.0))) * bumpK; gv = (lum(vUv + vec2(0.0, o)) - lum(vUv - vec2(0.0, o))) * bumpK; }
        float gT = 0.0, gB = 0.0, hc = 0.0;
        if (uCraters > 0.0) {
          float fp = length(fwidth(vOP)); float w1 = 1.0 - smoothstep(0.6 / cScale * 0.25, 0.6 / cScale, fp); float w2 = 1.0 - smoothstep(0.18 / cScale * 0.25, 0.18 / cScale, fp);
          if (w1 > 0.001) { vec3 p = normalize(vOP); const float e = 0.0012; hc = H(p, w1, w2); gT = (H(p + normalize(cross(vec3(0.0,1.0,0.0), p + 1e-5)) * e, w1, w2) - hc) / e; gB = (H(p + normalize(cross(p, cross(vec3(0.0,1.0,0.0), p + 1e-5))) * e, w1, w2) - hc) / e; }
        }
        vec3 Np = normalize(Nw - Tw * (gu + gT * 0.9 * uCraters) - Bw * (gv + gB * 0.9 * uCraters));
        float ndl = max(dot(Np, L), 0.0), term = smoothstep(-0.04, 0.1, dot(Nw, L));
        base *= 1.0 + clamp(hc * 30.0, -0.15, 0.1) * uCraters;
        vec3 col = base * tint * pow(ndl, 0.9) * 1.3 * term + base * 0.012;
        vec3 V = normalize(cameraPosition - vW); col += vec3(0.95, 0.8, 0.55) * pow(1.0 - max(dot(Nw, V), 0.0), 3.0) * glow;
        gl_FragColor = vec4(col, 1.0); ${OUT}
      }`,
  });
}
function atmosphereMesh(center, radius, shell, uH, gain, blue, warm) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius * shell, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: center }, uR: { value: radius }, uH: { value: uH }, uGain: { value: gain }, cA: { value: new THREE.Color(...blue) }, cB: { value: new THREE.Color(...warm) } },
    vertexShader: VS,
    fragmentShader: `uniform vec3 uC, cA, cB; uniform float uR, uH, uGain; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP;
      void main(){ vec3 ro = cameraPosition - uC, rd = normalize(vW - cameraPosition); float tc = max(-dot(ro, rd), 0.0); vec3 pc = ro + rd * tc;
        float h = max(length(pc) - uR, 0.0) / uR; float dens = exp(-h / uH);
        vec3 sunDir = normalize(-(pc + uC)); float sl = dot(normalize(pc), sunDir);
        float fwd = pow(max(dot(rd, sunDir), 0.0), 10.0);
        float warmth = (1.0 - smoothstep(-0.05, 0.4, sl)) * exp(-h / (uH * 1.4));
        vec3 col = mix(cA, cB, warmth); float k = dens * (smoothstep(-0.3, 0.15, sl) * 0.9 + fwd * 5.0 * smoothstep(-0.5, 0.05, sl));
        gl_FragColor = vec4(col * k * uGain, 1.0); ${OUT} }`,
  }));
  return m;
}

// ------------------------------------------------------------ helpers
function canvasTex(size, draw) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const TX_GLOW = canvasTex(256, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); [[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,236,200,.75)'], [0.32, 'rgba(255,190,120,.22)'], [1, 'rgba(255,150,80,0)']].forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const TX_DOT = canvasTex(128, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,230,190,.85)'], [1, 'rgba(255,200,140,0)']].forEach(([o, c]) => r.addColorStop(o, c)); g.fillStyle = r; g.fillRect(0, 0, s, s); });
const sprite = (map, scale, color = 0xffffff, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, opacity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.scale.setScalar(scale); return s; };
const polar = (r, a, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, -Math.sin(a) * r);
// lat/lon → unit vector in a three.js sphere's local space; lon0 = longitude at the texture's left edge
function latLon(lat, lon, lon0) {
  const u = ((((lon - lon0) / 360) % 1) + 1) % 1, phi = u * Math.PI * 2, th = (90 - lat) * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th));
}
// a closed path from a point function f(angle), drawn like the planet orbits
function pathLine(f, opacity = 0.16, color = 0x8f9cc0, n = 360) {
  const pts = []; for (let i = 0; i <= n; i++) pts.push(f((i / n) * Math.PI * 2));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false }));
}
function orbitLine(r, color = 0x8f9cc0, opacity = 0.16) {
  const pts = []; for (let i = 0; i <= 360; i++) pts.push(polar(r, (i / 360) * Math.PI * 2));
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false }));
}

// ------------------------------------------------------------ stars
{
  const N = 14000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  const band = new THREE.Vector3(0.3, 1, 0.45).normalize(), e1 = new THREE.Vector3().crossVectors(band, new THREE.Vector3(0, 0, 1)).normalize(), e2 = new THREE.Vector3().crossVectors(band, e1);
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2, v = new THREE.Vector3();
  const tints = [[1, 0.94, 0.86], [0.85, 0.9, 1], [1, 0.84, 0.7], [1, 1, 1]];
  for (let i = 0; i < N; i++) {
    const inBand = i < 6500;
    if (inBand) { const a = Math.random() * Math.PI * 2; v.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(band, gauss() * 0.14); } else v.set(gauss(), gauss(), gauss());
    v.normalize().multiplyScalar(12000); pos.set([v.x, v.y, v.z], i * 3);
    const t = tints[(Math.random() * 4) | 0], b = inBand ? 0.45 + Math.random() * 0.55 : 0.7 + Math.random() * 0.9; col.set([t[0] * b, t[1] * b, t[2] * b], i * 3);
    size[i] = (inBand ? 1.1 : 1.4) + Math.pow(Math.random(), inBand ? 10 : 6) * 3.5;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPR: { value: renderer.getPixelRatio() } },
    vertexShader: 'attribute vec3 aColor; attribute float aSize; uniform float uPR; varying vec3 vC; void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uPR; }',
    fragmentShader: 'varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * pow(a, 1.6), 1.0); }' }));
  stars.frustumCulled = false; stars.renderOrder = -10; scene.add(stars);
  scene.userData.stars = stars;
}

// ------------------------------------------------------------ bodies
const BODIES = {}; // key → { obj, mesh, radius, view, label, name }
function addBody(key, name, obj, mesh, radius, view, extra = {}) { BODIES[key] = { key, name, obj, mesh, radius, view, ...extra }; mesh.userData.pick = { type: 'body', key }; scene.add(obj); return BODIES[key]; }

// Sun
{
  const g = new THREE.Group();
  const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, toneMapped: false, vertexShader: VS,
    fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP; ${NOISE}
      void main(){ vec3 V = normalize(cameraPosition - vW); float mu = max(dot(normalize(vN), V), 0.0);
        vec3 p = normalize(vOP); float n = fbm(p * 4.0 + vec3(uTime * 0.04)); float g = fbm(p * 14.0 - vec3(uTime * 0.07)); float cells = vnoise(p * 60.0 + uTime * 0.2);
        vec3 c = mix(vec3(1.0, 0.42, 0.06), vec3(1.0, 0.86, 0.52), n * 0.65 + g * 0.35); c *= 0.85 + 0.25 * cells;
        c *= 0.45 + 0.7 * pow(mu, 0.5); gl_FragColor = vec4(c * 2.4, 1.0); }`,
  }));
  g.add(sun, sprite(TX_GLOW, 70, 0xffd9a0, 0.9), sprite(TX_GLOW, 190, 0xff9a50, 0.28));
  addBody('sun', 'The Sun', g, sun, 8, 34);
  scene.userData.sunMat = sun.material;
}

// Earth (+ clouds + atmosphere), Moon, Kepler
const A_EARTH = 0.55, R_EARTH_ORBIT = 58;
const earthPos = polar(R_EARTH_ORBIT, A_EARTH);
const toSunFromEarth = earthPos.clone().negate().normalize();
{
  const g = new THREE.Group(); g.position.copy(earthPos);
  const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(23.4); g.add(tilt);
  const R = 2.4;
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), new THREE.ShaderMaterial({
    uniforms: { day: { value: T.day }, night: { value: T.night }, spec: { value: T.spec } }, vertexShader: VS,
    fragmentShader: `uniform sampler2D day, night, spec; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP;
      void main(){ vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(-vW); float ndl = dot(N, L), lit = smoothstep(-0.08, 0.35, ndl);
        vec3 col = texture2D(day, vUv).rgb * (max(ndl, 0.0) * 1.7 + 0.012);
        col += vec3(1.0, 0.9, 0.75) * pow(max(dot(N, normalize(L + V)), 0.0), 70.0) * texture2D(spec, vUv).r * 0.9 * step(0.0, ndl);
        vec3 n = texture2D(night, vUv).rgb; float lum = max(n.r, max(n.g, n.b)); col += vec3(1.0, 0.68, 0.36) * pow(smoothstep(0.12, 0.95, lum), 2.0) * 2.0 * (1.0 - lit);
        col += vec3(0.28, 0.55, 1.0) * pow(1.0 - max(dot(N, V), 0.0), 2.6) * smoothstep(-0.2, 0.3, ndl) * 0.6;
        gl_FragColor = vec4(col, 1.0); ${OUT} }`,
  }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 128, 96), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { map: { value: T.clouds } }, vertexShader: VS,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vT; varying vec3 vB; varying vec3 vOP;
      void main(){ vec4 c = texture2D(map, vUv); float ndl = dot(normalize(vN), normalize(-vW)); gl_FragColor = vec4(vec3(1.0, 0.98, 0.96) * (max(ndl, 0.0) * 1.5 + 0.01), c.r * c.a * smoothstep(-0.15, 0.12, ndl) * 0.9); ${OUT} }`,
  }));
  tilt.add(body, clouds);
  g.add(atmosphereMesh(g.position, R, 1.09, 0.03, 1.35, [0.28, 0.56, 1.0], [1.0, 0.52, 0.22]));
  addBody('earth', 'Earth', g, body, R, 11, { spin: body, clouds });
}
{
  // the Moon: past Earth, so its near side (all the landing sites) faces Earth and is sunlit
  const side = new THREE.Vector3(0, 1, 0).cross(toSunFromEarth).normalize();
  const off = side.multiplyScalar(7.5 * 0.77).addScaledVector(toSunFromEarth, -7.5 * 0.64).add(new THREE.Vector3(0, 0.8, 0));
  const g = new THREE.Group(); g.position.copy(earthPos).add(off);
  const R = 1.25;
  const mat = rockyMaterial({ map: T.moon, bump: T.moonBump, crater: 0.65, craterScale: 22, bumpK: 3.0, bumpTexel: 1 / 2048, gamma: 1.45 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 256, 160), mat);
  // turn longitude 0 (centre of the near side) toward Earth
  const toEarth = earthPos.clone().sub(g.position).normalize();
  const near = latLon(0, 0, -180); // local direction of lon 0
  body.rotation.y = Math.atan2(toEarth.x, toEarth.z) - Math.atan2(near.x, near.z);
  g.add(body);
  addBody('moon', 'The Moon', g, body, R, 6, { lon0: -180 });
  // its orbit around Earth, in the plane that holds it
  const u = off.clone().normalize(), w = new THREE.Vector3(0, 1, 0).cross(new THREE.Vector3(off.x, 0, off.z)).normalize(), rr = off.length();
  scene.add(pathLine((a) => earthPos.clone().addScaledVector(u, Math.cos(a) * rr).addScaledVector(w, Math.sin(a) * rr), 0.24, 0x8f9cc0, 180));
}

// Mars
const marsPos = polar(84, 1.25, 0);
{
  const g = new THREE.Group(); g.position.copy(marsPos);
  const R = 1.7;
  // Mars: few craters are visible at this scale, and a thin, dusty atmosphere
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 200, 140), rockyMaterial({ map: T.mars, bump: T.marsBump, crater: 0.2, craterScale: 18, bumpK: 1.6, tint: [1, 0.96, 0.92] }));
  g.add(body, atmosphereMesh(g.position, R, 1.05, 0.016, 0.38, [0.9, 0.52, 0.32], [0.8, 0.45, 0.3]));
  addBody('mars', 'Mars', g, body, R, 7.5, { lon0: 0 });
}

// Eros + NEAR, asteroid belt, Ceres + Dawn
const erosPos = polar(70, 0.95, 1.5);
{
  const g = new THREE.Group(); g.position.copy(erosPos);
  const geo = new THREE.SphereGeometry(1, 96, 64); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 3.1) * 0.08 + Math.sin(v.y * 5.3 + v.z * 2.1) * 0.06; v.multiplyScalar(1 + n); v.x *= 1.0; v.y *= 0.42; v.z *= 0.46; v.x -= Math.sign(v.x) * 0.0; p.setXYZ(i, v.x, v.y - 0.08 * Math.cos(v.x * 2.4), v.z); }
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, rockyMaterial({ color: 0x9a8a72, crater: 1, craterScale: 9 }));
  body.scale.setScalar(0.9);
  g.add(body);
  addBody('eros', '433 Eros', g, body, 0.9, 3.4, { spin: body });
  // a near-Earth asteroid: an eccentric, slightly tilted orbit that crosses Mars's (fitted through Eros)
  const A = 77, E = 0.169, W = -0.2, node = 0.95 - Math.PI / 2, k = 1.5 / 70;
  scene.add(pathLine((t) => { const r = (A * (1 - E * E)) / (1 + E * Math.cos(t - W)); return polar(r, t, r * k * Math.sin(t - node)); }, 0.13));
}
const beltGroup = new THREE.Group(); scene.add(beltGroup);
{
  const geo = new THREE.IcosahedronGeometry(1, 4); const p = geo.attributes.position, v = new THREE.Vector3();
  const bumpy = (x, y, z) => Math.sin(x * 2.1 + 1.3) * 0.16 + Math.sin(y * 3.3 + z * 1.7) * 0.11 + Math.sin(z * 5.1 + x * 2.9) * 0.06 + Math.sin(x * 9.0 + y * 7.0) * 0.025;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); v.multiplyScalar(1 + bumpy(v.x, v.y, v.z)); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const N = 2600, inst = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a544d, roughness: 0.95, metalness: 0, transparent: true }), N);
  beltGroup.userData.mat = inst.material;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 104 + (Math.random() + Math.random() - 1) * 9, y = (Math.random() + Math.random() - 1) * 2.4;
    e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
    const k = 0.04 + Math.pow(Math.random(), 6) * 0.2; s.set(k, k * (0.6 + Math.random() * 0.5), k * (0.7 + Math.random() * 0.4));
    m.compose(polar(r, a, y), q, s); inst.setMatrixAt(i, m);
  }
  beltGroup.add(inst);
}
const ceresPos = polar(104, -0.35, 0.4);
{
  const g = new THREE.Group(); g.position.copy(ceresPos);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.15, 128, 96), rockyMaterial({ color: 0x8a8580, crater: 1, craterScale: 12 }));
  g.add(body);
  addBody('ceres', 'Ceres', g, body, 1.15, 5, { spin: body });
  scene.add(pathLine((t) => polar(104, t, 0.4 * Math.cos(t + 0.35)), 0.11));
}

// Jupiter, Saturn
const jupPos = polar(150, 2.2, 0), satPos = polar(200, 3.0, 0);
{
  const g = new THREE.Group(); g.position.copy(jupPos);
  const body = new THREE.Mesh(new THREE.SphereGeometry(6.5, 128, 96), new THREE.MeshStandardMaterial({ map: T.jupiter, roughness: 1, metalness: 0 }));
  body.scale.y = 0.935; g.add(body);
  addBody('jupiter', 'Jupiter', g, body, 6.5, 26, { spin: body });
}
{
  const g = new THREE.Group(); g.position.copy(satPos);
  const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(26.7); tilt.rotation.x = 0.25; g.add(tilt);
  const body = new THREE.Mesh(new THREE.SphereGeometry(5.4, 128, 96), new THREE.MeshStandardMaterial({ map: T.saturn, roughness: 1, metalness: 0 }));
  body.scale.y = 0.9; tilt.add(body);
  const rg = new THREE.RingGeometry(6.6, 12.5, 256, 1);
  const ring = new THREE.Mesh(rg, new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, uniforms: { col: { value: T.ringCol }, pat: { value: T.ringPat }, uC: { value: g.position } },
    vertexShader: 'varying vec3 vW; varying float vR; void main(){ vR = (length(position.xy) - 6.6) / 5.9; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D col, pat; uniform vec3 uC; varying vec3 vW; varying float vR;
      void main(){ vec3 c = texture2D(col, vec2(vR, 0.5)).rgb; float a = texture2D(pat, vec2(vR, 0.5)).r;
        // Saturn's shadow on the rings
        vec3 L = normalize(-vW); vec3 oc = vW - uC; float b = dot(oc, L); float d2 = dot(oc, oc) - b * b; float sh = (b < 0.0 && d2 < 5.4 * 5.4) ? 0.15 : 1.0;
        gl_FragColor = vec4(c * 1.15 * sh, a * 0.92); ${OUT} }`,
  }));
  ring.rotation.x = -Math.PI / 2; tilt.add(ring);
  addBody('saturn', 'Saturn', g, body, 5.4, 34, { spin: body });
}
// Mercury, Venus (inner), Uranus, Neptune (outer: Voyager 2 flew past both)
const mercPos = polar(30, 4.2, 0), venusPos = polar(44, 5.35, 0), uraPos = polar(235, 3.75, 0), nepPos = polar(262, 4.35, 0);
{
  const g = new THREE.Group(); g.position.copy(mercPos);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 96, 64), rockyMaterial({ color: 0x8e8882, crater: 1, craterScale: 14 }));
  g.add(body); addBody('mercury', 'Mercury', g, body, 0.9, 3.6, { spin: body });
}
{
  const g = new THREE.Group(); g.position.copy(venusPos);
  const body = new THREE.Mesh(new THREE.SphereGeometry(2.2, 128, 96), rockyMaterial({ color: 0xe6cf9c, crater: 0, tint: [1, 0.97, 0.9] }));
  g.add(body, atmosphereMesh(g.position, 2.2, 1.07, 0.03, 0.9, [1.0, 0.86, 0.6], [1.0, 0.68, 0.38]));
  addBody('venus', 'Venus', g, body, 2.2, 9, { spin: body });
}
{
  const g = new THREE.Group(); g.position.copy(uraPos);
  const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(97.8); g.add(tilt); // Uranus rolls on its side
  const body = new THREE.Mesh(new THREE.SphereGeometry(3.6, 96, 64), new THREE.MeshStandardMaterial({ color: 0xa9dde2, roughness: 1, metalness: 0 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.0, 5.9, 128), new THREE.MeshBasicMaterial({ color: 0xa0aab4, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; tilt.add(body, ring);
  g.add(atmosphereMesh(g.position, 3.6, 1.05, 0.03, 0.6, [0.55, 0.85, 0.95], [0.6, 0.8, 0.9]));
  addBody('uranus', 'Uranus', g, body, 3.6, 16, { spin: body });
}
{
  const g = new THREE.Group(); g.position.copy(nepPos);
  const body = new THREE.Mesh(new THREE.SphereGeometry(3.5, 96, 64), new THREE.MeshStandardMaterial({ map: T.neptune, roughness: 1, metalness: 0 }));
  g.add(body, atmosphereMesh(g.position, 3.5, 1.05, 0.03, 0.6, [0.35, 0.5, 1.0], [0.4, 0.5, 0.9]));
  addBody('neptune', 'Neptune', g, body, 3.5, 16, { spin: body });
}
scene.add(orbitLine(30, 0x8f9cc0, 0.14), orbitLine(44, 0x8f9cc0, 0.15), orbitLine(R_EARTH_ORBIT), orbitLine(84), orbitLine(150, 0x8f9cc0, 0.1), orbitLine(200, 0x8f9cc0, 0.08), orbitLine(235, 0x8f9cc0, 0.07), orbitLine(262, 0x8f9cc0, 0.07));

// heliosphere edge
{
  const helio = new THREE.Mesh(new THREE.SphereGeometry(270, 96, 64), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vW; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 3.0); gl_FragColor = vec4(vec3(0.35, 0.5, 1.0) * f * 0.07, 1.0); }',
  }));
  scene.add(helio);
  scene.userData.helio = new THREE.Object3D(); scene.userData.helio.position.set(0, 120, -235); scene.add(scene.userData.helio);
}

// ------------------------------------------------------------ deep-space hardware in the scene
const SPACE = {}; // anchor key → { obj, size, view, pickProxy }
function addSpace(key, pos, size, view, modelKey, extra = {}) { // extra.host: centre of the world it belongs to
  const obj = new THREE.Group(); obj.position.copy(pos); scene.add(obj);
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(size * 0.9, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  proxy.userData.pick = { type: 'space', key }; obj.add(proxy);
  const glow = sprite(TX_DOT, size * 2.2, 0xffe2b0, 0.55); obj.add(glow);
  SPACE[key] = { key, obj, size, view, glow, ...extra };
  loadModel(modelKey).then((m) => { const f = fitObject(m, size, false); f.rotation.set(Math.random(), Math.random() * 6, 0.3); obj.add(f); SPACE[key].model = f; }).catch((e) => console.warn('model', modelKey, e));
  return SPACE[key];
}
// Kepler trails Earth along its orbit
addSpace('kepler', polar(R_EARTH_ORBIT, A_EARTH - 0.13, 0), 1.6, 7, 'kepler', { host: earthPos });
// NEAR resting on Eros
{
  const s = addSpace('near', erosPos.clone().add(new THREE.Vector3(0.25, 0.42, 0)), 0.55, 3.4, 'near', { host: erosPos });
  s.glow.visible = false;
}
// Dawn orbiting Ceres
const DAWN_ORBIT = { center: ceresPos, r: 2.6, speed: 0.05, incl: 0.45 };
const dawnAt = (a, o = DAWN_ORBIT) => new THREE.Vector3(o.center.x + Math.cos(a) * o.r, o.center.y + Math.sin(a) * o.r * Math.sin(o.incl), o.center.z + Math.sin(a) * o.r * Math.cos(o.incl));
addSpace('dawn', dawnAt(0), 1.1, 5.5, 'dawn', { orbit: DAWN_ORBIT, host: ceresPos });
scene.add(pathLine((a) => dawnAt(a), 0.2, 0xf3d09a, 120));
// Galileo above Jupiter's clouds, with the probe's entry path
{
  const s = addSpace('galileo', jupPos.clone().add(new THREE.Vector3(5, 6.5, 7)), 2.2, 12, 'galileo', { host: jupPos });
  const path = new THREE.CatmullRomCurve3([s.obj.position.clone(), jupPos.clone().add(new THREE.Vector3(3.2, 3.5, 4.2)), jupPos.clone().add(new THREE.Vector3(2.2, 2.6, 3.4))]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xf3d09a, transparent: true, opacity: 0.55, toneMapped: false })));
}
// Pioneers and Voyagers heading out of the solar system
function trajectory(points, color) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, uniforms: { c: { value: new THREE.Color(color) } },
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    // brightens toward the probe, then fades out just before it so a close-up never looks down the tube
    fragmentShader: 'uniform vec3 c; varying float vU; void main(){ gl_FragColor = vec4(c * (0.12 + 0.75 * vU) * (1.0 - smoothstep(0.93, 0.99, vU)) * 0.8, 1.0); }' });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 500, 0.1, 6), mat));
  return curve;
}
const E0 = polar(R_EARTH_ORBIT, A_EARTH);
const probes = [
  { key: 'pioneer10', model: 'pioneer', pts: [E0, jupPos.clone().add(new THREE.Vector3(-9, 2, 6)), polar(240, 1.6, 30), polar(330, 1.2, 40)], color: 0xf3d09a },
  { key: 'pioneer11', model: 'pioneer', pts: [E0, jupPos.clone().add(new THREE.Vector3(8, -2, -7)), satPos.clone().add(new THREE.Vector3(-8, 3, 9)), polar(260, 3.6, 90), polar(320, 3.9, 120)], color: 0xf3d09a },
  { key: 'voyager1', model: 'voyager', pts: [E0, jupPos.clone().add(new THREE.Vector3(10, 3, -4)), satPos.clone().add(new THREE.Vector3(10, 4, -6)), polar(250, 2.6, 130), polar(330, 2.4, 200)], color: 0x8fa8ff },
  { key: 'voyager2', model: 'voyager', pts: [E0, jupPos.clone().add(new THREE.Vector3(-7, -3, -8)), satPos.clone().add(new THREE.Vector3(-9, -4, -7)), uraPos.clone().add(new THREE.Vector3(-6, -3, 6)), nepPos.clone().add(new THREE.Vector3(-4, -5, 6)), polar(300, 4.62, -120), polar(345, 4.78, -175)], color: 0x8fa8ff },
];
const TRAJ = {}; // anchor key → flight path (used by the launch films)
probes.forEach((p) => { const c = trajectory(p.pts, p.color); TRAJ[p.key] = c; addSpace(p.key, c.getPoint(1), 4.5, 14, p.model); });

// ISRO satellites: still circling the Moon and Mars, and Aditya-L1 at the Sun–Earth L1 point
{
  const mc = BODIES.moon.obj.position.clone(), mR = BODIES.moon.radius;
  const polarOrbit = (center, r, phase, tilt) => { const u = new THREE.Vector3(Math.cos(tilt), 0, Math.sin(tilt)); return (a) => center.clone().addScaledVector(u, Math.cos(a + phase) * r).add(new THREE.Vector3(0, Math.sin(a + phase) * r, 0)); };
  const ch1At = polarOrbit(mc, mR * 1.36, 0, 0.4), ch2At = polarOrbit(mc, mR * 1.18, 1.6, 2.0);
  addSpace('ch1', ch1At(0), 0.3, 2.2, 'ch1', { host: mc, hostBody: 'moon', move: (t) => ch1At(t * 0.11) });
  addSpace('ch2', ch2At(0), 0.34, 2.2, 'ch2orb', { host: mc, hostBody: 'moon', move: (t) => ch2At(t * 0.16) });
  scene.add(pathLine(ch1At, 0.3, 0xf3d09a, 120), pathLine(ch2At, 0.3, 0xf3d09a, 120));
  // Mangalyaan: a long ellipse, solved with Kepler's equation so it races through periapsis
  const mars = marsPos.clone(), R = BODIES.mars.radius, peri = R * 1.35, apo = R * 5.6, a = (peri + apo) / 2, e = (apo - peri) / (apo + peri), b = a * Math.sqrt(1 - e * e);
  const u = new THREE.Vector3(1, 0, 0.4).normalize(), w = new THREE.Vector3(0, Math.sin(0.5), Math.cos(0.5));
  const momAt = (E) => mars.clone().addScaledVector(u, a * (Math.cos(E) - e)).addScaledVector(w, b * Math.sin(E));
  const momMove = (t) => { const M = (t * 0.14) % (Math.PI * 2); let E = M; for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return momAt(E); };
  addSpace('mom', momMove(0), 0.45, 3.2, 'mom', { host: mars, hostBody: 'mars', move: momMove });
  scene.add(pathLine(momAt, 0.3, 0xf3d09a, 180));
  // Aditya-L1: a halo orbit around L1, sunward of Earth
  const toSun = earthPos.clone().negate().normalize(), L1 = earthPos.clone().addScaledVector(toSun, 5.5), side = new THREE.Vector3(0, 1, 0).cross(toSun).normalize();
  const adAt = (t) => L1.clone().addScaledVector(side, Math.cos(t) * 1.1).add(new THREE.Vector3(0, Math.sin(t) * 0.7, 0));
  addSpace('aditya', adAt(0), 0.5, 3.4, 'aditya', { host: earthPos, move: (t) => adAt(t * 0.07) });
  scene.add(pathLine(adAt, 0.3, 0xf3d09a, 120));
}

// ------------------------------------------------------------ sites (markers on the Moon and Mars, anchors in space)
const SITES = {}; const SITE_LIST = [];
DATA.sites.forEach((s) => {
  const site = { ...s };
  if (s.body === 'moon' || s.body === 'mars') {
    const b = BODIES[s.body];
    site.local = latLon(s.lat, s.lon, b.lon0);
    site.anchor = new THREE.Object3D(); site.anchor.position.copy(site.local).multiplyScalar(b.radius * 1.003);
    b.mesh.add(site.anchor);
    const sky = s.group === 'skylab';
    const dot = sprite(TX_DOT, b.radius * (sky ? 0.05 : 0.034), sky ? 0x7ff0dc : s.body === 'moon' ? 0xfff2d8 : 0xffe0c8, 0.9); dot.position.copy(site.anchor.position); b.mesh.add(dot); site.dot = dot; site.dotK = sky ? 1.5 : 1;
  } else {
    site.anchorKey = s.anchor; site.anchor = SPACE[s.anchor].obj;
  }
  SITES[s.id] = site; SITE_LIST.push(site);
});
const ITEM_SITE = {}; SITE_LIST.forEach((s) => s.items.forEach((i) => { ITEM_SITE[i] = s.id; }));

// ------------------------------------------------------------ labels (HTML, positioned every frame)
const labelsEl = $('labels'), LABELS = [];
function addLabel({ name, sub, cls, color, anchor, onClick, kind, ref, count }) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'lbl ' + cls;
  if (color) b.style.setProperty('--c', color);
  b.innerHTML = `<span class="lbl__dot"></span><span class="lbl__txt"><span class="lbl__name">${esc(name)}${count > 1 ? `<span class="lbl__count">×${count}</span>` : ''}</span>${sub ? `<span class="lbl__sub">${esc(sub)}</span>` : ''}</span>`;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  labelsEl.appendChild(b);
  const L = { el: b, anchor, kind, ref, count: count || 0, on: true, side: 'r', noDot: false, w: 0, h: 0 }; LABELS.push(L); return L;
}
// sizes are measured lazily; re-measure once the web fonts arrive
const remeasure = () => LABELS.forEach((L) => { L.w = 0; });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
const GROUP_COLOR = { moon: '#d9dce2', mars: '#e2733f', space: '#8fa8ff' };
Object.values(BODIES).forEach((b) => { if (b.key !== 'sun' || true) b.label = addLabel({ name: b.name, cls: 'is-body', anchor: b.obj, kind: 'body', ref: b.key, onClick: () => focusBody(b.key) }); });
addLabel({ name: 'Asteroid belt', cls: 'is-body', anchor: (() => { const o = new THREE.Object3D(); o.position.copy(polar(104, 0.6, 3)); scene.add(o); return o; })(), kind: 'body', ref: 'belt', onClick: () => focusBody('ceres') });
addLabel({ name: 'Edge of the heliosphere', cls: 'is-body', anchor: scene.userData.helio, kind: 'body', ref: 'helio', onClick: () => setView('beyond') });
SITE_LIST.forEach((s) => {
  s.label = addLabel({ name: s.body === 'space' ? s.name : s.name, sub: s.sub, cls: 'is-site' + (s.group === 'skylab' ? ' is-skylab' : ''), color: s.group === 'skylab' ? SKY_COLOR : GROUP_COLOR[s.body], anchor: s.anchor, kind: s.body === 'space' ? 'space' : 'site', ref: s.id, count: s.items.length, onClick: () => openSite(s.id) });
});

// ------------------------------------------------------------ state + camera flights
const state = { focus: null, view: 'overview', site: null, item: null };
let tween = null;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function worldPos(o, out = new THREE.Vector3()) { return o.getWorldPosition(out); }
function flyTo(toPos, toTarget, dur = 2.0, rot = null) {
  const fromPos = camera.position.clone(), fromTarget = controls.target.clone();
  const dist = fromPos.distanceTo(toPos);
  tween = { t: 0, dur: reduced ? 0.01 : dur, fromPos, fromTarget, toPos, toTarget, arc: Math.min(dist * 0.18, 120), rot };
  controls.enabled = false;
}
function setLimits(minD, maxD) { controls.minDistance = minD; controls.maxDistance = maxD; }
function crumb(t) { $('crumb-v').textContent = t; }
function setViewButton(v) { document.querySelectorAll('.views button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === v)); }

const OVERVIEW = { pos: new THREE.Vector3(70, 135, 215), target: new THREE.Vector3(-8, -6, -30) };
const BEYOND = { pos: new THREE.Vector3(150, 430, 560), target: new THREE.Vector3(-70, 30, -60) };
function setView(v) {
  state.view = v; setViewButton(v);
  if (v === 'overview') { closeDetail(); state.focus = null; setLimits(20, 1600); flyTo(OVERVIEW.pos.clone(), OVERVIEW.target.clone(), 2.2); crumb('The Solar System'); if (started) narrate('The Solar System. Click a planet or a marker.', { mode: 'replace' }); }
  else if (v === 'beyond') { closeDetail(); state.focus = null; setLimits(20, 2200); flyTo(BEYOND.pos.clone(), BEYOND.target.clone(), 2.4); crumb('Beyond: the deep-space probes'); narrate('Beyond: the deep-space probes, from Ceres to interstellar space.', { mode: 'replace' }); }
  else if (v === 'skylab') openSite('skylab-moon');
  else focusBody(v);
}
function focusBody(key) {
  const b = BODIES[key]; if (!b) return;
  closeDetail();
  state.focus = key; state.view = key === 'moon' || key === 'mars' ? key : 'overview'; setViewButton(state.view === 'overview' ? '' : state.view);
  const c = worldPos(b.obj);
  let dir;
  if (key === 'moon') dir = worldNormal(latLon(2, -5, b.lon0), b).add(new THREE.Vector3(0, 0.25, 0)).normalize();
  else if (key === 'sun') dir = camera.position.clone().sub(c).normalize();
  else { const toSun = c.clone().negate().normalize(); dir = camera.position.clone().sub(c).normalize().lerp(toSun, 0.55).add(new THREE.Vector3(0, 0.25, 0)).normalize(); }
  setLimits(b.radius * 1.35, b.radius * 40);
  flyTo(c.clone().addScaledVector(dir, b.view), c, 2.0);
  const n = SITE_LIST.filter((s) => s.body === key).length;
  crumb(b.name + (n ? ` · ${n} sites` : ''));
  narrate(b.name + (n ? `. ${n} sites. Click one to land beside it.` : '.'), { mode: 'replace' }); sfx.whoosh(1.6);
}
function worldNormal(local, b) { return local.clone().applyQuaternion(b.mesh.getWorldQuaternion(new THREE.Quaternion())).normalize(); }

// The index and detail panels cover part of the screen. Rather than aiming the camera off to one
// side, shift the projection centre so the camera's target sits in the middle of the free area
// (orbiting still pivots on the target itself).
const shift = { x: 0, y: 0, tx: 0, ty: 0 };
function updateShift() {
  const W = innerWidth, H = innerHeight, open = detail.classList.contains('is-open');
  if (W > 820) {
    const tucked = document.body.classList.contains('is-cinema') || (document.body.classList.contains('is-surface') && !$('index').classList.contains('is-open'));
    const left = tucked ? 0 : $('index').getBoundingClientRect().right;
    const right = open ? W - (parseFloat(getComputedStyle(detail).right) || 0) - detail.offsetWidth : W;
    shift.tx = (left + right) / 2 - W / 2; shift.ty = 0;
  } else { // phones: the detail panel is a bottom sheet under a 70px top bar
    shift.tx = 0; shift.ty = open ? (70 + H - 66 - detail.offsetHeight) / 2 - H / 2 : 0;
  }
  if (reduced) { shift.x = shift.tx; shift.y = shift.ty; }
  // screen rectangles labels must keep clear of (final layout, ignoring the slide-in transform)
  obstacles.length = 0;
  if (W > 820) { const r = $('index').getBoundingClientRect(); obstacles.push([r.left, r.top, r.right, r.bottom]); }
  if (open) { const right = W - (parseFloat(getComputedStyle(detail).right) || 0); obstacles.push([right - detail.offsetWidth, detail.offsetTop, right, detail.offsetTop + detail.offsetHeight]); }
  const v = document.querySelector('.views').getBoundingClientRect(); obstacles.push([v.left, v.top, v.right, v.bottom]);
}
const obstacles = [];

function openSite(siteId, itemId) {
  const s = SITES[siteId]; if (!s) return;
  const onGround = s.body === 'moon' || s.body === 'mars';
  if (surface.active) { // already standing somewhere
    if (!onGround) { leaveSurface(() => openSite(siteId, itemId)); return; }
    if (surface.world && surface.world.site.id === siteId) { surface.select(itemId && s.items.includes(itemId) ? itemId : s.items[0]); return; }
    landOn(siteId, itemId); return;
  }
  state.site = siteId; state.item = itemId && s.items.includes(itemId) ? itemId : s.items[0];
  if (onGround) {
    const b = BODIES[s.body]; const c = worldPos(b.obj);
    let rot = null;
    if (s.body === 'mars') { // turn the planet so the site faces the sunlit side
      const toSun = c.clone().negate().normalize();
      const want = toSun.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.6);
      const n = worldNormal(s.local, b);
      let d = Math.atan2(want.x, want.z) - Math.atan2(n.x, n.z);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      rot = { obj: b.mesh, from: b.mesh.rotation.y, to: b.mesh.rotation.y + d };
    }
    // where the site will be once the planet has turned
    const ry = rot ? rot.to - rot.from : 0;
    const n = worldNormal(s.local, b).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    const surf = c.clone().addScaledVector(n, b.radius);
    const north = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize();
    const camPos = surf.clone().addScaledVector(n, b.radius * 1.15).addScaledVector(north.lengthSq() > 0 ? north : new THREE.Vector3(0, 0, 1), -b.radius * 0.35);
    state.focus = s.body; setViewButton(s.body);
    setLimits(b.radius * 1.12, b.radius * 40);
    flyTo(camPos, surf, 2.1, rot);
    // swoop in over the site, then land on the surface
    const want = state.item; tween.done = () => landOn(siteId, want);
    detail.classList.remove('is-open'); detail.setAttribute('aria-hidden', 'true'); updateShift();
    crumb(`${s.name} · ${s.sub}`);
    history.replaceState(null, '', '?a=' + encodeURIComponent(state.item));
    document.querySelectorAll('.site').forEach((el) => el.classList.toggle('is-active', el.dataset.site === siteId));
    return;
  } else {
    const sp = SPACE[s.anchorKey]; const p = worldPos(sp.obj);
    const toSun = p.clone().negate().normalize();
    const dir = sp.host ? p.clone().sub(sp.host).normalize().lerp(toSun, 0.35).add(new THREE.Vector3(0, 0.35, 0)).normalize()
      : toSun.clone().lerp(new THREE.Vector3(0, 1, 0), 0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.9).normalize();
    const camPos = p.clone().addScaledVector(dir, sp.view);
    state.focus = 'space:' + s.anchorKey; setViewButton('beyond');
    setLimits(sp.size * 1.5, sp.view * 30);
    flyTo(camPos, p.clone(), 2.3);
  }
  crumb(`${s.name} · ${s.sub}`);
  renderDetail();
  history.replaceState(null, '', '?a=' + encodeURIComponent(state.item));
  document.querySelectorAll('.site').forEach((el) => el.classList.toggle('is-active', el.dataset.site === siteId));
}

// ------------------------------------------------------------ index panel
{
  const groups = [['skylab', 'Skylabs · repair bases', SKY_COLOR], ['moon', 'The Moon', '#d9dce2'], ['mars', 'Mars', '#e2733f'], ['space', 'Beyond', '#8fa8ff']];
  const host = $('index-groups');
  groups.forEach(([key, title, color]) => {
    const sites = SITE_LIST.filter((s) => (s.group || s.body) === key);
    const items = sites.reduce((n, s) => n + s.items.length, 0);
    const g = document.createElement('section'); g.className = 'grp' + (key === 'skylab' ? ' grp--skylab' : '');
    g.innerHTML = `<button type="button" class="grp__head" style="--c:${color}"><span class="grp__name"><i></i>${title}</span><span class="grp__count">${key === 'skylab' ? `${sites.length} bases` : `${items} pieces`}</span></button>`;
    g.querySelector('.grp__head').addEventListener('click', () => { if (busyRepair()) return; if (key === 'skylab') { openSite('skylab-moon'); return; } const go = () => (key === 'space' ? setView('beyond') : focusBody(key)); surface.active ? leaveSurface(go) : go(); });
    sites.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'site'; b.dataset.site = s.id;
      b.innerHTML = `<span><span class="site__name">${esc(s.name)}</span><span class="site__sub">${esc(s.sub)}</span></span><span class="site__n">${s.items.length}</span>`;
      b.addEventListener('click', () => { if (busyRepair()) return; openSite(s.id); if (innerWidth <= 820) toggleIndex(false); });
      g.appendChild(b);
    });
    host.appendChild(g);
  });
}
function toggleIndex(force) {
  const el = $('index'), open = force === undefined ? !el.classList.contains('is-open') : force;
  el.classList.toggle('is-open', open); $('toggle-index').setAttribute('aria-expanded', open);
}
$('toggle-index').addEventListener('click', () => toggleIndex());
document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => {
  if (busyRepair()) return;
  if (b.dataset.view === 'skylab') { openSite('skylab-moon'); return; }
  surface.active ? leaveSurface(() => setView(b.dataset.view)) : setView(b.dataset.view);
}));

// ------------------------------------------------------------ detail panel + model viewer
const detail = $('detail');
function renderDetail() {
  const s = SITES[state.site], it = DATA.items[state.item]; if (!s || !it) return;
  detail.classList.add('is-open'); detail.setAttribute('aria-hidden', 'false'); updateShift();
  $('d-tabs').innerHTML = s.items.length > 1 ? s.items.map((id) => `<button type="button" role="tab" class="tab${id === state.item ? ' is-on' : ''}${statusOf(id) === 'offline' ? ' is-off' : ''}" aria-selected="${id === state.item}" data-item="${id}">${esc(DATA.items[id].base ? DATA.items[id].name : DATA.items[id].kind.replace('Lunar Module descent stage', 'Lander base').replace('Apollo Lunar Surface Experiments Package', 'Science station').replace('Laser Ranging Retroreflector', 'Laser mirror').replace('Lunar Roving Vehicle', 'Moon buggy').replace('Robotic lander', DATA.items[id].name))}</button>`).join('') : '';
  $('d-site').textContent = `${s.name} · ${s.body === 'moon' ? 'The Moon' : s.body === 'mars' ? 'Mars' : 'Deep space'}`;
  $('d-name').innerHTML = styled(it.name);
  $('d-kind').textContent = it.base ? `${it.kind} · ${s.name}` : `${it.kind} · ${it.year}`;
  renderStatus();
  $('d-lede').innerHTML = hl(it.story[0]);
  $('d-facts').innerHTML = it.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const ms = MISSIONS[MISSION_OF[state.item]], row = ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
  $('d-launch').innerHTML = ms ? [['Launched', `${ms.launch.date} · ${ms.launch.time}`], ['Rocket', ms.launch.vehicle], ['From', ms.launch.site], ['By', ms.agency]].map(row).join('') : '';
  const chs = storyChapters(state.item);
  $('d-read-n').textContent = it.base ? `${chs.length} chapters · the science behind it` : `${chs.length} chapters · from launch to today`;
  $('d-chapters').innerHTML = chs.filter((c) => c.id !== 'cover').map((c, i) => `<li><button type="button" data-ch="${c.id}"><span class="ch__n">${String(i + 1).padStart(2, '0')}</span><span class="ch__t">${esc(c.label)}</span><span class="ch__x">${esc(c.teaser)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></li>`).join('');
  renderActions();
  $('d-where').textContent = s.lat !== undefined ? `${Math.abs(s.lat).toFixed(2)}° ${s.lat >= 0 ? 'N' : 'S'}, ${(((s.lon + 540) % 360) - 180) >= 0 ? (((s.lon + 540) % 360) - 180).toFixed(2) + '° E' : Math.abs(((s.lon + 540) % 360) - 180).toFixed(2) + '° W'} · ${s.group === 'skylab' ? 'proposed base site (approximate)' : 'real landing coordinates'}` : s.sub;
  if (!surface.active) showInViewer(it, s);
  $('d-listen').hidden = !hasVoice();
  if (state.item !== spokenItem) { spokenItem = state.item; narrate(itemScript(state.item, false)); }
}
let spokenItem = null;
function itemScript(id, full) { // what the narrator says about a machine or a base module
  const it = DATA.items[id], st = statusOf(id), p = REPAIR[id], b = baseOf(id), out = [`${it.name}.`];
  if (!it.base) out.push(`${it.kind}, ${it.year}.`);
  if (st === 'offline') out.push(`Offline: ${p.fault}.`);
  else if (st === 'operational') out.push(`Operational again, repaired at ${b ? b.name : 'a Skylab'}.`);
  else if (st === 'dimmed') out.push('Still working, but dimmed by dust.');
  else if (st === 'cleaned') out.push('Working, and cleaned in place.');
  else if (st === 'heritage') out.push('A protected heritage site.');
  else if (st === 'debris') out.push('Beyond repair. Only debris is left.');
  out.push(it.story[0]);
  if (full) {
    if (it.story[1]) out.push(it.story[1]);
    if (p && ['offline', 'dimmed', 'heritage', 'debris', 'unreachable', 'gone'].includes(st)) out.push(p.cause);
    out.push(it.facts.map(([k, v]) => `${k}: ${v}.`).join(' '));
  }
  if (st === 'offline') out.push(p.orbit ? `A servicing tug from ${b.name} can capture it. Press repair.` : surface.active ? `Press repair to call ${b.name}'s recovery hopper.` : '');
  return out.join(' ');
}
$('d-listen').addEventListener('click', () => { if (isSpeaking()) stopNarration(); else narrate(itemScript(state.item, true), { mode: 'replace' }); });
// why it stopped, and whether it can be fixed
const STATUS = { offline: ['Offline', 'bad'], operational: ['Operational', 'ok'], dimmed: ['Working, dimmed', 'warn'], cleaned: ['Cleaned', 'ok'], heritage: ['Protected heritage', 'info'],
  debris: ['Beyond repair', 'mute'], working: ['Working', 'ok'], unreachable: ['Out of reach', 'mute'], gone: ['Gone', 'mute'], base: ['Skylab module', 'sky'] };
function renderStatus() {
  const id = state.item, st = statusOf(id), p = REPAIR[id], b = baseOf(id), [label, tone] = STATUS[st] || STATUS.working, el = $('d-status');
  if (st === 'base') { el.innerHTML = `<span class="stat stat--sky"><i></i>${label}</span>`; return; }
  if (!p) { el.innerHTML = ''; return; }
  const why = st === 'operational' ? `Repaired at ${b ? b.name : 'a Skylab'}` : st === 'cleaned' ? 'Dust cleared in place' : p.fault;
  const cause = st === 'operational' ? `${p.unlock ? `${p.unlock}: now unlocked.` : ''} ${p.fault} was the problem; the fix is in the repair log.` : st === 'cleaned' ? 'The mirrors were cleaned with an electrodynamic dust shield where they stand, and should return about ten times more laser light.' : p.cause;
  const hint = st === 'offline' ? (p.orbit ? `A servicing tug from ${b.name} can capture it.` : surface.active ? `Call ${b.name}’s recovery hopper to fly it to the repair bay.` : `Land beside it to call ${b.name}’s recovery hopper.`) : '';
  el.innerHTML = `<span class="stat stat--${tone}"><i></i>${label}</span><span class="stat__why">${esc(why)}</span>
    <details class="stat__more"${(st === 'offline' || st === 'dimmed') && innerWidth > 820 ? ' open' : ''}><summary>${st === 'offline' ? 'Why it stopped' : st === 'operational' ? 'What was fixed' : 'Why'}</summary><p>${esc(cause.trim())}</p>${hint ? `<p class="stat__hint">${esc(hint)}</p>` : ''}</details>`;
}
$('d-read').addEventListener('click', () => openStory(state.item));
$('d-chapters').addEventListener('click', (e) => { const b = e.target.closest('[data-ch]'); if (b) openStory(state.item, b.dataset.ch); });
function renderActions() {
  const acts = surface.active ? surface.actionsFor(state.item) : [];
  const p = REPAIR[state.item];
  if (!surface.active && p && p.orbit && statusOf(state.item) === 'offline') acts.unshift({ id: 'repair', label: `Repair at ${baseOf(state.item).name}`, primary: true });
  if (MISSIONS[MISSION_OF[state.item]]) acts.push({ id: 'launch', label: 'Watch the launch' });
  $('d-actions').innerHTML = acts.map((a) => `<button type="button" class="act${a.primary ? ' is-primary' : ''}${a.id === 'repair' ? ' is-repair' : ''}" data-act="${a.id}"${a.id === 'wait' ? ' disabled' : ''}>${esc(a.label)}</button>`).join('');
}
$('d-actions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'wait') return;
  if (act === 'launch') { if (!busyRepair()) watchLaunch(state.item); return; }
  sfx.click();
  if (act === 'repair') { startRepair(state.item); return; }
  if (!surface.active) return; surface.action(state.item, act); renderActions();
});
function closeDetail() {
  spokenItem = null;
  detail.classList.remove('is-open'); detail.setAttribute('aria-hidden', 'true'); updateShift();
  state.site = null; state.item = null;
  history.replaceState(null, '', location.pathname);
  document.querySelectorAll('.site').forEach((el) => el.classList.remove('is-active'));
}
$('d-tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-item]'); if (!t) return; if (surface.active) { surface.select(t.dataset.item); return; } state.item = t.dataset.item; history.replaceState(null, '', '?a=' + state.item); renderDetail(); });
$('d-close').addEventListener('click', () => { if (surface.active) { detail.classList.remove('is-open'); detail.setAttribute('aria-hidden', 'true'); updateShift(); return; } const s = SITES[state.site]; closeDetail(); if (s && s.body !== 'space') focusBody(s.body); else setView('beyond'); });
function step(d) { const i = SITE_LIST.findIndex((s) => s.id === state.site); openSite(SITE_LIST[(i + d + SITE_LIST.length) % SITE_LIST.length].id); }
$('d-prev').addEventListener('click', () => step(-1)); $('d-next').addEventListener('click', () => step(1));
addEventListener('keydown', (e) => {
  if (bay.active) { if (e.key === 'Escape') bay.escape(); return; }
  if (repairing) return;
  if (story) { if (e.key === 'Escape') closeStory(); return; }
  if (cine) { if (e.key === 'Escape') endCine(true); return; }
  if (surface.active) { if (e.key === 'Escape' && !surface.escape()) leaveSurface(); return; }
  if (e.key === 'Escape') { if (state.site) $('d-close').click(); else setView('overview'); }
  if (state.site && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest('input')) step(e.key === 'ArrowRight' ? 1 : -1);
});

// viewer (its own renderer, with shadows and a patch of ground)
const vCanvas = $('viewer');
const vr = new THREE.WebGLRenderer({ canvas: vCanvas, antialias: true, alpha: true });
vr.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
vr.outputColorSpace = THREE.SRGBColorSpace; vr.toneMapping = THREE.ACESFilmicToneMapping; vr.toneMappingExposure = 1.05;
vr.shadowMap.enabled = true; vr.shadowMap.type = THREE.PCFSoftShadowMap;
const vScene = new THREE.Scene();
vScene.environment = new THREE.PMREMGenerator(vr).fromScene(new RoomEnvironment(vr), 0.04).texture;
const vCam = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
const vControls = new OrbitControls(vCam, vCanvas);
vControls.enableDamping = true; vControls.enablePan = false; vControls.autoRotate = !reduced; vControls.autoRotateSpeed = 0.9; vControls.minDistance = 2.2; vControls.maxDistance = 12;
const vSun = new THREE.DirectionalLight(0xfff3e2, 3.4); vSun.position.set(4, 5.5, 3); vSun.castShadow = true;
vSun.shadow.mapSize.set(2048, 2048); Object.assign(vSun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 20 }); vSun.shadow.bias = -0.0004; vSun.shadow.normalBias = 0.02;
vScene.add(vSun, new THREE.HemisphereLight(0xa9bbff, 0x1d140c, 0.45));
function groundTex(kind) {
  return canvasTex(1024, (g, s) => {
    const moon = kind === 'moon';
    g.fillStyle = moon ? '#8d8a84' : '#a35a33'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = moon ? `rgba(${v < 0.5 ? 40 : 230},${v < 0.5 ? 40 : 228},${v < 0.5 ? 40 : 222},.05)` : `rgba(${v < 0.5 ? 70 : 220},${v < 0.5 ? 30 : 140},${v < 0.5 ? 15 : 90},.06)`; g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 6, 2 + Math.random() * 6); }
    for (let i = 0; i < (moon ? 70 : 25); i++) {
      const x = Math.random() * s, y = Math.random() * s, r = Math.pow(Math.random(), 2.5) * (moon ? 70 : 40) + 4;
      const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
      gr.addColorStop(0, moon ? 'rgba(30,30,30,.32)' : 'rgba(60,25,12,.28)'); gr.addColorStop(0.75, 'rgba(0,0,0,.08)'); gr.addColorStop(0.92, moon ? 'rgba(235,232,225,.22)' : 'rgba(230,150,100,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
}
const fade = canvasTex(256, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2); r.addColorStop(0, '#fff'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
fade.colorSpace = THREE.NoColorSpace;
const grounds = {};
['moon', 'mars'].forEach((k) => {
  const t = groundTex(k); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  const m = new THREE.Mesh(new THREE.CircleGeometry(6, 96), new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0, alphaMap: fade, transparent: true }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.visible = false; vScene.add(m); grounds[k] = m;
  if (k === 'mars') { // a few rocks
    const rock = new THREE.IcosahedronGeometry(1, 1); const p = rock.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.7 + Math.random() * 0.5); p.setXYZ(i, v.x, v.y * 0.6, v.z); } rock.computeVertexNormals();
    const inst = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: 0x6b3b24, roughness: 1, flatShading: true }), 60);
    const mm = new THREE.Matrix4(); for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, r = 1.6 + Math.random() * 3.6, sc = 0.04 + Math.pow(Math.random(), 3) * 0.22; mm.compose(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * 6, 0)), new THREE.Vector3(sc, sc, sc)); inst.setMatrixAt(i, mm); }
    inst.castShadow = inst.receiveShadow = true; m.add(inst); inst.rotation.x = Math.PI / 2;
  }
});
let vModel = null, vToken = 0, vNeeds = false;
function showInViewer(it, site) {
  const token = ++vToken;
  $('viewer-loading').classList.add('is-on');
  const ground = site.body === 'moon' || site.body === 'mars' ? site.body : null;
  Object.entries(grounds).forEach(([k, m]) => (m.visible = k === ground));
  loadModel(it.model).then((m) => { if (token === vToken) present(m, ground); }).catch(() => { $('viewer-loading').textContent = 'Model unavailable'; });
}
function showRocketInViewer(kind) {
  ++vToken; Object.values(grounds).forEach((m) => (m.visible = false));
  const r = buildRocket(kind); present(r.g, null); return r;
}
function present(m, ground) {
  {
    if (vModel) vScene.remove(vModel);
    const hover = m.userData.hover || 0; // e.g. Ranger, shown in its final dive rather than parked on the ground
    vModel = fitObject(m, ground ? 2.6 : 2.8, !!ground);
    vModel.position.y = ground ? hover : 0.2;
    vScene.add(vModel);
    // frame the model's bounding sphere so every model, tall or flat, fills the viewer the same way
    vModel.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(vModel), c = bb.getCenter(new THREE.Vector3()), r = bb.getBoundingSphere(new THREE.Sphere()).radius;
    const half = Math.min(THREE.MathUtils.degToRad(vCam.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(vCam.fov) / 2) * vCam.aspect));
    const dist = THREE.MathUtils.clamp((r / Math.sin(half)) * 0.9, 3, 10);
    if (ground && !hover) c.y = Math.min(c.y, 0.95);
    vControls.target.copy(c); vCam.position.copy(c).addScaledVector(new THREE.Vector3(3.2, 1.6, 4.4).normalize(), dist);
    vControls.minDistance = dist * 0.4; vControls.maxDistance = dist * 2.2; vControls.update();
    $('viewer-loading').classList.remove('is-on');
    vNeeds = true;
  }
}
function sizeViewer() { const r = vCanvas.getBoundingClientRect(); if (!r.width) return; vr.setSize(r.width, r.height, false); vCam.aspect = r.width / r.height; vCam.updateProjectionMatrix(); }
new ResizeObserver(sizeViewer).observe(vCanvas);

// ------------------------------------------------------------ the surface of the Moon and Mars (surface.js)
let toastT = 0;
function toast(msg, speak = true) { if (speak) narrate(msg); const el = $('toast'); el.textContent = msg; el.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), Math.max(4500, msg.length * 60)); }
const surface = createSurface({
  renderer, canvas, loadModel, items: DATA.items, earthMap: T.day, getShift: () => shift,
  onSelect: (id) => { state.item = id; state.site = ITEM_SITE[id]; renderDetail(); history.replaceState(null, '', '?a=' + encodeURIComponent(id)); },
  onToast: toast, onState: () => renderActions(),
  status: statusOf, baseOf, onRepair: (id) => startRepair(id), onBay: (id) => openQueue(SITES[ITEM_SITE[id]].base),
  onRepaired: (id) => { repaired.add(id); saveRepaired(); if (state.item === id) renderDetail(); },
});
window.SF_SURFACE = surface; // handle for automated checks

// ------------------------------------------------------------ Skylab: recover → repair bay → fly it home
const bay = createRepairBay({ renderer, canvas, loadModel, host: $('bay') });
window.SF_BAY = bay;
{ // narrator + sound switches
  const aV = $('a-voice'), aS = $('a-sfx');
  const sync = () => { aV.setAttribute('aria-pressed', String(voiceEnabled())); aS.setAttribute('aria-pressed', String(sfxEnabled())); };
  aV.hidden = !hasVoice(); sync();
  aV.addEventListener('click', () => { setVoice(!voiceEnabled()); sync(); if (voiceEnabled()) narrate('Narrator on. I will read every explanation aloud.', { mode: 'replace' }); });
  aS.addEventListener('click', () => { setSfx(!sfxEnabled()); sync(); sfx.click(); });
  onSpeaking((on) => { aV.classList.toggle('is-speaking', on); const l = $('d-listen'); l.classList.toggle('is-on', on); l.querySelector('span').textContent = on ? 'Stop' : 'Listen'; });
  document.addEventListener('click', (e) => { if (e.target.closest('.views button, .site, .grp__head, .tab, .pill, .st-btn, .readstory, .chapters button')) sfx.click(); }, true);
}
let repairing = false;
function busyRepair() { return repairing || bay.active || surface.recovering; }
const RAD = Math.PI / 180;
function hopKm(s, base) { // great-circle distance from the site to the base
  if (s.lat === undefined) return 0;
  const R = base.body === 'mars' ? 3389.5 : 1737.4, p1 = s.lat * RAD, p2 = base.lat * RAD, dl = (base.lon - s.lon) * RAD;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
}
function bearingTo(s, base) { // the direction the hopper comes from, on the ground (x east, -z north)
  if (s.lat === undefined) return [1, 0];
  const p1 = s.lat * RAD, p2 = base.lat * RAD, dl = (base.lon - s.lon) * RAD;
  const b = Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl));
  return [Math.sin(b), -Math.cos(b)];
}
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
async function veilOn(text) { $('veil-text').textContent = text; $('veil').classList.add('is-on'); narrate(text.replace(/…$/, '.'), { mode: 'replace' }); sfx.whoosh(1.4); await wait(520); }
function veilOff() { setTimeout(() => $('veil').classList.remove('is-on'), 120); }
function bayMode(on) {
  setScene(on ? 'bay' : surface.active && surface.world ? surface.world.body : 'space');
  document.body.classList.toggle('is-bay', on);
  if (on) { detail.classList.remove('is-open'); detail.setAttribute('aria-hidden', 'true'); toggleIndex(false); labelsEl.hidden = true; controls.enabled = false; $('sbar').hidden = true; $('toast').classList.remove('is-on'); }
  else if (!surface.active) { labelsEl.hidden = false; controls.enabled = true; }
  updateShift(); bay.resize();
}
async function arriveAt(siteId, itemId, quiet) {
  const s = SITES[siteId];
  await surface.enter(s, itemId, { quiet });
  surfaceMode(true); state.focus = s.body; state.site = siteId; state.item = itemId;
  crumb(`${s.name} · ${s.sub}`); $('s-sun').value = surface.sunEl; $('hint').style.opacity = 0;
  document.querySelectorAll('.site').forEach((el) => el.classList.toggle('is-active', el.dataset.site === siteId));
}
function jobFor(itemId) {
  const s = SITES[ITEM_SITE[itemId]], plan = REPAIR[itemId], base = baseOf(itemId), km = hopKm(s, base);
  return { itemId, item: DATA.items[itemId], plan, base, site: s, km, dir: bearingTo(s, base),
    from: { site: s.name, km: km.toLocaleString('en-US'), orbit: !!plan.orbit }, onRepaired: () => { repaired.add(itemId); saveRepaired(); } };
}
// after the bay: fly the machine home (or back to orbit), or put it back unrepaired
async function afterBay(res, j, { fromQueue = false } = {}) {
  const fixed = res.repaired;
  await veilOn(fixed ? (j.plan.orbit ? `Releasing ${j.item.name} into orbit…` : `Flying ${j.item.name} home to ${j.site.name}…`) : fromQueue ? 'Back outside…' : `Returning ${j.item.name} to ${j.site.name}…`);
  bay.close(); bayMode(false);
  if (fromQueue && !fixed) { await arriveAt(j.base.id, j.base.id === 'skylab-mars' ? 'sk-bay-mars' : 'sk-bay-moon', false); veilOff(); return; }
  if (j.plan.orbit) { veilOff(); openSite(j.site.id, j.itemId); if (fixed) toast(`${j.item.name} is back in service. It answers its first call home in years.`); return; }
  await arriveAt(j.site.id, j.itemId, true);
  veilOff();
  if (fixed) { await surface.deliver(j.itemId, j); spokenItem = j.itemId; toast(`${j.item.name} is working again.${j.plan.unlock ? ` ${j.plan.unlock}: unlocked.` : ''}`); }
  else { surface.restore(j.itemId); surface.select(j.itemId); }
  renderDetail();
}
async function startRepair(itemId) {
  if (busyRepair()) return;
  const j = jobFor(itemId); if (!j.plan || !j.base || statusOf(itemId) !== 'offline') return;
  repairing = true;
  try {
    if (surface.active && !j.plan.orbit) { detail.classList.remove('is-open'); updateShift(); await surface.recover(itemId, j); }
    await veilOn(j.plan.orbit ? `A servicing tug from ${j.base.name} captures ${j.item.name}…` : `Flying to ${j.base.name} · ${j.km.toLocaleString('en-US')} km`);
    if (surface.active) { surface.exit(); surfaceMode(false); }
    bayMode(true); closeDetail(); veilOff();
    const res = await bay.open(j);
    if (res.action === 'more') { await queueLoop(j.base, null); return; }
    await afterBay(res, j);
  } catch (err) { console.error('repair', err); toast('The repair could not start: ' + err.message); bay.close(); bayMode(false); }
  finally { repairing = false; }
}
function queueFor(base) {
  const key = Object.keys(BASES).find((k) => BASES[k] === base);
  const queue = Object.keys(REPAIR).filter((id) => REPAIR[id].base === key && REPAIR[id].status === 'offline' && ITEM_SITE[id]).map((id) => {
    const s = SITES[ITEM_SITE[id]]; return { id, name: DATA.items[id].name, site: s.name, km: hopKm(s, base).toLocaleString('en-US'), fault: REPAIR[id].fault, repaired: repaired.has(id) };
  }).sort((a, b) => a.repaired - b.repaired);
  const ctx = { base, queue, repairedCount: queue.filter((x) => x.repaired).length, reset() { queue.forEach((x) => { repaired.delete(x.id); x.repaired = false; }); saveRepaired(); ctx.repairedCount = 0; } };
  return ctx;
}
async function queueLoop(base, first) {
  let res = first || await bay.openQueue(queueFor(base));
  for (;;) {
    if (res.action !== 'pick') { // left the queue: back outside, at the hangar
      await veilOn('Back outside…'); bay.close(); bayMode(false);
      await arriveAt(base.id, base.id === 'skylab-mars' ? 'sk-bay-mars' : 'sk-bay-moon', false); veilOff(); return;
    }
    const j = jobFor(res.itemId), r = await bay.open({ ...j, queueCtx: queueFor(base) });
    if (r.action === 'more') { res = await bay.openQueue(queueFor(base)); continue; }
    await afterBay(r, j, { fromQueue: true }); return;
  }
}
async function openQueue(baseKey) {
  if (busyRepair()) return;
  const base = BASES[baseKey]; if (!base) return;
  repairing = true;
  try {
    await veilOn(`Through the airlock into ${base.bay}…`);
    surface.exit(); surfaceMode(false); bayMode(true); closeDetail(); veilOff();
    await queueLoop(base, null);
  } catch (err) { console.error('bay', err); bay.close(); bayMode(false); }
  finally { repairing = false; }
}
// ------------------------------------------------------------ story mode: the whole tale of one object, in chapters
const UNIT = '(?:km\\/s|km\\/h|m\\/s|mW\\/m²|g\\/cm³|kbit\\/s|bits?\\/s|km|cm|mm|m|kg|t|MN|kN|mN|N|W|°C|K|°|%|AU|ppm|ppb|s|min|h|bar|MHz|GHz|Hz|nT|MP|rpm|Ga|nm|μm|days?|years?|yr|sols?|tonnes?|million|billion|metres?|kilometres?|seconds?|minutes?|hours?)';
const NUM_RE = new RegExp('(?:≈\\s?)?(?<![\\w.])\\d[\\d,.]*(?:\\s?[×]\\s?10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)?\\s?' + UNIT + '(?:\\s(?:km|kg|km\\/s|years?))?(?![\\w])', 'g');
const hl = (t) => esc(t).replace(NUM_RE, (m) => `<b class="num">${m}</b>`);
const lead = (t) => { const i = t.search(/[.!?”](\s|$)/); return i > 0 && i < 170 && i < t.length - 2 ? [t.slice(0, i + 1), t.slice(i + 2)] : [t, '']; };
const labelled = (p, i) => { const m = p.match(/^([^:.]{3,44}):\s([\s\S]+)$/); return m ? [m[1], m[2].charAt(0).toUpperCase() + m[2].slice(1)] : [['How it worked', 'What it found', 'Why it matters', 'Behind the scenes'][i % 4], p]; };
const ICON = {
  rocket: '<path d="M12 3c3 2 4.5 5.5 4.5 9.5L14 16h-4l-2.5-3.5C7.5 8.5 9 5 12 3z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M10 16l-1.5 4M14 16l1.5 4M12 16v5"/>',
  land: '<path d="M8 4h8l1.5 6h-11z"/><path d="M6.5 10l-2.5 8M17.5 10l2.5 8M3 18h4M17 18h4M12 10v4"/>',
  orbit: '<circle cx="12" cy="12" r="3.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-25 12 12)"/>',
  wave: '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>',
  laser: '<path d="M4 20l7-7M13 11l7-7"/><circle cx="12" cy="12" r="1.6"/><path d="M16 4h4v4"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  drop: '<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 1 1-12 0c0-3.4 2.5-6.5 6-11z"/>',
  camera: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.4"/><path d="M8 7l1.5-3h5L16 7"/>',
  magnet: '<path d="M6 4v8a6 6 0 0 0 12 0V4M6 8h4M14 8h4"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 1 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3 0-3-1-5.5.5-8z"/>',
  signal: '<path d="M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7"/><circle cx="12" cy="12" r="1.4"/>',
  impact: '<path d="M12 3l1.8 5.2L19 6l-2.6 4.8L21 13l-5.3.8L16 19l-4-3.4L8 19l.3-5.2L3 13l4.6-2.2L5 6l5.2 2.2z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ICON.star}</svg>`;
function iconFor(t) {
  t = t.toLowerCase();
  const map = [['impact', /crash|impact|hit the|plunge/], ['land', /land|touch|bounce|airbag|settles/], ['rocket', /t−0|liftoff|launch|lifts off|rocket|boosters?/], ['wave', /quake|seism|rings for/], ['laser', /laser|reflector/],
    ['chip', /computer|software|cpu|processor|bug|memory|code|patch|alarm|reboot/], ['drop', /water|ice|brine|frost|snow|ocean/], ['camera', /camera|imag|photo|picture|portrait/], ['magnet', /magnet/],
    ['orbit', /orbit|insertion|gravity assist|flyby|swing|injection|heliopause/], ['flame', /engine|thrust|propuls|burn|fuel|propellant|ion /], ['signal', /silent|lost|last |contact|sleep|wake|signal/], ['sun', /sun|solar/]];
  const hit = map.find(([, re]) => re.test(t)); return hit ? hit[0] : 'star';
}
function storyChapters(itemId) {
  const it = DATA.items[itemId], ms = MISSIONS[MISSION_OF[itemId]], hw = HARDWARE[it.model], s = SITES[ITEM_SITE[itemId]];
  const active = /active|still working|still in use/i.test(it.facts.map((f) => f[1]).join(' ') + ' ' + (s ? s.sub : ''));
  const sci = [...(hw ? [hw] : []), ...(ms ? ms.science : [])].map(labelled);
  const ch = [{ id: 'cover', label: 'Intro', teaser: '' }];
  if (ms) ch.push({ id: 'liftoff', label: 'Liftoff', teaser: `${ms.launch.vehicle}, ${ms.launch.date}` });
  if (ms && ms.timeline.length > 2) ch.push({ id: 'mission', label: 'The mission', teaser: `${ms.timeline.length - 2} moments, from ${ms.timeline[2][0]} to ${ms.timeline[ms.timeline.length - 1][0]}` });
  if (sci.length) ch.push({ id: 'science', label: 'How it works', teaser: sci.map((c) => c[0]).slice(0, 3).join(' · ') });
  if (ms) ch.push({ id: 'numbers', label: 'By the numbers', teaser: ms.numbers.slice(0, 2).map(([k, v]) => `${k} ${v}`).join(' · ') });
  ch.push({ id: 'today', label: it.base ? 'At the base' : active ? 'Where it is now' : 'Where it rests today', teaser: it.base ? it.kind : (it.facts.find((f) => /status/i.test(f[0])) || it.facts[it.facts.length - 1])[1] });
  return ch;
}
let story = null;
const storyEl = $('story'), storyScroll = $('story-scroll');
function beats(list) {
  return `<ol class="st-path">${list.map(([when, text]) => { const [a, b] = lead(text); return `<li class="st-beat st-rev"><span class="st-node">${icon(iconFor(when + ' ' + text))}</span><div class="st-beat__body"><time>${esc(when)}</time><p class="st-beat__lead">${hl(a)}</p>${b ? `<p>${hl(b)}</p>` : ''}</div></li>`; }).join('')}</ol>`;
}
function openStory(itemId, chapterId) {
  const it = DATA.items[itemId], ms = MISSIONS[MISSION_OF[itemId]], hw = HARDWARE[it.model], s = SITES[ITEM_SITE[itemId]]; if (!it || !s) return;
  const chs = storyChapters(itemId), where = s.body === 'moon' ? 'The Moon' : s.body === 'mars' ? 'Mars' : s.sub;
  const head = (id, sub) => { const i = chs.findIndex((c) => c.id === id); return `<header class="st-head st-rev"><span class="st-num">Chapter ${String(i).padStart(2, '0')}</span><h2>${esc(chs[i].label)}</h2>${sub ? `<p>${sub}</p>` : ''}</header>`; };
  const parts = [];
  parts.push(`<section class="st-ch st-cover" data-ch="cover"><p class="st-kicker">${esc(ms ? ms.agency : '')}${ms ? ' · ' + esc(ms.launch.date.split(' ').pop()) : ''}</p><h1 class="st-title">${styled(it.name)}</h1><p class="st-sub">${esc(it.kind)} · ${esc(s.name)} · ${esc(where)}</p><p class="st-lede">${hl(it.story[0])}</p><p class="st-cue">Scroll to begin<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></p></section>`);
  if (ms) parts.push(`<section class="st-ch" data-ch="liftoff">${head('liftoff', `${esc(ms.launch.vehicle)} · ${esc(ms.launch.date)}`)}
    <div class="st-pass st-rev"><div class="st-pass__main">
      <div class="st-pass__row"><div><span>Mission</span><b>${esc(ms.name)}</b></div><div><span>Agency</span><b>${esc(ms.agency)}</b></div></div>
      <div class="st-pass__row"><div><span>Date</span><b>${esc(ms.launch.date)}</b></div><div><span>Time</span><b>${esc(ms.launch.time)}</b></div></div>
      <div class="st-pass__row"><div><span>Rocket</span><b>${esc(ms.launch.vehicle)}</b></div></div>
      <div class="st-pass__row"><div><span>Launch site</span><b>${esc(ms.launch.site)}</b></div></div>
    </div><div class="st-pass__stub"><span>Destination</span><b>${esc(where)}</b>${icon(s.body === 'space' ? 'orbit' : 'land')}</div></div>
    ${beats(ms.timeline.slice(0, 2))}
    <button class="st-film st-rev" type="button" data-film>${icon('rocket')}<span><b>Watch the launch film</b><small>${esc(ROCKET_NAMES[ms.rocket] || ms.launch.vehicle)} from the pad to ${esc(where)}</small></span></button></section>`);
  if (ms && ms.timeline.length > 2) parts.push(`<section class="st-ch" data-ch="mission">${head('mission', `The moments that made ${esc(ms.name)}`)}${beats(ms.timeline.slice(2))}</section>`);
  const sci = [...(hw ? [hw] : []), ...(ms ? ms.science : [])].map(labelled);
  if (sci.length) parts.push(`<section class="st-ch" data-ch="science">${head('science', 'The engineering and the science, in depth')}<div class="st-cards">${sci.map(([t, body], i) => { const [a, b] = lead(body); return `<article class="st-card st-rev${i === 0 ? ' st-card--lead' : ''}"><span class="st-card__ic">${icon(iconFor(t + ' ' + body))}</span><h3>${esc(t)}</h3><p class="st-card__lead">${hl(a)}</p>${b ? `<p>${hl(b)}</p>` : ''}</article>`; }).join('')}</div></section>`);
  if (ms) parts.push(`<section class="st-ch" data-ch="numbers">${head('numbers', 'The figures behind the story')}<div class="st-stats">${ms.numbers.map(([k, v]) => `<div class="st-stat st-rev"><b data-v="${esc(v)}">${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div></section>`);
  const coords = s.lat !== undefined ? `${Math.abs(s.lat).toFixed(3)}° ${s.lat >= 0 ? 'N' : 'S'} · ${Math.abs(((s.lon + 540) % 360) - 180).toFixed(3)}° ${((s.lon + 540) % 360) - 180 >= 0 ? 'E' : 'W'}` : s.sub;
  const onGround = s.body === 'moon' || s.body === 'mars';
  parts.push(`<section class="st-ch st-today" data-ch="today">${head('today', esc(coords))}
    ${it.story.slice(1).map((p) => `<p class="st-lede st-rev">${hl(p)}</p>`).join('')}
    <div class="st-facts st-rev">${it.facts.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
    <div class="st-cta st-rev">${onGround && !(surface.active && surface.world && surface.world.site.id === s.id) ? `<button type="button" class="st-btn is-primary" data-go>${icon('land')}Land beside it</button>` : ''}${ms ? `<button type="button" class="st-btn" data-film>${icon('rocket')}Watch the launch film</button>` : ''}<button type="button" class="st-btn" data-close>Back to the explorer</button></div></section>`);
  storyScroll.innerHTML = parts.join(''); setScene('story');
  $('story-rail').innerHTML = chs.map((c, i) => `<button type="button" data-ch="${c.id}"><i></i><span>${i ? esc(c.label) : 'Intro'}</span></button>`).join('');
  $('story-mission').textContent = ms ? ms.name : it.name;
  // the 3D model moves into the story's stage (shown first, so it is measured at its real size)
  storyEl.hidden = false; document.body.classList.add('is-story');
  $('story-slot').appendChild(vCanvas); sizeViewer();
  story = { itemId, it, s, ms, sections: [...storyScroll.querySelectorAll('.st-ch')], visual: null, counted: false };
  setStoryVisual('item');
  requestAnimationFrame(() => storyEl.classList.add('is-open'));
  story.io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); story.io.unobserve(e.target); } }), { root: storyScroll, threshold: 0.18 });
  storyScroll.querySelectorAll('.st-rev').forEach((el) => story.io.observe(el));
  storyScroll.scrollTop = 0;
  if (chapterId && chapterId !== 'cover') requestAnimationFrame(() => { const t = storyScroll.querySelector(`[data-ch="${chapterId}"]`); if (t) storyScroll.scrollTo({ top: t.offsetTop - 40, behavior: 'auto' }); onStoryScroll(); });
  onStoryScroll();
}
function setStoryVisual(kind) {
  if (!story || story.visual === kind) return; story.visual = kind;
  if (kind === 'rocket' && story.ms) { const r = showRocketInViewer(story.ms.rocket); $('story-cap').innerHTML = `<b>${esc(ROCKET_NAMES[story.ms.rocket] || story.ms.launch.vehicle)}</b><span>${r.H.toFixed(1)} m tall · drag to turn it</span>`; }
  else { showInViewer(story.it, story.s); $('story-cap').innerHTML = `<b>${esc(story.it.name)}</b><span>${esc(story.it.kind)} · drag to turn it</span>`; }
}
function onStoryScroll() {
  if (!story) return;
  const top = storyScroll.scrollTop, h = storyScroll.clientHeight;
  let idx = 0; story.sections.forEach((sec, i) => { if (sec.offsetTop - top < h * 0.45) idx = i; });
  const id = story.sections[idx].dataset.ch;
  $('story-rail').querySelectorAll('[data-ch]').forEach((b, i) => { b.classList.toggle('is-on', i === idx); b.classList.toggle('is-past', i < idx); });
  $('story-prog').style.transform = `scaleX(${Math.min(1, top / Math.max(1, storyScroll.scrollHeight - h))})`;
  setStoryVisual(id === 'liftoff' ? 'rocket' : 'item');
  if (id === 'numbers' && !story.counted) { story.counted = true; countUp(); }
  if (story.spoken !== idx) { story.spoken = idx; narrate(chapterText(story.sections[idx]), { mode: idx ? 'soft' : 'replace' }); }
}
function chapterText(sec) {
  const els = sec.querySelectorAll('.st-title, .st-sub, h2, .st-head p, .st-lede, .st-beat__body, .st-card, .st-stat, .st-facts > div, .st-pass__row > div');
  return [...els].map((e) => e.innerText.replace(/\s*\n+\s*/g, '. ').trim()).filter(Boolean).join('. ').replace(/\.\s*\./g, '.');
}
function countUp() { // the leading number of each figure counts up
  storyScroll.querySelectorAll('.st-stat b[data-v]').forEach((b) => {
    const v = b.dataset.v, m = v.match(/^(≈\s?)?([\d,]+(?:\.\d+)?)([\s\S]*)$/); if (!m || reduced) return;
    const target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].includes(','), t0 = performance.now();
    const fmt = (x) => { let s = x.toFixed(dec); if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return (m[1] || '') + s + m[3]; };
    (function tick(now) { const k = Math.min(1, (now - t0) / 1300), e = 1 - Math.pow(1 - k, 3); b.textContent = fmt(target * e); if (k < 1) requestAnimationFrame(tick); })(t0);
  });
}
function closeStory() {
  if (!story) return;
  const { it, s } = story; story.io.disconnect(); story = null; stopNarration(); setScene(surface.active && surface.world ? surface.world.body : 'space');
  storyEl.classList.remove('is-open'); document.body.classList.remove('is-story');
  setTimeout(() => { if (!story) storyEl.hidden = true; }, 450);
  document.querySelector('.detail__viewer').prepend(vCanvas); sizeViewer();
  if (!surface.active) showInViewer(it, s);
}
storyScroll.addEventListener('scroll', onStoryScroll, { passive: true });
$('story-rail').addEventListener('click', (e) => { const b = e.target.closest('[data-ch]'); if (!b) return; const t = storyScroll.querySelector(`[data-ch="${b.dataset.ch}"]`); if (t) storyScroll.scrollTo({ top: t.offsetTop - 40, behavior: reduced ? 'auto' : 'smooth' }); });
$('story-close').addEventListener('click', closeStory);
storyScroll.addEventListener('click', (e) => {
  const id = story && story.itemId;
  if (e.target.closest('[data-close]')) closeStory();
  else if (e.target.closest('[data-film]')) { closeStory(); watchLaunch(id); }
  else if (e.target.closest('[data-go]')) { const site = ITEM_SITE[id]; closeStory(); openSite(site, id); }
});

// ------------------------------------------------------------ launch films (launch.js), then the flight out
const launchFx = createLaunch({ renderer });
let cine = null;
function caption(entry) {
  if (!entry) return; narrate(entry[1]); const el = $('cine-cap');
  el.classList.remove('is-on'); void el.offsetWidth;
  $('cine-stamp').textContent = entry[0]; $('cine-text').textContent = entry[1]; el.classList.add('is-on');
}
const progress = (p) => { $('cine-prog').style.transform = `scaleX(${Math.min(Math.max(p, 0), 1)})`; };
function watchLaunch(itemId) {
  const ms = MISSIONS[MISSION_OF[itemId]], siteId = ITEM_SITE[itemId]; if (!ms || !siteId || cine) return;
  const start = () => {
    closeDetail(); tween = null;
    document.body.classList.add('is-cinema'); $('cine').hidden = false; labelsEl.hidden = true; controls.enabled = false; updateShift();
    $('cine-mission').textContent = ms.name; $('cine-meta').textContent = `${ms.launch.vehicle} · ${ms.launch.site} · ${ms.launch.date}`;
    cine = { itemId, siteId, ms, phase: 'pad', roar: sfxLoop('rocket') }; setScene('cine');
    const ss = (a, b, x) => { const k = Math.min(Math.max((x - a) / (b - a), 0), 1); return k * k * (3 - 2 * k); };
    launchFx.play(ms, { onCaption: caption, onProgress: (p) => { progress(p * 0.5); const t = p * 12; if (cine && cine.roar) cine.roar.set(ss(1.5, 2.8, t) * (1 - 0.7 * ss(6.5, 12, t))); } })
      .then(() => { if (cine && cine.phase === 'pad') { cine.roar.stop(1.2); startCruise(); } });
  };
  if (surface.active) leaveSurface(start); else start();
}
function transferCurve(from, to) {
  if (from.distanceTo(to) < 25) { const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, from.distanceTo(to) * 0.35, 0)); return new THREE.CatmullRomCurve3([from, mid, to]); }
  const r0 = Math.hypot(from.x, from.z), r1 = Math.hypot(to.x, to.z), a0 = Math.atan2(-from.z, from.x);
  let da = Math.atan2(-to.z, to.x) - a0; while (da < 0.6) da += Math.PI * 2;
  const pts = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48, a = a0 + da * t, r = r0 + (r1 - r0) * (1 - Math.cos(Math.PI * t)) / 2; pts.push(polar(r, a, lerp(from.y, to.y, t) + Math.sin(Math.PI * t) * 3)); }
  pts[pts.length - 1] = to.clone();
  return new THREE.CatmullRomCurve3(pts);
}
function startCruise() {
  const { siteId, ms } = cine, s = SITES[siteId];
  cine.phase = 'cruise'; state.focus = null; sfx.whoosh(3); setScene('space');
  const target = s.body === 'moon' || s.body === 'mars' ? worldPos(BODIES[s.body].obj) : worldPos(s.anchor);
  const curve = s.anchorKey && TRAJ[s.anchorKey] ? TRAJ[s.anchorKey] : transferCurve(earthPos.clone(), target), L = curve.getLength();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, Math.max(0.04, L * 0.0007), 8), new THREE.MeshBasicMaterial({ color: 0xf3d09a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  tube.geometry.setDrawRange(0, 0);
  const marker = sprite(TX_DOT, Math.max(1.2, L * 0.012), 0xfff2d8, 1);
  scene.add(tube, marker);
  // pin each caption to where its world lies along the path (others are spaced between them)
  const caps = ms.timeline.slice(2), near = (pos) => { let best = 0, bd = Infinity; for (let i = 0; i <= 200; i++) { const d = curve.getPointAt(i / 200).distanceToSquared(pos); if (d < bd) { bd = d; best = i / 200; } } return best; };
  const names = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Ceres', 'Vesta', 'Eros'];
  const at = caps.map(([k, v]) => { const n = names.find((w) => new RegExp('\\b' + w + '\\b').test(k + ' ' + v)); const b = n && BODIES[n.toLowerCase()]; return b ? near(worldPos(b.obj)) : null; });
  if (at.length) { if (at[0] === null) at[0] = 0.06; if (at[at.length - 1] === null) at[at.length - 1] = 0.95; }
  for (let i = 0; i < at.length; i++) if (at[i] === null) { let j = i; while (at[j] === null) j++; const a0 = at[i - 1], a1 = at[j]; for (let q = i; q < j; q++) at[q] = a0 + ((a1 - a0) * (q - i + 1)) / (j - i + 1); }
  for (let i = 1; i < at.length; i++) at[i] = Math.max(at[i], at[i - 1] + 0.04);
  cine.cruise = { curve, tube, marker, t: 0, dur: Math.min(Math.max(8 + L / 40, 9), 16), caps, at, capI: -1, total: tube.geometry.index.count, span: Math.max(9, L * 0.2) };
  const p0 = curve.getPointAt(0), d0 = curve.getTangentAt(0);
  camera.position.copy(p0).addScaledVector(d0, -cine.cruise.span * 0.5).add(new THREE.Vector3(0, cine.cruise.span * 0.4, 0)); controls.target.copy(p0);
}
function updateCruise(dt) {
  const c = cine.cruise; c.t += dt;
  const k = easeIO(Math.min(c.t / c.dur, 1)), p = c.curve.getPointAt(k), dir = c.curve.getTangentAt(Math.min(k, 0.999));
  c.tube.geometry.setDrawRange(0, Math.floor((c.total * k) / 3) * 3);
  c.marker.position.copy(p);
  const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
  const want = p.clone().addScaledVector(dir, -c.span * 0.55).addScaledVector(side, c.span * 0.35).add(new THREE.Vector3(0, c.span * 0.42, 0));
  camera.position.lerp(want, 1 - Math.exp(-dt * 1.8)); controls.target.lerp(p, 1 - Math.exp(-dt * 3)); camera.lookAt(controls.target);
  if (c.caps.length) { let i = -1; c.at.forEach((a, q) => { if (k >= a - 0.03) i = q; }); if (i >= 0 && i !== c.capI) { c.capI = i; caption(c.caps[i]); } }
  progress(0.5 + 0.5 * k);
  if (c.t >= c.dur + 0.8) endCine(true);
}
function endCine(arrive) {
  if (!cine) return;
  const { siteId, itemId, cruise, roar } = cine; cine = null; if (roar) roar.stop(0.6); setScene('space');
  if (launchFx.active) launchFx.stop();
  if (cruise) { scene.remove(cruise.tube, cruise.marker); cruise.tube.geometry.dispose(); }
  document.body.classList.remove('is-cinema'); $('cine').hidden = true; $('cine-cap').classList.remove('is-on'); labelsEl.hidden = false; controls.enabled = true; updateShift();
  if (arrive) openSite(siteId, itemId);
}
$('cine-skip').addEventListener('click', () => endCine(true));

let landing = false;
function surfaceMode(on) {
  setScene(on && surface.world ? surface.world.body : 'space');
  document.body.classList.toggle('is-surface', on); detail.classList.toggle('is-surface', on);
  $('sbar').hidden = !on; labelsEl.hidden = on; controls.enabled = !on;
  if (on) toggleIndex(false);
  updateShift();
}
function landOn(siteId, itemId) {
  const s = SITES[siteId]; if (!s || landing) return;
  landing = true;
  const veil = $('veil'); $('veil-text').textContent = `Landing at ${s.name}…`; veil.classList.add('is-on'); sfx.whoosh(1.4);
  setTimeout(async () => {
    try {
      await surface.enter(s, itemId);
      surfaceMode(true);
      state.focus = s.body; state.site = siteId;
      crumb(`${s.name} · ${s.sub}`);
      $('s-sun').value = surface.sunEl;
      $('hint').style.opacity = 0;
      document.querySelectorAll('.site').forEach((el) => el.classList.toggle('is-active', el.dataset.site === siteId));
    } catch (err) { console.error('surface', err); toast('Could not land here: ' + err.message); }
    finally { landing = false; setTimeout(() => veil.classList.remove('is-on'), 120); }
  }, reduced ? 0 : 520);
}
function leaveSurface(then) {
  const veil = $('veil'), s = SITES[state.site];
  $('veil-text').textContent = 'Back to orbit…'; veil.classList.add('is-on'); sfx.whoosh(1.2);
  setTimeout(() => {
    surface.exit(); surfaceMode(false); closeDetail();
    if (then) then(); else focusBody(s ? s.body : 'moon');
    setTimeout(() => veil.classList.remove('is-on'), 160);
  }, reduced ? 0 : 450);
}
$('s-orbit').addEventListener('click', () => { if (!busyRepair()) leaveSurface(); });
$('s-sun').addEventListener('input', (e) => surface.setSun(+e.target.value));
$('s-sun').addEventListener('change', () => surface.commitSun());

// ------------------------------------------------------------ picking
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickables = () => [...Object.values(BODIES).map((b) => b.mesh), ...Object.values(SPACE).map((s) => s.obj.children[0])];
let hover = null, downAt = null;
function pick(e) {
  const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables(), false)[0];
  return hit ? hit.object.userData.pick : null;
}
canvas.addEventListener('pointermove', (e) => {
  if (e.buttons || surface.active || bay.active) return;
  const p = pick(e); const key = p ? p.type + ':' + p.key : null;
  if (key === hover) return; hover = key;
  canvas.classList.toggle('is-pointer', !!p);
  LABELS.forEach((L) => L.el.classList.toggle('is-active', !!p && ((p.type === 'body' && L.kind === 'body' && L.ref === p.key) || (p.type === 'space' && L.kind === 'space' && SITES[L.ref] && SITES[L.ref].anchor === SPACE[p.key].obj))));
});
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (surface.active || bay.active || repairing) return;
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const p = pick(e); if (!p) return;
  if (p.type === 'body') focusBody(p.key);
  else { const s = SITE_LIST.find((x) => x.anchor === SPACE[p.key].obj); if (s) openSite(s.id); }
});
controls.addEventListener('start', () => { tween = null; controls.enabled = true; $('hint').style.opacity = 0; });

// ------------------------------------------------------------ frame
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  scene.userData.stars.material.uniforms.uPR.value = renderer.getPixelRatio(); sizeViewer();
  updateShift(); remeasure(); surface.resize(); launchFx.resize(); bay.resize();
}
addEventListener('resize', resize);
const clock = new THREE.Clock();
// Labels: decide which may show, project them, then place them greedily by priority. A label
// that would overlap one already placed flips to the other side of its anchor, else it hides.
const placed = [];
function overlaps(x0, y0, x1, y1) { for (const r of placed) if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return true; return false; }
function setOn(L, on) { if (on !== L.on) { L.on = on; L.el.classList.toggle('is-hidden', !on); L.el.tabIndex = on ? 0 : -1; } }
function updateLabels() {
  const camPos = camera.position, W = innerWidth, H = innerHeight;
  const pxPerUnit = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const cand = [];
  for (const L of LABELS) {
    worldPos(L.anchor, tmp);
    let show = true;
    if (L.kind === 'site') {
      const s = SITES[L.ref], b = BODIES[s.body], c = worldPos(b.obj, tmp2);
      const n = tmp2.clone(); n.copy(tmp).sub(c).normalize();
      const facing = n.dot(camPos.clone().sub(tmp).normalize());
      show = state.focus === s.body && facing > 0.18 && camPos.distanceTo(c) < b.radius * 16;
    } else if (L.kind === 'body') {
      const b = BODIES[L.ref];
      if (b) show = state.focus !== L.ref && camPos.distanceTo(tmp) > b.radius * 9;
      if (L.ref === 'moon') show = show && state.focus !== 'earth' ? show : show;
      if (L.ref === 'helio' || L.ref === 'belt') show = !state.focus || state.focus.startsWith('space');
      if (state.site && b && state.focus === b.key) show = false;
    } else if (L.kind === 'space') {
      const sp = SPACE[SITES[L.ref].anchorKey];
      if (sp.hostBody) show = (state.focus === sp.hostBody || camPos.distanceTo(tmp) < 26) && camPos.distanceTo(tmp) > sp.size * 2.2;
      else show = (!state.focus || state.focus.startsWith('space') || state.view === 'beyond') && camPos.distanceTo(tmp) > sp.size * 2.2;
      // the probe you are looking at needs no label on top of it: the detail panel names it
      if (state.focus && 'space:' + SITES[L.ref].anchorKey === state.focus) show = camPos.distanceTo(tmp) > sp.view * 2;
    }
    const dist = camPos.distanceTo(tmp);
    tmp.project(camera);
    if (tmp.z > 1 || tmp.x < -1.05 || tmp.x > 1.05 || tmp.y > 0.86 || tmp.y < -0.86) show = false;
    const selected = state.site === L.ref;
    L.el.classList.toggle('is-active', selected || (L.el.classList.contains('is-active') && hover !== null));
    const dim = !!state.site && L.kind !== 'body' && !selected;
    if (dim !== L.dim) { L.dim = dim; L.el.classList.toggle('is-dim', dim); L.w = 0; } // dimming hides the sub line: re-measure
    if (!show) { setOn(L, false); continue; }
    L.sx = (tmp.x + 1) / 2 * W; L.sy = (1 - tmp.y) / 2 * H;
    L.sr = L.kind === 'body' && BODIES[L.ref] ? (BODIES[L.ref].radius / dist) * pxPerUnit : 0; // on-screen radius of a planet
    // the hardware is the point of the map, so its labels are placed before the planets'
    L.prio = selected ? 1000 : L.el.classList.contains('is-active') ? 900
      : L.kind === 'site' ? 500 + L.count * 10 : L.kind === 'space' ? 400 + L.count : 300;
    cand.push(L);
  }
  cand.sort((a, b) => b.prio - a.prio);
  placed.length = 0; placed.push(...obstacles); // labels never slide under the panels
  for (const L of cand) {
    if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
    const dot = L.kind === 'body' ? 7 : 10;
    const noDot = L.sr > 6; // a planet big enough to see needs no dot: the label sits just outside its disc
    const lead = noDot ? dot + 8 : dot / 2, off = noDot ? L.sr + 4 : 0;
    // right / left of the anchor; a planet's label may also sit below or above its disc
    const sides = noDot ? ['r', 'l', 'b', 't'] : ['r', 'l'];
    const k = sides.indexOf(L.side); if (k > 0) sides.unshift(sides.splice(k, 1)[0]); // keep last frame's side if it still fits
    let x0 = 0, y0 = 0, side = null;
    for (const s of sides) {
      if (s === 'r' || s === 'l') { x0 = s === 'r' ? L.sx + off - lead : L.sx - off - L.w + lead; y0 = L.sy - L.h / 2; }
      else { x0 = L.sx - lead - (L.w - lead) / 2; y0 = s === 'b' ? L.sy + off - 2 : L.sy - off - L.h + 2; }
      if (x0 < 4 || x0 + L.w > W - 4) continue;
      if (!overlaps(x0 - 3, y0 - 2, x0 + L.w + 3, y0 + L.h + 2)) { side = s; break; }
    }
    if (!side) { setOn(L, false); continue; }
    placed.push([x0, y0, x0 + L.w, y0 + L.h]);
    if (side !== L.side) { L.side = side; L.el.classList.toggle('is-left', side === 'l'); }
    if (noDot !== L.noDot) { L.noDot = noDot; L.el.classList.toggle('no-dot', noDot); }
    setOn(L, true);
    L.el.style.transform = `translate3d(${x0.toFixed(1)}px,${y0.toFixed(1)}px,0)`;
  }
}
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (launchFx.active) { launchFx.update(dt); launchFx.render(); return; }
  if (bay.active) { bay.update(dt); bay.render(); return; }
  if (story) { vControls.update(); vr.render(vScene, vCam); return; } // only the story's model is on screen
  if (surface.active) {
    const ks = 1 - Math.exp(-dt * 4); shift.x += (shift.tx - shift.x) * ks; shift.y += (shift.ty - shift.y) * ks;
    surface.update(dt); surface.render(); return;
  }
  for (const k in SPACE) {
    const sp = SPACE[k]; if (!sp.move) continue;
    const before = sp.obj.position.clone(); sp.obj.position.copy(sp.move(t));
    if (!tween && !cine && state.focus === 'space:' + k) { const d = sp.obj.position.clone().sub(before); camera.position.add(d); controls.target.add(d); }
  }
  if (cine && cine.cruise) updateCruise(dt);
  if (tween) {
    tween.t += dt; const k = easeIO(sat(tween.t / tween.dur));
    camera.position.lerpVectors(tween.fromPos, tween.toPos, k).y += Math.sin(k * Math.PI) * tween.arc;
    controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
    if (tween.rot) tween.rot.obj.rotation.y = lerp(tween.rot.from, tween.rot.to, k);
    camera.lookAt(controls.target);
    if (k >= 1) { const done = tween.done; tween = null; controls.enabled = true; if (done) done(); }
  } else if (!cine) controls.update();
  const ks = 1 - Math.exp(-dt * 4); shift.x += (shift.tx - shift.x) * ks; shift.y += (shift.ty - shift.y) * ks;
  camera.setViewOffset(innerWidth, innerHeight, -shift.x, -shift.y, innerWidth, innerHeight);
  scene.userData.sunMat.uniforms.uTime.value = t;
  if (BODIES.earth.spin && !(state.site && SITES[state.site].body === 'earth')) { BODIES.earth.spin.rotation.y += dt * 0.03; BODIES.earth.clouds.rotation.y += dt * 0.034; }
  BODIES.jupiter.spin.rotation.y += dt * 0.05; ['mercury', 'venus', 'uranus', 'neptune'].forEach((k) => { BODIES[k].spin.rotation.y += dt * 0.03; }); BODIES.saturn.spin.rotation.y += dt * 0.045; BODIES.ceres.spin.rotation.y += dt * 0.02; BODIES.eros.spin.rotation.y += dt * 0.0;
  beltGroup.rotation.y += dt * 0.004;
  { // close to the Moon, Earth or Mars the belt's rocks only clutter the view: fade them out
    const bm = beltGroup.userData.mat, on = !['moon', 'mars', 'earth'].includes(state.focus);
    bm.opacity += ((on ? 1 : 0) - bm.opacity) * (1 - Math.exp(-dt * 3)); beltGroup.visible = bm.opacity > 0.01;
  }
  const d = SPACE.dawn; if (d) { const a = t * d.orbit.speed; d.obj.position.copy(dawnAt(a)); if (d.model) d.model.rotation.y = -a; }
  ['pioneer10', 'pioneer11', 'voyager1', 'voyager2', 'kepler'].forEach((k) => { const s = SPACE[k]; if (s && s.model) s.model.rotation.y += dt * 0.08; });
  Object.values(SPACE).forEach((s) => { const dd = camera.position.distanceTo(worldPos(s.obj, tmp)); s.glow.material.opacity = 0.55 * sat((dd / s.size - 8) / 20); });
  // site dots pulse a little
  SITE_LIST.forEach((s, i) => { if (s.dot) { s.dot.material.opacity = (state.site === s.id ? 1 : 0.55) + 0.2 * Math.sin(t * 2 + i); s.dot.scale.setScalar(BODIES[s.body].radius * (state.site === s.id ? 0.05 : 0.034) * s.dotK * (s.dotK > 1 ? 1 + 0.12 * Math.sin(t * 3) : 1)); } });
  renderer.render(scene, camera);
  updateLabels();
  if (detail.classList.contains('is-open')) { vControls.update(); vr.render(vScene, vCam); }
}

// ------------------------------------------------------------ start
{ // arriving from a landing-page card: keep the launch screen's words on the loader
  let msg = null;
  try { msg = sessionStorage.getItem('sf-launch-text'); sessionStorage.removeItem('sf-launch-text'); } catch (e) {}
  const it = DATA.items[params.get('a')];
  if (msg || it) $('loading-text').textContent = msg || `Flying to ${it.name}…`;
}
resize();
camera.position.set(420, 520, 980); controls.target.set(0, 0, 0); camera.lookAt(0, 0, 0);
const t0 = performance.now();
let started = false; // the narrator stays quiet until the explorer is up
(function waitReady() {
  if (!texReady && performance.now() - t0 < 8000) { setTimeout(waitReady, 60); return; }
  renderer.compile(scene, camera);
  $('loading').classList.add('is-done');
  requestAnimationFrame(frame);
  const want = params.get('a'), wantSite = params.get('site');
  const site = want && ITEM_SITE[want] ? ITEM_SITE[want] : wantSite && SITES[wantSite] ? wantSite : null;
  if (site) { camera.position.copy(OVERVIEW.pos); controls.target.copy(OVERVIEW.target); setTimeout(() => openSite(site, want), 250); }
  else setView('overview');
  window.SF_EXPLORE_READY = true;
  // first visit: point at the new repair bases
  let seen = false; try { seen = !!localStorage.getItem('sf-skylab-hint'); localStorage.setItem('sf-skylab-hint', '1'); } catch (e) { seen = true; }
  started = true;
  if (!seen && !site) setTimeout(() => toast('New: Skylab repair bases on the Moon and Mars. Everything here stopped working long ago. Land beside a machine and call the recovery hopper to bring it back to life.'), 2600);
})();
