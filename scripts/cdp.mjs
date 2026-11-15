// Minimal headless-Chrome driver over the DevTools protocol.
// Usage: node cdp.mjs <steps.json> <outdir>
// steps.json: { "w":1600, "h":900, "gl":"d3d11"|"swiftshader", "steps":[ {"goto":url} | {"wait":ms} | {"eval":js} | {"shot":name} | {"click":[x,y]} | {"drag":[x0,y0,x1,y1]} | {"wheel":[x,y,dy]} | {"waitFor":js, "timeout":ms} ] }
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const [, , stepsFile, outDir] = process.argv;
const cfg = JSON.parse(readFileSync(stepsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });
const W = cfg.w || 1600, H = cfg.h || 900;
const port = 9300 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), 'cdp-prof-' + port);
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const glFlags = cfg.gl === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', ...glFlags, 'about:blank'], { stdio: 'ignore' });

const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map(); const logs = [];
async function connect() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); return; }
    } catch {}
    await sleep(250);
  }
  throw new Error('no chrome');
}
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return 'EXCEPTION: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', ...extra });

try {
  await connect();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); return; }
    if (d.method === 'Runtime.consoleAPICalled') logs.push(`[${d.params.type}] ` + d.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    if (d.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Log.entryAdded') logs.push(`[log:${d.params.entry.level}] ${d.params.entry.text} ${d.params.entry.url || ''}`);
    if (d.method === 'Network.loadingFailed') logs.push(`[netfail] ${d.params.errorText} ${d.params.requestId}`);
    if (d.method === 'Page.frameNavigated' && !d.params.frame.parentId) logs.push(`[NAV ${((Date.now() - T0) / 1000).toFixed(1)}s] ${d.params.frame.url}`);
    if (d.method === 'Page.navigatedWithinDocument') logs.push(`[NAV-in-doc ${((Date.now() - T0) / 1000).toFixed(1)}s] ${d.params.url}`);
    if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) logs.push(`[http ${d.params.response.status}] ${d.params.response.url}`);
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: !!cfg.mobile });
  for (const s of cfg.steps) {
    if (s.goto) { await send('Page.navigate', { url: s.goto }); await sleep(500); }
    else if (s.wait) await sleep(s.wait);
    else if (s.waitFor) { const t0 = Date.now(); let ok = false; while (Date.now() - t0 < (s.timeout || 20000)) { if (await evaluate(s.waitFor) === true) { ok = true; break; } await sleep(200); } console.log('waitFor', ok ? 'ok' : 'TIMEOUT', s.waitFor, ((Date.now() - t0) / 1000).toFixed(1) + 's'); }
    else if (s.eval) console.log('eval>', JSON.stringify(await evaluate(s.eval)));
    else if (s.clickEval) { const p = await evaluate(s.clickEval); console.log("clickAt", JSON.stringify(p)); const [x, y] = p; await mouse("mouseMoved", x, y); await mouse("mousePressed", x, y, { clickCount: 1 }); await mouse("mouseReleased", x, y, { clickCount: 1 }); }
    else if (s.click) { const [x, y] = s.click; await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y, { clickCount: 1 }); await mouse('mouseReleased', x, y, { clickCount: 1 }); }
    else if (s.drag) { const [x0, y0, x1, y1] = s.drag; await mouse('mousePressed', x0, y0, { clickCount: 1 }); for (let k = 1; k <= 12; k++) { await mouse('mouseMoved', x0 + (x1 - x0) * k / 12, y0 + (y1 - y0) * k / 12, { buttons: 1 }); await sleep(16); } await mouse('mouseReleased', x1, y1, { clickCount: 1 }); }
    else if (s.wheel) { const [x, y, dy] = s.wheel; await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); }
    else if (s.shotEl) { const b = await evaluate("(function(){var r=document.querySelector(" + JSON.stringify(s.shotEl) + ").getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()"); const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 88, clip: { x: b[0], y: b[1], width: b[2], height: b[3], scale: s.scale || 2 } }); writeFileSync(join(outDir, s.name + ".jpg"), Buffer.from(r.data, "base64")); console.log("shotEl", s.name); }
    else if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }); writeFileSync(join(outDir, s.shot + '.jpg'), Buffer.from(r.data, 'base64')); console.log('shot', s.shot); }
  }
} catch (e) { console.log('DRIVER ERROR', e.message); }
finally {
  console.log('--- console/log (' + logs.length + ')'); logs.slice(0, 80).forEach((l) => console.log(l.slice(0, 400)));
  try { ws && ws.close(); } catch {}
  proc.kill(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}
