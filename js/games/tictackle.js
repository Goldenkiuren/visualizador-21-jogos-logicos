/**
 * Chapter 10 — Tic Tackle: alinhar 4 peças mesmo onde não há linha.
 *
 * Five pieces each, already on the board (figure 10.2), alternating along
 * the top and bottom ranks. A piece steps to a free neighbour along a drawn
 * line — no jumps.
 *
 * Lining up at least 4 of your 5, side by side, wins. The twist: a diagonal
 * row counts even where the board draws no line (figure 10.4), although no
 * piece can travel along such a diagonal.
 */

import { toIndex, GRID_LINES, NEIGHBORS, CELLS, ray } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  step, plainStep, strayPlacement, noCaptures, maximalRuns, sqs
} from '../rules.js';

const NAME = 'Tic Tackle';

function standard() {
  const board = new Uint8Array(CELLS);
  for (const s of ['b5', 'd5', 'a1', 'c1', 'e1']) board[toIndex(s)] = WHITE;
  for (const s of ['a5', 'c5', 'e5', 'b1', 'd1']) board[toIndex(s)] = BLACK;
  return board;
}

function judge(state, mover) {
  if (state.over) return;
  const run = maximalRuns(state.board, GRID_LINES)
    .find((r) => r.cells.length >= 4 && (!mover || r.player === mover));
  if (!run) return;
  const drawn = ray(run.cells[0], run.cells[1]) !== null;
  endGame(state, run.player,
    `${run.cells.length} in a row on ${sqs(run.cells)}` + (drawn ? '' : ' — a diagonal with no line, which still counts'),
    { line: run.cells });
}

function moves(state) {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== state.turn) continue;
    for (const j of NEIGHBORS[i]) if (state.board[j] === EMPTY) out.push(step([i, j]));
  }
  return out;
}

export default {
  id: 'tictackle',
  chapter: 10,
  name: NAME,
  motto: 'Alinhar 4 peças mesmo onde não há linha',
  family: 'alinhamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'tictackle', label: NAME }],

  rules: [
    'Five pieces each, set up as in figure 10.2. White moves first.',
    'A piece steps to a free neighbouring position along a line, in any direction. No jumps, no captures.',
    'Line up at least 4 of your 5 pieces, side by side with nothing between them, to win.',
    'Rows, columns and diagonals all count — a diagonal even where the board has no line drawn.'
  ],
  notation: [
    ['a1 – b2', 'the piece on a1 steps to b2'],
    ['d2 – e2 #', 'the move that lines up four']
  ],

  initial(rules, setup) {
    const state = makeState({
      board: setup.board || standard(),
      turn: setup.turn || WHITE,
      started: !!setup.board
    });
    if (setup.board) judge(state, 0);
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
      plainStep(state, next, fx, mv, note);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    }

    next.turn = other(me);
    judge(next, me);
    return { next, fx, eff };
  }
};
