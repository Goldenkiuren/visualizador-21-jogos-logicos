/**
 * Chapter 8 — Tsoro Yematatu: diferentes formas de movimentar as peças.
 *
 * Four pieces each, placed one per turn anywhere; then they move. Lining up
 * all four, side by side along a drawn line, wins — while placing or after.
 * The book plays it as three games of growing difficulty, differing only in
 * how a piece moves once all are on the board:
 *
 *   1st  a piece may be lifted to *any* free position, lines or not;
 *   2nd  one step to a free neighbour along a line (as in Achi);
 *   3rd  one step, or a jump over one adjacent piece of either colour onto
 *        the free position beyond it (the original Tsoro Yematatu).
 *
 * Nothing is ever captured.
 */

import { DIRS, NEIGHBORS, CELLS, stepFrom, ray } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  empties, count, step, place, putPiece, lift, checkStep, relocate, noCaptures,
  maximalRuns, sq, sqs
} from '../rules.js';

const NAME = 'Tsoro Yematatu';
const PIECES = 4;

function judge(state, mover) {
  if (state.over) return;
  const run = maximalRuns(state.board)
    .find((r) => r.cells.length >= PIECES && (!mover || r.player === mover));
  if (run) endGame(state, run.player, `${run.cells.length} in a row on ${sqs(run.cells)}`, { line: run.cells });
}

function moves(state, rules) {
  const me = state.turn;
  const board = state.board;
  if (state.hand[me] > 0) return empties(board).map((i) => place([i]));

  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    if (rules.mode === 'free') {
      for (const j of empties(board)) out.push(step([i, j]));
      continue;
    }
    for (const j of NEIGHBORS[i]) if (board[j] === EMPTY) out.push(step([i, j]));
    if (rules.mode !== 'jump') continue;
    for (const [dx, dy] of DIRS) {
      const over = stepFrom(i, dx, dy);
      if (over < 0 || board[over] === EMPTY) continue;
      const land = stepFrom(over, dx, dy);
      if (land >= 0 && board[land] === EMPTY) out.push(step([i, land]));
    }
  }
  return out;
}

/** Is a → b a legal move of the third game? Says why when it is not. */
function checkStepOrJump(board, a, b, note) {
  if (board[b] !== EMPTY) note(`${sq(b)} is occupied`);
  const between = ray(a, b);
  if (between === null) {
    note(`${sq(a)}–${sq(b)} does not follow a line of the board`);
  } else if (between.length === 1) {
    if (board[between[0]] === EMPTY) note(`${sq(a)}–${sq(b)} is two steps with no piece on ${sq(between[0])} to jump over`);
  } else if (between.length > 1) {
    note(`${sq(a)}–${sq(b)} is too far — a jump clears exactly one piece`);
  }
  return between !== null && between.length === 1;
}

export default {
  id: 'tsoro',
  chapter: 8,
  name: NAME,
  motto: 'Diferentes formas de movimentar as peças',
  family: 'alinhamento',
  roles: SIDES,
  first: WHITE,
  phases: true,
  variants: [
    { id: 'tsoro1', label: 'Tsoro Yematatu — 1º jogo: movimento livre', mode: 'free' },
    { id: 'tsoro2', label: 'Tsoro Yematatu — 2º jogo: posições vizinhas', mode: 'step' },
    { id: 'tsoro3', label: 'Tsoro Yematatu — 3º jogo: vizinhas ou salto', mode: 'jump' }
  ],

  rules: [
    'Four pieces each, starting off the board. In turn each player places one piece on any free position.',
    'Once all are placed, a turn moves one piece. Nothing is captured.',
    '1st game: the piece may go to any free position at all, lines or not.',
    '2nd game: the piece steps to a free neighbouring position along a line.',
    '3rd game: the piece steps, or jumps one adjacent piece of either colour in a straight line onto the free position beyond.',
    'Lining up your four pieces, side by side along a drawn line, wins — during placement or later.'
  ],
  notation: [
    ['a3', 'a piece placed on a3 (the first four turns of each player)'],
    ['b3 – e1', 'a piece moves from b3 to e1'],
    ['c2 – d4 #', 'the move that lines up four']
  ],

  initial(rules, setup) {
    const board = setup.board || new Uint8Array(CELLS);
    const hand = setup.hand || [0, Math.max(0, PIECES - count(board, WHITE)), Math.max(0, PIECES - count(board, BLACK))];
    const turn = setup.turn || WHITE;
    const state = makeState({ board, turn, hand, phase: hand[turn] > 0 ? 'place' : 'move', started: !!setup.board });
    if (setup.board) judge(state, 0);
    return state;
  },

  legalMoves(state, rules) {
    return state.over ? [] : moves(state, rules);
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      const at = mv.path[0];
      if (state.hand[me] <= 0) note(`all ${PIECES} pieces are already on the board — one of them has to move`);
      if (putPiece(next, fx, at, me, note) && next.hand[me] > 0) next.hand[me]--;
      eff = { kind: 'place', path: [at], caps: [] };
    } else {
      const path = mv.path;
      const a = path[0];
      const b = path[path.length - 1];
      const code = lift(state, a, note);
      let arc = rules.mode === 'free';
      if (state.hand[me] > 0) note(`pieces only move once all ${PIECES} have been placed`);

      if (path.length > 2) {
        note(rules.mode === 'jump' ? 'a turn is one step or one jump, not a chain'
                                   : 'a move goes straight from one position to another, not along a path');
      } else if (rules.mode === 'free') {
        if (state.board[b] !== EMPTY) note(`${sq(b)} is occupied`);
      } else if (rules.mode === 'jump') {
        arc = checkStepOrJump(state.board, a, b, note);
      } else {
        checkStep(state.board, a, b, note);
      }
      relocate(next, fx, path, code, arc);
      eff = { kind: 'move', path, caps: [] };
    }
    noCaptures(next, fx, mv, me, note);

    next.turn = other(me);
    next.phase = next.hand[next.turn] > 0 ? 'place' : 'move';
    judge(next, me);
    return { next, fx, eff };
  }
};
