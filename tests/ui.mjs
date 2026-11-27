/**
 * ui.mjs — the page itself, driven in a real (headless) browser.
 *
 *     node tests/ui.mjs                  everything
 *     node tests/ui.mjs --only seega     one game
 *     node tests/ui.mjs --shots out/     also save a screenshot per game
 *
 * What it does, for every entry of the Game selector:
 *   · opens the page on that game and checks that its demo loads without a
 *     flag and without a console error, and that the pieces drawn at the end
 *     are the pieces the engine says are there;
 *   · starts a new match and plays it with real mouse clicks on the board,
 *     comparing the record the page writes with the engine's own, move by
 *     move, then takes the last move back with “Undo move”.
 * Plus the keyboard, the layout at three widths, and the unit tests in the
 * browser.
 *
 * Needs Chrome or Chromium; without one it says so and exits successfully.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, serve, findChrome } from './browser.mjs';
import { rng } from './harness.js';
import { parse } from '../js/parser.js';
import { VARIANTS, findVariant, buildTimeline, legalMoves, notate } from '../js/state.js';
import { samplesFor } from '../js/sample.js';
import { clickSequences, clicksFor, clicksInEffect } from '../js/input.js';
import { nodeAt } from '../js/board.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf('--' + name); return i === -1 ? null : argv[i + 1]; };
const only = arg('only');
const shots = arg('shots') ? path.resolve(arg('shots')) : null;

if (!findChrome()) {
  console.log('SKIPPED — no Chrome or Chromium found (set CHROME=/path/to/browser to run the UI tests).');
  process.exit(0);
}
if (shots) fs.mkdirSync(shots, { recursive: true });

const { server, port } = await serve(ROOT);
const page = await launch({ width: 1400, height: 900 });
const base = `http://127.0.0.1:${port}/`;
const KEY = { ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35, ' ': 32 };

let passed = 0;
const failures = [];
function check(ok, what) {
  if (ok) { passed++; return; }
  failures.push(what);
  console.log('\x1b[31m  ✗ ' + what + '\x1b[0m');
}
const text = (id) => page.eval(`document.getElementById(${JSON.stringify(id)}).textContent`);
const noop = () => {};

async function open(hash) {
  await page.goto('about:blank');
  await page.goto(base + 'index.html' + (hash ? '#' + hash : ''));
}

async function clickNode(index) {
  const p = nodeAt(index);
  const at = await page.eval(`(() => { const b = document.getElementById('board'); b.scrollIntoView({ block: 'center' });
    const r = b.getBoundingClientRect(); return { x: r.left + r.width * ${p.x}, y: r.top + r.height * ${p.y} }; })()`);
  await page.click(at.x, at.y);
}

const piecesOn = (state) => Array.from(state.board).filter((c) => c !== 0).length;
const drawn = () => page.eval(`document.querySelectorAll('#board .piece:not(.leaving)').length`);

try {
  /* ---------------------------------------------------- unit tests ---- */
  console.log('unit tests in the browser');
  await page.goto(base + 'tests/index.html');
  let unit = null;
  for (let i = 0; i < 200 && !unit; i++) { await page.sleep(100); unit = await page.eval('window.__TESTS || null'); }
  check(unit && unit.failed === 0 && unit.passed > 300, `tests/index.html: ${JSON.stringify(unit)}`);

  /* ------------------------------------------------------ first boot -- */
  console.log('first visit');
  await open('');
  await page.eval('localStorage.clear()');
  await open('');
  check(await text('status') === '13 moves loaded', 'the page opens on the Alquerque demo: ' + await text('status'));
  check(await page.eval(`document.getElementById('rules').options.length`) === VARIANTS.length, 'one option per variant');
  check(await page.eval('document.title') === '21 Jogos — Match Viewer', 'title');

  /* ---------------------------------------------------------- keyboard */
  console.log('keyboard');
  const key = (k) => page.key(k, k === ' ' ? 'Space' : k, KEY[k]);
  await page.eval('document.body.focus(); document.activeElement.blur()');
  await key('ArrowRight'); check(await text('turn-label') === 'Ply 1 / 13', '→ steps forward');
  await key('End');        check(await text('turn-label') === 'Ply 13 / 13', 'End goes to the last move');
  await key('ArrowLeft');  check(await text('turn-label') === 'Ply 12 / 13', '← steps back');
  await key('Home');       check(await text('turn-label') === 'Ply 0 / 13', 'Home goes to the start');
  await key(' ');          check((await text('btn-play')).includes('Pause'), 'Space starts playback');
  await key(' ');          check((await text('btn-play')).includes('Play'), 'Space pauses it');
  await page.eval(`document.getElementById('btn-play').focus()`);
  await key(' ');
  check((await text('btn-play')).includes('Pause'), 'Space on the focused Play button toggles once, not twice');
  await key(' ');
  await page.clickSel('#btn-next');
  await key(' ');
  check((await text('btn-play')).includes('Pause') , 'Space after clicking Next is still Play / Pause');
  await key(' ');
  await page.eval(`document.getElementById('btn-clear').focus()`);
  await key(' ');
  check((await text('status')).startsWith('Cleared'), 'Space on any other focused button presses that button');
  await page.clickSel('#btn-sample');
  await key('End'); await page.clickSel('#btn-play'); await page.sleep(500);
  check((await text('turn-label')) !== 'Ply 13 / 13', 'Play at the end starts over');
  await page.clickSel('#btn-play');

  /* ------------------------------------------------------------ layout */
  console.log('layout');
  for (const [w, h] of [[1400, 900], [1000, 800], [390, 844]]) {
    await page.viewport(w, h);
    await open('seega');
    const m = await page.eval(`(() => { const b = document.getElementById('board').getBoundingClientRect();
      return { bw: b.width, bh: b.height, sw: document.documentElement.scrollWidth, iw: window.innerWidth }; })()`);
    check(Math.abs(m.bw - m.bh) < 1, `the board is square at ${w}px (${m.bw} × ${m.bh})`);
    check(m.sw <= m.iw, `no sideways scrolling at ${w}px (${m.sw} > ${m.iw})`);
    if (shots) await page.shot(path.join(shots, `layout-${w}.png`), { full: true });
  }
  await page.viewport(1400, 900);

  /* --------------------------------------------------------- selector */
  console.log('selector and buttons');
  await open('alquerque');
  await page.eval(`(() => { const s = document.getElementById('rules'); s.value = 'seega'; s.dispatchEvent(new Event('change')); })()`);
  check((await page.eval(`document.getElementById('notation').value`)).includes('[Jogo "Seega"]'), 'choosing a game brings its demo');
  await page.eval(`(() => { const s = document.getElementById('rules'); s.value = 'fetaix'; s.dispatchEvent(new Event('change')); })()`);
  await page.eval(`(() => { const s = document.getElementById('rules'); s.value = 'alquerque'; s.dispatchEvent(new Event('change')); })()`);
  check((await page.eval(`document.getElementById('notation').value`)).includes('[Jogo "Fetaix"]'), 'another stage of the same game replays the same record');
  check((await text('status')).includes('the record is headed Fetaix'), 'and says so: ' + await text('status'));
  await page.clickSel('#btn-load');
  check(await page.eval(`document.getElementById('rules').value`) === 'fetaix', 'Load match follows the record’s own header');
  await page.clickSel('#btn-clear');
  check((await text('status')).startsWith('Cleared'), 'Clear');
  check(await drawn() === 24, 'Clear shows the opening position');
  await page.eval(`(() => { const s = document.getElementById('rules'); s.value = 'tonkin'; s.dispatchEvent(new Event('change'));
    const e = document.getElementById('example'); e.value = '1'; e.dispatchEvent(new Event('change')); })()`);
  check(await page.eval(`document.querySelectorAll('#movelist .warn').length`) === 4, 'the misprinted Tonkin record shows its four flags');

  /* ---------------------------------------------- every game: demo --- */
  for (const v of VARIANTS) {
    if (only && v.id !== only && v.game !== only) continue;
    console.log(`${v.chapter} · ${v.label}`);
    const { game, rules } = findVariant(v.id);
    const before = page.consoleLog.length;

    await open(v.id);
    const demo = buildTimeline(parse(samplesFor(v.id)[0].text, game.parse), v.id);
    const n = demo.plies.length;
    check(await text('status') === `${n} moves loaded`, `${v.id}: demo status — ${await text('status')}`);
    check(await drawn() === piecesOn(demo.states[0]), `${v.id}: pieces at the start`);
    await page.clickSel('#btn-next'); await page.sleep(40);
    await page.clickSel('#btn-last'); await page.sleep(40);
    check(await text('turn-label') === `Ply ${n} / ${n}`, `${v.id}: Last`);
    check(await drawn() === piecesOn(demo.states[n]), `${v.id}: pieces at the end (${await drawn()} drawn)`);
    if (shots) { await page.sleep(500); await page.shot(path.join(shots, `${String(v.chapter).padStart(2, '0')}-${v.id}.png`)); }

    /* -------------------------------------- every game: mouse play --- */
    await page.clickSel('#btn-new');
    const random = rng(v.chapter * 97 + 5);
    let state = game.initial(rules, { board: null, turn: null, hand: null, lost: null, notes: [] });
    let previous = null;
    let moves = 0;
    for (; moves < 16 && !state.over; moves++) {
      const options = legalMoves(game, rules, state, false);
      if (!options.length) break;
      const mv = options[Math.floor(random() * options.length)];
      const sequences = clickSequences(game, rules, state);
      let clicks = clicksFor(sequences, mv);
      if (clicksInEffect(sequences, []).length) clicks = clicks.slice(1);   // the lone piece is already chosen
      for (const index of clicks) { await clickNode(index); await page.sleep(15); }

      previous = state;
      state = game.play(state, mv, rules, noop, noop).next;
      const record = await page.eval(`document.getElementById('notation').value`);
      const t = buildTimeline(parse(record, game.parse), v.id);
      const end = t.states[t.states.length - 1];
      const same = t.plies.length === moves + 1 && end.board.join() === state.board.join() && end.turn === state.turn;
      if (!same || t.warnings.length) {
        check(false, `${v.id}: move ${moves + 1} (${notate(game, mv)}) by mouse — record:\n${record}\n${t.warnings.join('; ')}`);
        break;
      }
      passed++;
    }
    check(moves > 0, `${v.id}: at least one move was played with the mouse`);
    check(await text('turn-label') === `Ply ${moves} / ${moves}`, `${v.id}: the page is on the last move — ${await text('turn-label')}`);
    if (shots) { await page.sleep(600); await page.shot(path.join(shots, `${String(v.chapter).padStart(2, '0')}-${v.id}-play.png`)); }

    await page.clickSel('#btn-undo'); await page.sleep(30);
    const record = await page.eval(`document.getElementById('notation').value`);
    const t = buildTimeline(parse(record, game.parse), v.id);
    check(t.plies.length === moves - 1 && t.states[t.states.length - 1].board.join() === previous.board.join(),
      `${v.id}: Undo move takes exactly the last move back`);

    const noise = page.consoleLog.slice(before).filter((l) => !/favicon/.test(l));
    check(noise.length === 0, `${v.id}: console — ${noise.join(' | ')}`);
  }
} finally {
  await page.close();
  server.close();
}

console.log(`\n${passed} checks passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
