/**
 * app.js — controller: wires the parser, the timeline and the view together.
 */

import { parse, readTags } from './parser.js';
import {
  buildTimeline, VARIANTS, DEFAULT_VARIANT, findVariant, hasVariant, variantFromTags,
  statusText, resultText, scoreline, notate
} from './state.js';
import { BoardView } from './board.js';
import { clickSequences, press, hintsFor } from './input.js';
import { samplesFor, isSample } from './sample.js';

const $ = (id) => document.getElementById(id);

const el = {
  notation: $('notation'), rules: $('rules'), example: $('example'), status: $('status'),
  motto: $('motto'), rulesName: $('rules-name'), rulesList: $('rules-list'),
  rulesBox: $('rules-box'), notationGame: $('notation-game'),
  load: $('btn-load'), sample: $('btn-sample'), clear: $('btn-clear'),
  first: $('btn-first'), prev: $('btn-prev'), play: $('btn-play'),
  next: $('btn-next'), last: $('btn-last'),
  scrub: $('scrub'), speed: $('speed'), speedOut: $('speed-out'),
  turn: $('turn-label'), stateLine: $('state-line'),
  side: [null, $('side-1'), $('side-2')],
  name: [null, $('name-1'), $('name-2')],
  count: [null, $('count-1'), $('count-2')],
  chips: [null, $('chips-1'), $('chips-2')],
  inputOn: $('input-on'), undo: $('btn-undo'), fresh: $('btn-new'), inputHint: $('input-hint'),
  commentary: $('commentary'), movelist: $('movelist'), board: $('board')
};

const view = new BoardView(el.board, { onPick: pick });
const noop = () => {};
const STORE = 'jogos21.viewer';
const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The game being shown, and the match loaded into it. */
let variantId = DEFAULT_VARIANT;
let match = buildTimeline({ moves: [], tags: [] }, variantId);
/** `cursor` is the number of plies applied: 0 … plies.length */
let cursor = 0;
let playing = false;
let timer = 0;
let rows = [];
/** Board input: the nodes clicked so far, and the click sequences of every legal move. */
let picks = [];
let sequences = null;

/* -------------------------------------------------------------- speed ---- */

/** Slider 0–100 maps to 2000 ms … 200 ms per ply. */
const stepMs = () => 2000 - Number(el.speed.value) * 18;
const animMs = () => (calm ? 0 : Math.min(450, Math.max(90, Math.round(stepMs() * 0.55))));

function showSpeed() {
  el.speedOut.textContent = (stepMs() / 1000).toFixed(1) + 's';
}

/* ---------------------------------------------------------------- game --- */

function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** Point the whole page at one entry of the Game selector. */
function setGame(id) {
  variantId = hasVariant(id) ? id : DEFAULT_VARIANT;
  const { game } = findVariant(variantId);
  el.rules.value = variantId;
  view.setGame(game);

  for (const p of [1, 2]) el.name[p].textContent = game.roles[p].pt;

  el.motto.textContent = '';
  el.motto.append(node('b', '', `Capítulo ${game.chapter}`), ` · ${game.motto} · jogo de ${game.family}`);

  el.rulesName.textContent = game.name;
  el.rulesList.textContent = '';
  for (const line of game.rules) el.rulesList.appendChild(node('li', '', line));

  el.notationGame.textContent = '';
  for (const [example, meaning] of game.notation) {
    const li = node('li');
    li.append(node('code', '', example), ' — ' + meaning);
    el.notationGame.appendChild(li);
  }

  el.example.textContent = '';
  const samples = samplesFor(variantId);
  samples.forEach((s, i) => {
    const opt = node('option', '', s.title);
    opt.value = String(i);
    el.example.appendChild(opt);
  });
  el.example.disabled = el.sample.disabled = samples.length === 0;
}

const currentSample = () => samplesFor(variantId)[Number(el.example.value) || 0] || null;

/* --------------------------------------------------------------- load ---- */

/**
 * Parse and replay `text`.
 *   opts.detect   let the record's own [Jogo "…"] header choose the game
 *   opts.atEnd    show the last position instead of the first
 *   opts.animate  with atEnd: animate the last move into place
 */
