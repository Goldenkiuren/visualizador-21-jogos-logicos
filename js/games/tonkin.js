/**
 * Chapter 7 — Tonkin: preenchendo uma linha do tabuleiro.
 *
 * Five pieces each. First they are placed, one per turn, anywhere but the
 * centre; then they move, one step along a line. Whoever fills *every*
 * position of one of the board's 16 lines with their own pieces wins — the
 * 12 lines of five or one of the four short diagonals of three. That can
 * already happen while placing (figure 7.3).
 */

import { CENTER, BOARD_LINES, NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  empties, count, step, place, putPiece, plainStep, noCaptures, sq
} from '../rules.js';

const NAME = 'Tonkin';
const PIECES = 5;

const filledLine = (board, player) =>
  BOARD_LINES.find((line) => line.every((i) => ownerOf(board[i]) === player)) || null;

function judge(state, mover) {
  if (state.over) return;
  for (const p of mover ? [mover] : [WHITE, BLACK]) {
    const line = filledLine(state.board, p);
    if (line) {
      endGame(state, p, `the line ${sq(line[0])}–${sq(line[line.length - 1])} is completely filled`, { line });
      return;
    }
  }
}

function moves(state) {
  const me = state.turn;
  if (state.hand[me] > 0) return empties(state.board).filter((i) => i !== CENTER).map((i) => place([i]));
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (state.board[j] === EMPTY) out.push(step([i, j]));
  }
  return out;
}

export default {
  id: 'tonkin',
  chapter: 7,
  name: NAME,
  motto: 'Preenchendo uma linha do tabuleiro',
  family: 'alinhamento',
  roles: SIDES,
  first: WHITE,
  phases: true,
  variants: [{ id: 'tonkin', label: NAME }],

  rules: [
    'Five pieces each, starting off the board. In turn each player places one piece — anywhere except the centre.',
    'Once all are placed, a turn moves one piece a single step to a free neighbouring position along a line. No jumps.',
    'You win by filling every position of one line of the board with your own pieces.',
    'The board has 16 lines: 5 horizontals, 5 verticals, 2 long diagonals of five positions and 4 short diagonals of three.'
  ],
  notation: [
    ['a3', 'a piece placed on a3 (the first five turns of each player)'],
    ['d5 – c5', 'a piece steps from d5 to c5'],
    ['b3 – b4 #', 'the move that fills a line']
  ],

  initial(rules, setup) {
    const board = setup.board || new Uint8Array(CELLS);
    const hand = setup.hand || [0, Math.max(0, PIECES - count(board, WHITE)), Math.max(0, PIECES - count(board, BLACK))];
    const turn = setup.turn || WHITE;
    const state = makeState({ board, turn, hand, phase: hand[turn] > 0 ? 'place' : 'move', started: !!setup.board });
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
      const at = mv.path[0];
      if (state.hand[me] <= 0) note(`all ${PIECES} pieces are already on the board — one of them has to move`);
      if (at === CENTER) note('the centre cannot be occupied during the placement phase');
      if (putPiece(next, fx, at, me, note) && next.hand[me] > 0) next.hand[me]--;
      eff = { kind: 'place', path: [at], caps: [] };
    } else {
      if (state.hand[me] > 0) note(`pieces only move once all ${PIECES} have been placed`);
      plainStep(state, next, fx, mv, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    }
    noCaptures(next, fx, mv, me, note);

    next.turn = other(me);
    next.phase = next.hand[next.turn] > 0 ? 'place' : 'move';
    judge(next, me);
    return { next, fx, eff };
  }
};
