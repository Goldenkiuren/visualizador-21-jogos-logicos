/**
 * selfplay.mjs — a small engine that plays any of the 21 games against
 * itself and prints the match in the book's notation.
 *
 * It is how the demo matches in js/sample.js were produced: a shallow
 * minimax over each game's own `legalMoves` and `play`, with mandatory
 * captures honoured, so that whatever it prints is legal by construction.
 * It is not a strong player and is not used by the viewer.
 *
 *   node tools/selfplay.mjs <game> [options]
 *
 *   <game>            an id from the Game selector: alquerque, fetaix, seega…
 *   --seed N          which match to play (default 1); same seed, same match
 *   --depth D         plies of look-ahead (default 2); W/B gives each colour
 *                     its own, e.g. 3/1 lets white out-think black
 *   --max N           stop after N plies (default 120)
 *   --from "record"   start from these moves instead of the opening position
 *   --scan N          instead of one match, summarise seeds 1…N
 *   --min N           with --scan: only matches of at least N plies
 *   --facts           also list what the viewer says about each ply
 */

import { findVariant, hasVariant, legalMoves, notate, buildTimeline, resultText, VARIANTS } from '../js/state.js';
import { parse } from '../js/parser.js';
import { ownerOf, maximalRuns, freeNeighbours } from '../js/rules.js';
import { colOf, rowOf, BOARD_LINES, GRID_LINES } from '../js/coords.js';

/* ----------------------------------------------------------- arguments -- */

const argv = process.argv.slice(2);
const variant = argv[0];
const flag = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? fallback : (argv[i + 1] === undefined || argv[i + 1].startsWith('--') ? true : argv[i + 1]);
};

if (!variant || !hasVariant(variant)) {
  console.error('usage: node tools/selfplay.mjs <game> [--seed N] [--depth D|W/B] [--max N] [--from "…"] [--scan N] [--min N] [--facts]');
  console.error('games: ' + VARIANTS.map((v) => v.id).join(' '));
  process.exit(2);
}

const { game, rules } = findVariant(variant);
const depths = String(flag('depth', '2')).split('/').map(Number);
const DEPTH = [0, depths[0] || 2, depths[1] || depths[0] || 2];
const MAX = Number(flag('max', 120));
const FROM = flag('from', '');
const noop = () => {};
const other = (p) => 3 - p;

/** A small seeded generator: the same seed always plays the same match. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------- evaluation -- */

const flip = (s) => Object.assign({}, s, { turn: other(s.turn) });
const mobility = (s, p) => game.legalMoves(s.turn === p ? s : flip(s), rules).length;
const cheb = (a, b) => Math.max(Math.abs(colOf(a) - colOf(b)), Math.abs(rowOf(a) - rowOf(b)));

/** Rows of pieces, squared, white minus black. */
function rows(s, lines) {
  let v = 0;
  for (const r of maximalRuns(s.board, lines)) v += (r.player === 1 ? 1 : -1) * r.cells.length * r.cells.length;
  return v;
}

/** How far each side's pieces have travelled towards the other side. */
function advance(s, weigh) {
  let v = 0;
  for (let i = 0; i < 25; i++) {
    const o = ownerOf(s.board[i]);
    if (o === 1) v += weigh(colOf(i), rowOf(i));
    else if (o === 2) v -= weigh(4 - colOf(i), 4 - rowOf(i));
  }
  return v;
}

/** What a position is worth to WHITE when nobody has won yet. */
const WORTH = {
  material: (s) => (s.lost[2] - s.lost[1]) * 10,
  velha4: (s) => rows(s),
  tsoro: (s) => rows(s),
  tictackle: (s) => rows(s, GRID_LINES),
  quadra: (s) => rows(s) + (s.ext.pairs[1] - s.ext.pairs[2]) * 40,
  dara: (s) => (s.lost[2] - s.lost[1]) * 30 + rows(s) * 0.3,
  pahtum: (s) => s.ext.score[1] - s.ext.score[2] + rows(s) * 0.2,
  tonkin: (s) => {                                       // lines one side could still fill
    let v = 0;
    for (const line of BOARD_LINES) {
      let w = 0, b = 0;
      for (const i of line) { const o = ownerOf(s.board[i]); if (o === 1) w++; else if (o === 2) b++; }
      if (!b) v += w * w * (5 / line.length);
      if (!w) v -= b * b * (5 / line.length);
    }
    return v;
  },
  fivefield: (s) => advance(s, (c, r) => r),
  halma: (s) => advance(s, (c, r) => c + r),
  rastros: (s) => { const at = s.board.indexOf(1); return at < 0 ? 0 : cheb(at, 0) - cheb(at, 24); },
  amazonas: (s) => {
    let v = 0;
    for (let i = 0; i < 25; i++) { const o = ownerOf(s.board[i]); if (o) v += (o === 1 ? 1 : -1) * freeNeighbours(s.board, i).length; }
    return v;
  },
  // the hunts: white is the prey in all four
  raposa: (s) => { const fox = s.board.indexOf(2); return fox < 0 ? 0 : rowOf(fox) * 4 - mobility(s, 2); },
  coiote: hunted,
  baghchal: hunted,
  tigres: hunted
};