function load(text, opts) {
  const o = opts || {};
  stop();
  picks = [];
  sequences = null;

  const named = variantFromTags(readTags(text));
  let aside = '';
  if (named && named !== variantId) {
    if (o.detect) setGame(named);
    else aside = ` · the record is headed ${findVariant(named).rules.label}`;
  }

  const { game } = findVariant(variantId);
  const parsed = parse(text, game.parse);
  match = buildTimeline(parsed, variantId);
  match.warnings = parsed.warnings.concat(match.warnings);

  buildMoveList();
  const total = match.plies.length;
  el.scrub.max = String(total);

  cursor = o.atEnd ? total : 0;
  if (o.atEnd && o.animate && total) {
    cursor = total - 1;
    view.show(match.states[cursor].board);
    seek(total, true);
  } else {
    view.show(match.states[cursor].board);
    view.highlight(cursor > 0 ? match.plies[cursor - 1].fx : null);
    refresh();
  }

  const flagged = match.plies.filter((p) => p.notes.length).length + match.setupNotes.length;
  if (!total) {
    const problem = parsed.warnings[0] || match.setupNotes[0];
    setStatus(problem || (text.trim() ? 'No moves in the record — the board shows the starting position.'
                                      : 'Nothing to play — paste a match history first.') + aside,
              problem ? 'err' : '');
  } else {
    setStatus(`${total} move${total === 1 ? '' : 's'} loaded` +
              (flagged ? ` · ${flagged} flagged (see the move list)` : '') + aside,
              flagged ? '' : 'ok');
  }
  remember();
}

function setStatus(text, kind) {
  el.status.textContent = text;
  el.status.className = 'status' + (kind ? ' ' + kind : '');
}

function loadSample() {
  const sample = currentSample();
  if (!sample) return;
  el.notation.value = sample.text;
  load(el.notation.value);
}

/** Keep the game, the record and the settings across a reload of the page. */
function remember() {
  try {
    localStorage.setItem(STORE, JSON.stringify({
      game: variantId, text: el.notation.value, speed: el.speed.value, input: el.inputOn.checked
    }));
  } catch (e) { /* private mode, storage full: not worth a message */ }
}

function recall() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    return saved && typeof saved.text === 'string' && hasVariant(saved.game) ? saved : null;
  } catch (e) {
    return null;
  }
}

/* ---------------------------------------------------------- move list ---- */

function buildMoveList() {
  const frag = document.createDocumentFragment();
  rows = match.plies.map((ply, i) => {
    const li = document.createElement('li');
    li.dataset.ply = String(i);
    li.id = 'ply-' + i;

    const no = node('span', 'no', ply.opensRow ? ply.turn + (ply.col ? '…' : '.') : '');
    const pc = node('span', 'pc p' + ply.player);
    if (ply.omitted) pc.classList.add('void');

    const mv = node('span', 'mv', ply.text);
    const badge = (cls, glyph, title) => {
      const b = node('span', cls, '  ' + glyph);
      b.title = title;
      mv.appendChild(b);
    };
    if (ply.notes.length) badge('warn', '⚠', ply.notes.join('; '));
    if (ply.infos.length) badge('info', 'ℹ', ply.infos.join('; '));
    if (ply.comment) badge('cm', '💬', ply.comment);
    if (ply.result) badge('end', '■', resultText(match.game, ply.result));

    li.append(no, pc, mv);
    frag.appendChild(li);
    return li;
  });

  el.movelist.textContent = '';
  el.movelist.appendChild(frag);
}

/* ------------------------------------------------------------ playback --- */

function seek(target, animate) {
  const max = match.plies.length;
  const next = Math.max(0, Math.min(max, target));
  if (next === cursor) { refresh(); return; }

  const oneStep = Math.abs(next - cursor) === 1;
  if (animate && oneStep && animMs() > 0) {
    const dir = next > cursor ? 1 : -1;
    const ply = match.plies[dir > 0 ? cursor : cursor - 1];
    view.play(ply.fx, match.states[next].board, dir, animMs());
  } else {
    view.show(match.states[next].board);
  }
  view.highlight(next > 0 ? match.plies[next - 1].fx : null);
  cursor = next;
  picks = [];
  refresh();
}

