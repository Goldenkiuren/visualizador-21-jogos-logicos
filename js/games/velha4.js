/**
 * Chapter 2 — Jogo-da-Velha 4: entre o Jogo-da-Velha e o Gomoku.
 *
 * Each player in turn places one piece anywhere. Four of your pieces side by
 * side along a *drawn* line win; a full board with no such row is a draw
 * ("deu velha"). Pieces never move and nothing is captured.
 */

import {
  EMPTY, WHITE, SIDES, other, makeState, advance, endGame, newFx, empties, place,
  putPiece, strayMove, noCaptures, longestRunAt, maximalRuns, sqs
} from '../rules.js';

const NAME = 'Jogo-da-Velha 4';

/** `at` is the node just played, or null to look at the whole board. */
function judge(state, mover, at) {
  if (state.over) return;
  const run = at == null
    ? maximalRuns(state.board).find((r) => r.cells.length >= 4)
    : { player: mover, cells: longestRunAt(state.board, at, mover) };

  if (run && run.cells.length >= 4) {
    endGame(state, run.player, `${run.cells.length} in a row on ${sqs(run.cells)}`, { line: run.cells });
  } else if (!state.board.includes(EMPTY)) {
    endGame(state, 0, 'the board is full and nobody lined up 4 — “deu velha”');
  }
}

export default {
  id: 'velha4',
  chapter: 2,
  name: NAME,
  motto: 'Entre o Jogo-da-Velha e o Gomoku',
  family: 'posicionamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'velha4', label: NAME }],

  rules: [
    'Each player in turn places one piece on any free position. Pieces never move.',
    'Line up 4 of your pieces, side by side, along a line drawn on the board to win.',
    'Diagonals with no drawn line do not count (figure 2.4).',
    'A full board with no row of 4 is a draw — “deu velha”.'
  ],
  notation: [
    ['c3', 'a piece placed on c3'],
    ['a5 #', 'the placement that wins the match']
  ],

  initial(rules, setup) {
    const state = makeState({
      board: setup.board || new Uint8Array(25),
      turn: setup.turn || WHITE,
      phase: 'place',
      started: !!setup.board
    });
    if (setup.board) judge(state, 0, null);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : empties(state.board).map((i) => place([i]));
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'move') {
      strayMove(state, next, fx, mv, NAME, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
      judge(next, me, mv.path[mv.path.length - 1]);
    } else {
      const at = mv.path[0];
      putPiece(next, fx, at, me, note);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'place', path: [at], caps: [] };
      judge(next, me, at);
    }

    next.turn = other(me);
    return { next, fx, eff };
  }
};
