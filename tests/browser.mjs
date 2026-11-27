/**
 * browser.mjs — a tiny, dependency-free driver for headless Chrome.
 *
 * Used by tests/ui.mjs to exercise the page for real: it serves the project
 * folder over HTTP (ES modules need that) and talks the DevTools protocol
 * over --remote-debugging-pipe. Nothing here is needed to run the viewer.
 */

import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

/** Serve `root` on `port` (default: a free local port). Also used by tools/serve.mjs. */
export function serve(root, port = 0) {
  const base = path.resolve(root);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(base, p);
      if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** The first Chrome-like browser found on this machine, or null. */
export function findChrome() {
  const names = [process.env.CHROME, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome'];
  for (const name of names) {
    if (!name) continue;
    const probe = spawnSync(name, ['--version'], { stdio: 'ignore' });
    if (!probe.error && probe.status === 0) return name;
  }
  return null;
}

/** Start a headless browser with one page; returns the page. */
export async function launch(options) {
  const { width = 1400, height = 900, chrome = findChrome() } = options || {};
  if (!chrome) throw new Error('no Chrome or Chromium found (set CHROME=/path/to/browser)');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'viewer-chrome-'));
  const proc = spawn(chrome, [
    '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check',
    '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--disable-extensions',
    '--disable-background-networking', '--disable-sync', '--no-sandbox',
    `--user-data-dir=${dir}`, `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

  const out = proc.stdio[3], inp = proc.stdio[4];
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  let buf = Buffer.alloc(0);

  inp.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let i;
    while ((i = buf.indexOf(0)) !== -1) {
      const msg = JSON.parse(buf.subarray(0, i).toString('utf8'));
      buf = buf.subarray(i + 1);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message + ' ' + (msg.error.data || '')));
        else resolve(msg.result);
      } else {
        for (const l of listeners) l(msg);
      }
    }
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    out.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable');

  /** Everything the page printed or threw, in order. */
  const consoleLog = [];
  listeners.add((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLog.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleLog.push('EXCEPTION: ' + (d.exception?.description || d.text) + ' @' + d.url + ':' + d.lineNumber);
    } else if (msg.method === 'Log.entryAdded') {
      consoleLog.push('LOG ' + msg.params.entry.level + ': ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
    }
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const page = {
    consoleLog,
    send: S,
    sleep,

    async viewport(w, h, scale = 1, mobile = false) {
      await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile });
    },

    async goto(url) {
      const loaded = new Promise((resolve) => {
        const l = (msg) => {
          if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') { listeners.delete(l); resolve(); }
        };
        listeners.add(l);
      });
      await S('Page.navigate', { url });
      await Promise.race([loaded, sleep(8000)]);
      await sleep(150);
    },

    /** Evaluate an expression in the page and return its (JSON-able) value. */
    async eval(expr) {
      const r = await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      }
      return r.result.value;
    },

    async shot(file, { full = false, clip } = {}) {
      const params = { format: 'png', captureBeyondViewport: full || !!clip };
      if (full) {
        const m = await S('Page.getLayoutMetrics');
        const s = m.cssContentSize || m.contentSize;
        params.clip = { x: 0, y: 0, width: Math.ceil(s.width), height: Math.ceil(s.height), scale: 1 };
      }
      if (clip) params.clip = { ...clip, scale: clip.scale || 1 };
      const { data } = await S('Page.captureScreenshot', params);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      return file;
    },

    /** A real mouse click at viewport coordinates. */
    async click(x, y) {
      await S('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await S('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await S('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },

    async clickSel(selector) {
      const box = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)});
        if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!box) throw new Error('no element for ' + selector);
      await page.click(box.x, box.y);
    },

    async key(key, code = key, keyCode = 0) {
      const base = { key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
      await S('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key.length === 1 ? key : undefined });
      await S('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },

    async close() {
      try { await send('Browser.close'); } catch (e) { /* already gone */ }
      proc.kill();
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
  };
  return page;
}
