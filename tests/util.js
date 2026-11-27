/** Shared helpers for the tests. */

import { parse } from '../js/parser.js';
import { findVariant, buildTimeline, notate, legalMoves } from '../js/state.js';
import { toIndex, toSquare, CELLS } from '../js/coords.js';
import { ownerOf, isKing, signature, WHITE, BLACK, BLOCK } from '../js/rules.js';
import { assert, rng } from './harness.js';

/** Replay `text` under the rules of `variant`. */
export function replay(variant, text) {
  const { game } = findVariant(variant);
  return buildTimeline(parse(text, game.parse), variant);
}

export const last = (timeline) => timeline.states[timeline.states.length - 1];

const order = (list) => list.slice().sort();
const words = (text) => (text ? order(text.trim().split(/\s+/)) : []);

/** The squares holding pieces of `player` (kings included), sorted by name. */
export function on(state, player) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (ownerOf(state.board[i]) === player) out.push(toSquare(i));
  return order(out);
}

export function blocksOn(state) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (state.board[i] === BLOCK) out.push(toSquare(i));
  return order(out);
}

export function kingsOn(state) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (isKing(state.board[i])) out.push(toSquare(i));
  return order(out);
}

/** Assert the whole position: { white: 'a1 b2', black: '…', blocks: '…', kings: '…' }. */
export function expectPosition(state, want, label) {
  const tag = label ? label + ' — ' : '';
  assert.same(on(state, WHITE), words(want.white), tag + 'white');
  assert.same(on(state, BLACK), words(want.black), tag + 'black');
  assert.same(blocksOn(state), words(want.blocks), tag + 'blocks');
  if (want.kings !== undefined) assert.same(kingsOn(state), words(want.kings), tag + 'Mullahs');
}

/** No ply of the timeline is flagged, and neither is the starting position. */
export function expectClean(timeline, label) {
  assert.same(timeline.warnings, [], label || 'flags');
}

/** The notes of ply `n` (0-based) mention `phrase`. */
export function expectNote(timeline, n, phrase) {
  assert.ok(timeline.plies[n], `there is no ply ${n}`);
  assert.includes(timeline.plies[n].notes, phrase, `ply ${n} (${timeline.plies[n].text})`);
}

export const idx = toIndex;
export { WHITE, BLACK };

const noop = () => {};

/** The state a game starts from when the record has no position headers. */
export function freshState(variantId) {
  const { game, rules } = findVariant(variantId);
  return game.initial(rules, { board: null, turn: null, hand: null, lost: null, notes: [] });
}

/**
 * Play up to `maxPlies` legal moves, chosen at random (or by `pick`), each
 * straight through the game's own `play`. A legal move that comes back
 * flagged, or altered, is an error right here.
 * Returns the notation of every move and every state along the way.
 */
export function playout(variantId, seed, maxPlies, pick) {
  const { game, rules } = findVariant(variantId);
  const random = rng(seed);
  let state = freshState(variantId);
  const texts = [];
  const states = [state];

  for (let n = 0; n < maxPlies && !state.over; n++) {
    const options = legalMoves(game, rules, state, true);
    if (!options.length) break;
    const mv = pick ? pick(options, state, random) : options[Math.floor(random() * options.length)];
    const notes = [];
    const res = game.play(state, mv, rules, (text) => notes.push(text), noop);
    if (notes.length) {
      throw new Error(`${variantId} seed ${seed} ply ${n}: legal move ${notate(game, mv)} was flagged: ${notes.join('; ')}`);
    }
    if (signature(res.eff) !== signature(mv)) {
      throw new Error(`${variantId} seed ${seed} ply ${n}: ${notate(game, mv)} came out as ${signature(res.eff)}, expected ${signature(mv)}`);
    }
    texts.push(notate(game, mv) + (res.next.over && res.next.over.winner === state.turn ? ' #' : ''));
    state = res.next;
    states.push(state);
  }
  return { game, rules, texts, state, states };
}

/** Lay moves out the way the book prints them: numbered rows, two columns. */
export function asRecord(texts) {
  const lines = [];
  for (let i = 0; i < texts.length; i += 2) {
    lines.push(`${i / 2 + 1}. ${texts[i]}${texts[i + 1] ? '   ' + texts[i + 1] : ''}`);
  }
  return lines.join('\n');
}
