/**
 * Chapter 6 — Raposa e Cachorros: um pega, outro foge.
 *
 * A hunt game with no captures. The fox (black, c5) may step in any
 * direction; the five dogs (white, rank 1) never retreat — sideways,
 * forward or diagonally forward only. Nobody jumps.
 *
 * The dogs win by trapping the fox; the fox wins by reaching the other side
 * of the board, rank 1. The players agree who moves first; the book's own
 * match starts with the dogs.
 */

import { toIndex, rowOf, NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, ownerOf, other, makeState, advance, endGame, newFx, squaresOf,
  step, plainStep, strayPlacement, noCaptures, sq
} from '../rules.js';

const NAME = 'Raposa e Cachorros';
const DOGS = WHITE, FOX = BLACK;
const ROLES = [null, { pt: 'Cachorros', en: 'Dogs', plural: true }, { pt: 'Raposa', en: 'Fox' }];

function standard() {
  const board = new Uint8Array(CELLS);
  for (const s of ['a1', 'b1', 'c1', 'd1', 'e1']) board[toIndex(s)] = DOGS;
  board[toIndex('c5')] = FOX;
  return board;
}

function moves(state) {
  const me = state.turn;
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) {
      if (state.board[j] !== EMPTY) continue;
      if (me === DOGS && rowOf(j) < rowOf(i)) continue;           // dogs never retreat
      out.push(step([i, j]));
    }
  }
  return out;
}

function judge(state) {
  if (state.over) return;
  const foxes = squaresOf(state.board, FOX);
  const home = foxes.find((i) => rowOf(i) === 0);
  if (home !== undefined) {
    endGame(state, FOX, `the fox reached the other side of the board on ${sq(home)}`);
  } else if (state.turn === FOX && foxes.length && !moves(state).length) {
    endGame(state, DOGS, 'the fox is trapped and cannot move');
  }
}

export default {
  id: 'raposa',
  chapter: 6,
  name: NAME,
  motto: 'Um pega, outro foge',
  family: 'caça',
  roles: ROLES,
  first: DOGS,
  variants: [
    { id: 'raposa', label: 'Raposa e Cachorros — os cachorros começam', first: DOGS },
    { id: 'raposa-fox', label: 'Raposa e Cachorros — a raposa começa', first: FOX }
  ],

  rules: [
    'The fox (black) starts on c5, the five dogs (white) on rank 1. The players agree who moves first.',
    'Every piece steps to a free neighbouring position along a line. Nobody jumps and nothing is captured.',
    'The fox moves in any direction. The dogs never retreat: sideways, forward or diagonally forward only.',
    'The dogs win by trapping the fox so that it cannot move.',
    'The fox wins by reaching the other side of the board (rank 1).'
  ],
  notation: [
    ['d1 – d2', 'a dog steps forward'],
    ['c5 – d4', 'the fox steps'],
    ['b2 – b1 #', 'the fox reaches the far side and wins']
  ],

  initial(rules, setup) {
    const state = makeState({
      board: setup.board || standard(),
      turn: setup.turn || rules.first || DOGS,
      started: !!setup.board
    });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
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
      const from = mv.path[0];
      const to = mv.path[mv.path.length - 1];
      if (state.board[from] === DOGS && rowOf(to) < rowOf(from)) note('the dogs never move backwards');
      plainStep(state, next, fx, mv, note);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