function step(delta, animate) {
  seek(cursor + delta, animate !== false);
}

function play() {
  if (!match.plies.length) return;
  if (cursor >= match.plies.length) seek(0, false);      // at the end: start over
  playing = true;
  el.play.innerHTML = '&#10074;&#10074; Pause';
  timer = setTimeout(tick, cursor === 0 ? 350 : 0);
}

function tick() {
  if (!playing) return;
  step(1);
  if (cursor >= match.plies.length) { stop(); return; }
  timer = setTimeout(tick, stepMs());
}

function stop() {
  const was = playing;
  playing = false;
  if (timer) { clearTimeout(timer); timer = 0; }
  el.play.innerHTML = '&#9654; Play';
  if (was) refresh();
}

/* -------------------------------------------------------------- render --- */

function refresh() {
  const total = match.plies.length;
  const ply = cursor > 0 ? match.plies[cursor - 1] : null;
  const state = match.states[cursor];
  const game = match.game;

  el.scrub.value = String(cursor);
  el.turn.textContent = total ? `Ply ${cursor} / ${total}` : 'Ply 0';

  // scoreline
  const score = scoreline(game, state);
  for (const p of [1, 2]) {
    el.count[p].textContent = score.main[p];
    el.chips[p].textContent = '';
    for (const chip of score.chips[p]) {
      const c = node('span', 'chip', chip.label + ' ');
      c.appendChild(node('b', '', chip.value));
      el.chips[p].appendChild(c);
    }
    el.side[p].classList.toggle('active', !state.over && state.turn === p);
    el.side[p].classList.toggle('winner', !!state.over && state.over.winner === p);
  }

  el.stateLine.textContent = statusText(game, state);
  el.stateLine.className = 'state-line' + (state.over ? (state.over.winner ? ' over' : ' draw') : '');

  // what the result rests on: the row, the rows that scored, the side filled
  const marks = [];
  if (state.over) {
    if (state.over.line) marks.push({ kind: 'line', cells: state.over.line });
    for (const row of state.over.lines || []) marks.push({ kind: 'line', cells: row.cells, side: row.player });
    for (const index of state.over.cells || []) marks.push({ kind: 'ring', index });
  }
  view.setOverlay(marks);

  // active row
  for (const li of rows) li.classList.remove('active');
  if (ply) {
    const li = rows[cursor - 1];
    li.classList.add('active');
    scrollIntoList(li);
    el.movelist.setAttribute('aria-activedescendant', li.id);
  } else {
    el.movelist.removeAttribute('aria-activedescendant');
    el.movelist.scrollTop = 0;
  }

  // commentary
  el.commentary.textContent = '';
  const say = (cls, text) => el.commentary.appendChild(node('p', cls, text));
  if (!ply) {
    say('muted', total ? 'Start of the match. Press Play or use the arrow keys.'
      : el.inputOn.checked ? 'No moves yet — click the board to play the first one.' : 'No match loaded.');
    if (match.setupNotes.length) say('warn', '⚠ ' + match.setupNotes.join('; '));
    if (state.over) say('end', resultText(game, state.over));
  } else {
    const role = game.roles[ply.player];
    const what = ply.kind === 'omitted' ? 'move not recorded' : ply.kind === 'pass' ? 'no move' : ply.text;
    say('who', `Turn ${ply.turn} · ${role.en} · ${what}`);
    say(ply.comment ? '' : 'muted', ply.comment || 'No comment for this turn.');
    if (ply.result) say('end', resultText(game, ply.result));
    else if (ply.mark === '#') say('who', `# — recorded as the move that wins for ${role.en}.`);
    if (ply.notes.length) say('warn', '⚠ ' + ply.notes.join('; '));
    if (ply.infos.length) say('info', 'ℹ ' + ply.infos.join('; '));
  }

  el.first.disabled = el.prev.disabled = cursor === 0;
  el.last.disabled = el.next.disabled = cursor >= total;
  el.play.disabled = total === 0;
  el.undo.disabled = total === 0;

  showInput();
}

