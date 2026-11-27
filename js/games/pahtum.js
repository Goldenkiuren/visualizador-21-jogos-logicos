/**
 * Chapter 9 — Pah Tum: alinhamentos de diferentes valores.
 *
 * An odd number of block pieces (1 or 3) is laid out by agreement, then the
 * players take turns placing a piece until the board is full. Rows of 3, 4
 * and 5 pieces — along rows, columns and the drawn diagonals — score points;
 * the higher total wins. Each unbroken row counts once, for its full length.
 *
 * The blocks come from a `[Bloqueios "d5 b3 c2"]` header; without one the
 * three of figure 9.1 are used.
 */

import { toIndex } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, BLOCK, SIDES, other, makeState, advance, endGame, newFx,
  empties, place, putPiece, strayMove, noCaptures, maximalRuns
} from '../rules.js';

const NAME = 'Pah Tum';
const FIGURE_9_1 = ['d5', 'b3', 'c2'].map(toIndex);

/** Points per side and the rows that earned them. */
export function tally(board, points) {
  const score = [0, 0, 0];
  const lines = [];
  for (const run of maximalRuns(board)) {
    const worth = points[run.cells.length] || 0;
    if (!worth) continue;
    score[run.player] += worth;
    lines.push({ player: run.player, cells: run.cells, worth });
  }
  return { score, lines };
}

function judge(state, rules) {
  const { score, lines } = tally(state.board, rules.points);
  state.ext.score = score;
  if (state.over || state.board.includes(EMPTY)) return;
  const [, w, b] = score;
  endGame(state, w > b ? WHITE : b > w ? BLACK : 0,
    `the board is full — White ${w} × ${b} Black`, { lines });
}

export default {
  id: 'pahtum',
  chapter: 9,
  name: NAME,
  motto: 'Alinhamentos de diferentes valores',
  family: 'posicionamento',
  roles: SIDES,
  first: WHITE,
  variants: [
    { id: 'pahtum', label: 'Pah Tum — pontuação sugerida (2 · 4 · 8)', points: { 3: 2, 4: 4, 5: 8 } },
    { id: 'pahtum-original', label: 'Pah Tum — pontuação original (3 · 10 · 25)', points: { 3: 3, 4: 10, 5: 25 } }
  ],

  rules: [
    'First an odd number of block pieces (1 or 3) is placed anywhere, by agreement, so both players get the same number of turns.',
    'Then each player in turn places one piece on a free position until the board is full.',
    'Rows of your own pieces score: along rows, columns and the drawn diagonals.',
    'Suggested scoring: a row of 3 = 2 points, 4 = 4, 5 = 8. Original scoring: 3 = 3, 4 = 10, 5 = 25. Rows of 2 score nothing.',
    'Each unbroken row counts once, for its whole length. The higher total wins.'
  ],
  notation: [
    ['[Bloqueios "d5 b3 c2"]', 'where the block pieces stand (figure 9.1 if omitted)'],
    ['a3', 'a piece placed on a3']
  ],

  initial(rules, setup) {
    let board = setup.board;
    if (!board) {
      board = new Uint8Array(25);
      for (const i of FIGURE_9_1) board[i] = BLOCK;
    }
    const state = makeState({ board, turn: setup.turn || WHITE, phase: 'place', started: !!setup.board });
    judge(state, rules);
    return state;
  },

  /** Complaints about the starting position itself. */
  check(state) {
    let blocks = 0;
    for (const code of state.board) if (code === BLOCK) blocks++;
    return blocks === 1 || blocks === 3 ? []
      : [`Pah Tum is set up with 1 or 3 block pieces, so that both players place the same number of pieces — this position has ${blocks}`];
  },

  legalMoves(state) {
    return state.over ? [] : empties(state.board).map((i) => place([i]));
  },

  stats(state) {
    return [null,
      [{ label: 'points', value: String(state.ext.score[WHITE]) }],
      [{ label: 'points', value: String(state.ext.score[BLACK]) }]];
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'move') {
      strayMove(state, next, fx, mv, NAME, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    } else {
      const at = mv.path[0];
      putPiece(next, fx, at, me, note);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'place', path: [at], caps: [] };
    }

    next.turn = other(me);
    judge(next, rules);
    return { next, fx, eff };
  }
};