/** Prey's view of a hunt: stay alive, stay out of reach, leave the hunter little room. */
function hunted(s) {
  const moves = game.legalMoves(s.turn === 2 ? s : flip(s), rules);
  const threats = new Set();
  for (const m of moves) for (const c of m.caps) threats.add(c);
  return -s.lost[1] * 25 - threats.size * 6 - moves.length;
}
const worth = WORTH[game.id] || WORTH.material;

function value(s, me, ply) {
  if (s.over) return s.over.winner === 0 ? 0 : (s.over.winner === me ? 1 : -1) * (100000 - ply);
  return me === 1 ? worth(s) : -worth(s);
}

/* -------------------------------------------------------------- search -- */

/** The moves worth looking at: mandatory captures only, and never too many. */
function options(s, limit) {
  const list = legalMoves(game, rules, s, true);
  if (list.length <= limit) return list;
  const out = [];
  for (let k = 0; k < limit; k++) out.push(list[Math.floor(k * list.length / limit)]);
  return out;
}

function negamax(s, depth, alpha, beta, ply) {
  if (s.over || depth <= 0) return value(s, s.turn, ply);
  const list = options(s, 60);
  if (!list.length) return value(s, s.turn, ply);
  let best = -Infinity;
  for (const mv of list) {
    const next = game.play(s, mv, rules, noop, noop).next;
    // In Seega the same side may move twice running, so the sign follows the turn.
    const v = next.turn === s.turn ? negamax(next, depth - 1, alpha, beta, ply + 1)
                                   : -negamax(next, depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function playMatch(seed) {
  const random = rng(seed);
  let s = game.initial(rules, { board: null, turn: null, hand: null, lost: null, notes: [] });
  const texts = [];

  if (FROM) {
    const t = buildTimeline(parse(FROM, game.parse), variant);
    if (t.warnings.length) throw new Error('--from is not a clean record: ' + t.warnings.join('; '));
    for (const p of t.plies) texts.push(p.text);
    s = t.states[t.states.length - 1];
  }

  for (let n = texts.length; n < MAX && !s.over; n++) {
    const list = options(s, 90);
    if (!list.length) break;
    let pick = null, best = -Infinity;
    for (const mv of list) {
      const next = game.play(s, mv, rules, noop, noop).next;
      const d = DEPTH[s.turn] - 1;
      let v = next.turn === s.turn ? negamax(next, d, -Infinity, Infinity, n + 1)
                                   : -negamax(next, d, -Infinity, Infinity, n + 1);
      v += random() * 0.9;                              // equal moves: let the seed choose
      if (v > best) { best = v; pick = mv; }
    }
    const res = game.play(s, pick, rules, noop, noop);
    texts.push(notate(game, pick) + (res.next.over && res.next.over.winner === s.turn ? ' #' : ''));
    s = res.next;
  }
  return { texts, end: s };
}

/* -------------------------------------------------------------- output -- */

/** Numbered rows, the side that starts in the first column — as the book prints records. */
function layout(texts) {
  const timeline = buildTimeline(parse(texts.join('\n'), game.parse), variant);
  if (timeline.warnings.length) throw new Error('the engine produced a flagged record: ' + timeline.warnings.join('; '));
  const lines = [];
  timeline.plies.forEach((p, i) => {
    if (p.opensRow) lines.push({ turn: p.turn, cells: ['', ''] });
    lines[lines.length - 1].cells[p.col] = texts[i];
  });
  const width = Math.max(...lines.map((l) => l.cells[0].length));
  const text = lines.map((l) => (l.cells[0]
    ? `${l.turn}. ${l.cells[0].padEnd(width)}   ${l.cells[1]}`.trimEnd()
    : `${l.turn}... ${l.cells[1]}`)).join('\n');
  return { timeline, text };
}

if (flag('scan', false)) {
  const min = Number(flag('min', 0));
  for (let seed = 1; seed <= Number(flag('scan')); seed++) {
    const { texts, end } = playMatch(seed);
    if (texts.length < min) continue;
    const chains = texts.filter((t) => (t.match(/ - /g) || []).length >= 2).length;
    console.log(`seed ${String(seed).padStart(3)}  ${String(texts.length).padStart(3)} plies  ` +
      `captured ${end.lost[2]}:${end.lost[1]}  chains ${chains}  ` +
      (end.over ? resultText(game, end.over) : '(unfinished)'));
  }
} else {
  const { texts, end } = playMatch(Number(flag('seed', 1)));
  const { timeline, text } = layout(texts);
  console.log(`[Jogo "${rules.label}"]\n`);
  console.log(text);
  console.log(`\n; ${end.over ? resultText(game, end.over) : 'unfinished after ' + texts.length + ' plies'}`);
  if (flag('facts', false)) {
    console.log();
    timeline.plies.forEach((p, i) => {
      const bits = p.infos.slice();
      if (timeline.states[i].phase !== timeline.states[i + 1].phase) bits.push('phase: ' + timeline.states[i + 1].phase);
      if (p.result) bits.push('RESULT ' + resultText(game, p.result));
      if (bits.length) console.log(`; ${p.turn}${p.col ? '…' : '.'} ${p.text}: ${bits.join(' | ')}`);
    });
  }
}