function scrollIntoList(li) {
  const box = el.movelist;
  const top = li.offsetTop - box.offsetTop;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (top + li.offsetHeight > box.scrollTop + box.clientHeight) {
    box.scrollTop = top + li.offsetHeight - box.clientHeight;
  }
}

/* --------------------------------------------------------- board input --- */

/** What the hint line asks for, by the kind of click expected next. */
const ASK = {
  'place': 'click a free position to place a piece',
  'place-or-move': 'click a free position to place a piece, or one of your pieces to move it',
  'pick': 'click the piece to move',
  'go': 'click where it goes',
  'take': 'click the piece to take'
};

function showInput() {
  const on = el.inputOn.checked;
  el.inputHint.hidden = !on;
  view.setInput(false);
  view.setHints([]);
  if (!on) return;

  const state = match.states[cursor];
  if (cursor < match.plies.length) {
    el.inputHint.textContent = 'Go to the last move (End) to continue the match from there.';
    return;
  }
  if (state.over) {
    el.inputHint.textContent = 'The match is over — “Undo move” takes the last move back, “New match” starts again.';
    return;
  }

  if (!sequences) sequences = clickSequences(match.game, match.rules, state);
  const who = match.game.roles[state.turn].en;
  if (!sequences.length) {
    el.inputHint.textContent = `${who}: no legal move in this position.`;
    return;
  }

  const { hints, ask, ends, step } = hintsFor(sequences, picks, state.board);
  view.setHints(hints);
  view.setInput(true);

  // A game may word its own clicks ("where the block lands" in Amazonas).
  const own = ask === 'go' && match.game.clicks && match.game.clicks[step];
  el.inputHint.textContent = `${who}: ${own || ASK[ask]}` +
    (ends && step > 1 ? ' — or click the piece again to stop here' : '') + '.';
}

/** A node of the board was clicked. */
function pick(index) {
  if (!el.inputOn.checked) return;
  if (playing) stop();
  const state = match.states[cursor];
  if (cursor < match.plies.length || state.over) { showInput(); return; }
  if (!sequences) sequences = clickSequences(match.game, match.rules, state);

  const result = press(sequences, picks, index);
  picks = result.clicks;
  if (result.move) commit(result.move);
  else showInput();
}

/** Write the move at the end of the record, the way the book lays records out. */
function commit(mv) {
  const state = match.states[match.states.length - 1];
  const res = match.game.play(state, mv, match.rules, noop, noop);
  let text = notate(match.game, mv);
  if (res.next.over && res.next.over.winner === state.turn) text += ' #';

  const raw = el.notation.value.replace(/\s+$/, '');
  const last = match.plies[match.plies.length - 1];
  const col = state.turn === match.first ? 0 : 1;
  const newRow = !last || col <= last.col;
  const row = (last ? last.turn : 0) + (newRow ? 1 : 0);

  let out;
  if (!newRow && last.end >= raw.length) out = raw + '   ' + text;
  else out = raw + (raw ? '\n' : '') + row + (col ? '... ' : '. ') + text;
  el.notation.value = out + '\n';
  el.notation.scrollTop = el.notation.scrollHeight;
  load(el.notation.value, { atEnd: true, animate: true });
}

/** Take the last move out of the record. */
function undoMove() {
  const last = match.plies[match.plies.length - 1];
  if (!last) return;
  const raw = el.notation.value;
  const head = raw.slice(0, last.start)
    .replace(/[ \t]+$/, '')
    .replace(/(^|\s)\d+[ \t]*\.+[ \t]*$/, '$1')           // a move number left dangling
    .replace(/\s+$/, '');
  const tail = raw.slice(last.end).replace(/^\s+/, '').replace(/\s+$/, '');
  el.notation.value = head + (head && tail ? '\n' : '') + tail + (head || tail ? '\n' : '');
  load(el.notation.value, { atEnd: true });
}

/** An empty record for the current game, ready to be played on the board. */
function newMatch() {
  el.notation.value = `[Jogo "${match.rules.label}"]\n\n`;
  el.inputOn.checked = true;
  load(el.notation.value);
  setStatus('New match — click the board to play.', '');
}

/* --------------------------------------------------------------- wiring -- */

