/**
 * Chapter 17 — Bagh Chal: na jaula com quatro tigres.
 *
 * The hunt game of Nepal and India, on its original board. Four tigers
 * (black) start on the corners; twenty goats (white) start off the board.
 *
 * The goats go first. A goat turn puts one goat on any free position — and
 * goats may not move at all until all twenty have entered. A tiger turn
 * moves one tiger: a step to a free neighbour, or a capture by jumping an
 * adjacent goat onto the free node beyond, chaining further jumps if it can.
 *
 * The goats win by trapping every tiger; the tigers by eating 5 goats.
 */

import { toIndex, NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, ownerOf, other, makeState, advance, endGame, newFx, count, empties,
  step, place, putPiece, lift, relocate, settleCaptures, walkPath, jumpChains
} from '../rules.js';

const NAME = 'Bagh Chal';
const GOATS = WHITE, TIGERS = BLACK;
const HERD = 20;
const MEALS = 5;
const ROLES = [null, { pt: 'Cabras', en: 'Goats', plural: true }, { pt: 'Tigres', en: 'Tigers', plural: true }];

function standard() {
  const board = new Uint8Array(CELLS);
  for (const s of ['a1', 'e1', 'a5', 'e5']) board[toIndex(s)] = TIGERS;
  return board;
}

function moves(state) {
  const me = state.turn;
  const board = state.board;
  if (me === GOATS && state.hand[GOATS] > 0) return empties(board).map((i) => place([i]));

  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (board[j] === EMPTY) out.push(step([i, j]));
    if (me === TIGERS) for (const chain of jumpChains(board, i, me, false)) out.push(step(chain.path, chain.caps));
  }
  return out;
}

function judge(state) {
  if (state.over) return;
  if (state.lost[GOATS] >= MEALS) {
    endGame(state, TIGERS, `the tigers have eaten ${state.lost[GOATS]} goats`);
  } else if (state.turn === TIGERS && count(state.board, TIGERS) > 0 && !moves(state).length) {
    endGame(state, GOATS, 'every tiger is trapped and cannot move');
  }
}

export default {
  id: 'baghchal',
  chapter: 17,
  name: NAME,
  motto: 'Na jaula com quatro tigres',
  family: 'caça',
  roles: ROLES,
  first: GOATS,
  phaseLabel: (state) => (state.hand[GOATS] > 0 ? 'Goats still entering' : 'All goats on the board'),
  variants: [{ id: 'baghchal', label: NAME }],

  rules: [
    'Four tigers (black) start on the corners; twenty goats (white) start off the board. The goats go first.',
    'On a goat turn one goat is placed on any free position. Goats may only move once all twenty have entered.',
    'On a tiger turn one tiger steps to a free neighbouring position along a line, or captures.',
    'A tiger captures a goat beside it by jumping over it, in a straight line, onto the free position beyond — and may go on jumping in the same turn.',
    'The goats win by trapping all four tigers. The tigers win by eating 5 goats.'
  ],
  notation: [
    ['c2', 'a goat enters the board on c2'],
    ['a1 – b2', 'a tiger (or, later, a goat) steps'],
    ['e5 – e3 – c1 – a1 (x e4 d2 b1)', 'a tiger eats three goats in one turn']
  ],

  initial(rules, setup) {
    const board = setup.board || standard();
    const lost = setup.lost || [0, 0, 0];
    const hand = setup.hand || [0, Math.max(0, HERD - count(board, GOATS) - lost[GOATS]), 0];
    const state = makeState({
      board, turn: setup.turn || GOATS, hand, lost,
      phase: hand[GOATS] > 0 ? 'place' : 'move',
      started: !!setup.board
    });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    return [null,
      [{ label: 'to enter', value: String(state.hand[GOATS]) }],
      [{ label: 'eaten', value: state.lost[GOATS] + '/' + MEALS }]];
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      const at = mv.path[0];
      if (me !== GOATS) note('only goats enter the board — a tiger has to move');
      else if (state.hand[GOATS] <= 0) note(`all ${HERD} goats have already entered — a goat now has to move`);
      if (putPiece(next, fx, at, me, note) && me === GOATS && next.hand[GOATS] > 0) next.hand[GOATS]--;
      const taken = settleCaptures(next, fx, mv.caps, [], me, note, 'goats jumped');
      eff = { kind: 'place', path: [at], caps: taken };
    } else {
      const code = lift(state, mv.path[0], note);
      const tiger = ownerOf(code) === TIGERS;
      if (!tiger && state.hand[GOATS] > 0) note(`goats may only move once all ${HERD} have entered the board`);
      const jumped = walkPath(state.board, mv.path, {
        me,
        canJump: tiger,
        noJumpNote: 'goats cannot jump — only the tigers capture'
      }, note);
      const taken = settleCaptures(next, fx, mv.caps, jumped, me, note, 'goats jumped');
      relocate(next, fx, mv.path, code, taken.length > 0);
      eff = { kind: 'move', path: mv.path, caps: taken };
    }

    next.turn = other(me);
    next.phase = next.hand[GOATS] > 0 ? 'place' : 'move';
    judge(next);
    return { next, fx, eff };
  }
};
