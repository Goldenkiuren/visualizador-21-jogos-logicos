/**
 * Chapter 21 — Tigres e Vacas: com espaço para saltar e capturar.
 *
 * A hunt game: two tigers (black, b3 and d3) against thirteen cows (white,
 * figure 21.2). The tigers move first. Every piece steps to a free
 * neighbour along a line, in any direction.
 *
 * A tiger captures by leaping over one *empty* position, in a straight
 * line, and landing on the cow right behind it — the cow is removed and the
 * tiger takes its place. So a cow standing next to a tiger is safe from it.
 * One capture per turn, no chains.
 *
 * The tigers win by eating 6 cows; the cows win by blocking both tigers.
 *
 * As in Four Field Kono the capture lands on its victim: `a4 – x a2`.
 */

import { toIndex, DIRS, NEIGHBORS, CELLS, stepFrom, ray, isAdjacent } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, ownerOf, other, makeState, advance, endGame, newFx, count,
  step, lift, checkStep, relocate, capture, strayPlacement, settleCaptures, sameSet,
  formatMove, chips, sq, sqs
} from '../rules.js';

const NAME = 'Tigres e Vacas';
const COWS = WHITE, TIGERS = BLACK;
const HERD = 13;
const MEALS = 6;
const ROLES = [null, { pt: 'Vacas', en: 'Cows', plural: true }, { pt: 'Tigres', en: 'Tigers', plural: true }];
const format = (mv) => formatMove(mv, { replace: true });

function standard() {
  const board = new Uint8Array(CELLS);
  for (let i = 15; i < 25; i++) board[i] = COWS;              // ranks 4–5
  for (const s of ['a3', 'c3', 'e3']) board[toIndex(s)] = COWS;
  for (const s of ['b3', 'd3']) board[toIndex(s)] = TIGERS;
  return board;
}

function moves(state) {
  const me = state.turn;
  const board = state.board;
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (board[j] === EMPTY) out.push(step([i, j]));
    if (me !== TIGERS) continue;
    for (const [dx, dy] of DIRS) {
      const gap = stepFrom(i, dx, dy);
      if (gap < 0 || board[gap] !== EMPTY) continue;
      const land = stepFrom(gap, dx, dy);
      if (land >= 0 && ownerOf(board[land]) === COWS) out.push(step([i, land], [land]));
    }
  }
  return out;
}

function judge(state) {
  if (state.over) return;
  if (state.lost[COWS] >= MEALS) {
    endGame(state, TIGERS, `the tigers have eaten ${state.lost[COWS]} cows`);
  } else if (state.turn === TIGERS && count(state.board, TIGERS) > 0 && !moves(state).length) {
    endGame(state, COWS, 'both tigers are blocked and cannot move');
  }
}

export default {
  id: 'tigres',
  chapter: 21,
  name: NAME,
  motto: 'Com espaço para saltar e capturar',
  family: 'caça',
  roles: ROLES,
  first: TIGERS,
  variants: [{ id: 'tigres', label: NAME }],

  rules: [
    'Two tigers (black, on b3 and d3) against thirteen cows (white), set up as in figure 21.2. The tigers move first.',
    'Every piece steps to a free neighbouring position along a line, in any direction.',
    'A tiger captures by leaping over one empty position, in a straight line, and landing on the cow right behind it. The cow is removed and the tiger takes its place.',
    'A cow standing right next to a tiger cannot be captured by it. Only one cow per turn.',
    'The tigers win by eating 6 cows. The cows win by blocking both tigers so that neither can move.'
  ],
  notation: [
    ['b3 – b2', 'a tiger (or a cow) steps'],
    ['a4 – x a2', 'a tiger leaps the empty a3 and takes the cow on a2'],
    ['a4 x a2', 'the same capture, written shorter']
  ],

  initial(rules, setup) {
    const board = setup.board || standard();
    const lost = setup.lost || [0, setup.board ? Math.max(0, HERD - count(board, COWS)) : 0, 0];
    const state = makeState({ board, turn: setup.turn || TIGERS, lost, started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  format,

  stats(state) {
    return chips(state, { captured: true, only: TIGERS, goal: [0, 0, MEALS] });
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      strayPlacement(next, fx, mv.path[0], me, NAME, note);
      eff = { kind: 'place', path: mv.path, caps: [] };
    } else {
      const path = mv.path;
      const a = path[0];
      const b = path[path.length - 1];
      const code = lift(state, a, note);
      const side = ownerOf(code) || me;
      let taken = [];

      if (path.length > 2) note('a turn is one step or one capture — captures cannot be chained');

      if (state.board[b] !== EMPTY && ownerOf(state.board[b]) === other(side)) {
        // Landing on an enemy piece: a capture, or an attempt at one.
        if (side !== TIGERS) {
          note('cows cannot capture — only the tigers do');
        } else if (path.length === 2) {
          const between = ray(a, b);
          if (between === null) {
            note(`${sq(a)}–${sq(b)} does not follow a line of the board`);
          } else if (between.length !== 1) {
            note(isAdjacent(a, b)
              ? `the cow on ${sq(b)} is right next to the tiger and cannot be captured — a tiger leaps one empty position`
              : `${sq(a)}–${sq(b)} is not a leap over one empty position onto the cow right behind it`);
          } else if (state.board[between[0]] !== EMPTY) {
            note(`${sq(between[0])} is not empty — a tiger captures by leaping over one empty position`);
          }
        }
        if (mv.caps.length && !sameSet(mv.caps, [b])) {
          note(`recorded captures (${sqs(mv.caps)}) do not match the piece taken (${sq(b)})`);
        }
        capture(next, fx, b);
        taken = [b];
        relocate(next, fx, path, code, true);
      } else {
        if (mv.takes) note(`written as a capture (x), but there is no enemy piece on ${sq(b)}`);
        if (path.length === 2) checkStep(state.board, a, b, note);
        relocate(next, fx, path, code, false);
        taken = settleCaptures(next, fx, mv.caps, [], me, note, 'piece taken');
      }
      eff = { kind: 'move', path, caps: taken };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