el.load.addEventListener('click', () => load(el.notation.value, { detect: true }));
el.sample.addEventListener('click', loadSample);
el.example.addEventListener('change', loadSample);
el.clear.addEventListener('click', () => {
  el.notation.value = '';
  load('');
  setStatus('Cleared — the board is back to the opening position.', '');
});

el.rules.addEventListener('change', () => {
  const before = match.game;
  const pristine = !el.notation.value.trim() || isSample(el.notation.value);
  setGame(el.rules.value);
  // Another game altogether: an untouched example makes way for one of the
  // new game. Anything typed in stays, and is replayed under the new rules.
  if (findVariant(variantId).game !== before && pristine && currentSample()) loadSample();
  else load(el.notation.value);
});

el.first.addEventListener('click', () => { stop(); seek(0, false); });
el.last.addEventListener('click', () => { stop(); seek(match.plies.length, false); });
el.prev.addEventListener('click', () => { stop(); step(-1); });
el.next.addEventListener('click', () => { stop(); step(1); });
el.play.addEventListener('click', () => (playing ? stop() : play()));

el.scrub.addEventListener('input', () => { stop(); seek(Number(el.scrub.value), false); });
el.speed.addEventListener('input', () => { showSpeed(); remember(); });

el.inputOn.addEventListener('change', () => { picks = []; refresh(); remember(); });
el.undo.addEventListener('click', undoMove);
el.fresh.addEventListener('click', newMatch);

document.addEventListener('keydown', (e) => {
  const t = e.target;
  const tag = t && t.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  // Space and Enter on a button or a summary belong to that control — except
  // Space on the transport buttons, which stays Play / Pause as it always was.
  const transport = tag === 'BUTTON' && t.closest('.controls');
  if ((e.key === ' ' || e.key === 'Enter') && (tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A') &&
      !(e.key === ' ' && transport)) return;
  const inList = t === el.movelist;
  switch (e.key) {
    case 'ArrowLeft':  stop(); step(-1); break;
    case 'ArrowRight': stop(); step(1); break;
    case 'ArrowUp':    if (!inList) return; stop(); step(-1); break;
    case 'ArrowDown':  if (!inList) return; stop(); step(1); break;
    case 'Home':       stop(); seek(0, false); break;
    case 'End':        stop(); seek(match.plies.length, false); break;
    case ' ':          playing ? stop() : play(); break;
    case 'Escape':     if (!picks.length) return; picks = []; showInput(); break;
    default: return;
  }
  e.preventDefault();
});

// Some browsers press a focused button when Space is released, whatever
// keydown decided; on the transport buttons Space has already been used.
document.addEventListener('keyup', (e) => {
  const t = e.target;
  if (e.key === ' ' && t && t.tagName === 'BUTTON' && t.closest('.controls')) e.preventDefault();
});

el.movelist.addEventListener('click', (e) => {
  let li = e.target;
  while (li && li !== el.movelist && !(li.dataset && li.dataset.ply)) li = li.parentNode;
  if (!li || li === el.movelist) return;
  stop();
  seek(Number(li.dataset.ply) + 1, true);
});

/* ----------------------------------------------------------------- boot -- */

for (const v of VARIANTS) {
  const opt = node('option', '', `Ch. ${v.chapter} · ${v.label}`);
  opt.value = v.id;
  el.rules.appendChild(opt);
}

// On a narrow screen the rules start folded, so the board is not pushed away.
if (typeof matchMedia === 'function' && matchMedia('(max-width: 1080px)').matches) el.rulesBox.open = false;

// `#fetaix` (or `#game=fetaix`) opens a game directly; otherwise pick up
// where the last visit stopped, or show the first example.
const asked = decodeURIComponent(location.hash.replace(/^#(game=)?/, ''));
const saved = recall();
if (hasVariant(asked)) {
  setGame(asked);
  loadSample();
} else if (saved) {
  el.speed.value = saved.speed || el.speed.value;
  el.inputOn.checked = !!saved.input;
  setGame(saved.game);
  el.notation.value = saved.text;
  load(saved.text);
} else {
  setGame(DEFAULT_VARIANT);
  loadSample();
}
showSpeed();
window.__VIEWER_READY = true;
