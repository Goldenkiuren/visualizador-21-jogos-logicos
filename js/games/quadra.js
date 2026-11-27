/**
 * Chapter 15 — Quadra: vencendo por alinhamento ou captura.
 *
 * Jogo-da-Velha 4 with captures, after Pente. Pieces are placed one at a
 * time and never move. A placed piece that, together with another of its own
 * colour, brackets *exactly two* adjacent enemy pieces along a drawn line
 * removes that pair; several pairs can fall to one placement. Four in a row
 * wins, and so do two captured pairs.
 */

import { DIRS, stepFrom } from '../coords.js';
import {
  EMPTY, WHITE, SIDES, ownerOf, manOf, other, makeState, advance, endGame, newFx,
  empties, count, place, putPiece, strayMove, settleCaptures, longestRunAt, maximalRuns, sqs
} from '../rules.js';

const NAME = 'Quadra';
const PIECES = 16;          // "16 peças para cada jogador devem ser suficientes"
const PAIRS_TO_WIN = 2;

/** The enemy pairs a piece of `me` on `at` brackets, as [[near, far], …]. */
function bracketed(board, at, me) {
  const foe = other(me);
  const out = [];
  for (const [dx, dy] of DIRS) {
    const near = stepFrom(at, dx, dy);
    if (near < 0 || ownerOf(board[near]) !== foe) continue;
    const far = stepFrom(near, dx, dy);
    if (far < 0 || ownerOf(board[far]) !== foe) continue;
    const anchor = stepFrom(far, dx, dy);
    if (anchor >= 0 && ownerOf(board[anchor]) === me) out.push([near, far]);
  }
  return out;
}

function judge(state, mover, at) {
  if (state.over) return;
  const run = at == null
    ? maximalRuns(state.board).find((r) => r.cells.length >= 4)
    : { player: mover, cells: longestRunAt(state.board, at, mover) };

  if (run && run.cells.length >= 4) {
    endGame(state, run.player, `${run.cells.length} in a row on ${sqs(run.cells)}`, { line: run.cells });
    return;
  }
  for (const p of mover ? [mover, other(mover)] : [WHITE, other(WHITE)]) {
    if (state.ext.pairs[p] >= PAIRS_TO_WIN) {
      endGame(state, p, `${state.ext.pairs[p]} pairs of enemy pieces captured`);
      return;
    }
  }
  if (!state.board.includes(EMPTY)) endGame(state, 0, 'the board is full with no winner');
  else if (state.hand[state.turn] <= 0) endGame(state, 0, `${SIDES[state.turn].en} has no pieces left to place`);
}

export default {
  id: 'quadra',
  chapter: 15,
  name: NAME,
  motto: 'Vencendo por alinhamento ou captura',
  family: 'posicionamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'quadra', label: NAME }],

  rules: [
    'Each player in turn places one piece on any free position (16 pieces each). Pieces never move.',
    'A placed piece that brackets exactly two adjacent enemy pieces against another of your own, along a drawn line, removes that pair.',
    'One placement can remove more than one pair. Placing your own pair between two enemy pieces is safe.',
    'Win by lining up 4 of your pieces along a drawn line, or by capturing two pairs.'
  ],
  notation: [
    ['b4', 'a piece placed on b4'],
    ['b4 (x c3 d2)', 'a placement that captures the pair c3, d2'],
    ['b4 (x b2 b3) (x c3 d2) #', 'two pairs at once — and the match']
  ],

  initial(rules, setup) {
    const board = setup.board || new Uint8Array(25);
    const lost = setup.lost || [0, 0, 0];
    const state = makeState({
      board,
      turn: setup.turn || WHITE,
      hand: setup.hand || [0, Math.max(0, PIECES - count(board, 1) - lost[1]), Math.max(0, PIECES - count(board, 2) - lost[2])],
      lost,
      phase: 'place',
      started: !!setup.board,
      ext: { pairs: [0, Math.floor(lost[2] / 2), Math.floor(lost[1] / 2)] }
    });
    if (setup.board) judge(state, 0, null);
    return state;
  },

  legalMoves(state) {
    if (state.over || state.hand[state.turn] <= 0) return [];
    const me = state.turn;
    const board = Uint8Array.from(state.board);
    return empties(board).map((i) => {
      board[i] = manOf(me);
      const groups = bracketed(board, i, me);
      board[i] = EMPTY;
      const caps = [].concat(...groups);
      return place([i], caps, caps.length ? { groups } : null);
    });
  },

  stats(state) {
    const chip = (p) => [
      { label: 'in hand', value: String(state.hand[p]) },
      { label: 'pairs', value: state.ext.pairs[p] + '/' + PAIRS_TO_WIN }
    ];
    return [null, chip(1), chip(2)];
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    next.ext.pairs = state.ext.pairs.slice();
    let eff;

    if (mv.kind === 'move') {
      strayMove(state, next, fx, mv, NAME, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
      next.turn = other(me);
      judge(next, me, mv.path[mv.path.length - 1]);
      return { next, fx, eff };
    }

    const at = mv.path[0];
    let taken = [];
    if (state.hand[me] <= 0) note(`${SIDES[me].en} has no pieces left to place (${PIECES} each)`);
    if (putPiece(next, fx, at, me, note)) {
      if (next.hand[me] > 0) next.hand[me]--;
      const groups = bracketed(next.board, at, me);
      taken = settleCaptures(next, fx, mv.caps, [].concat(...groups), me, note, 'pairs bracketed');
      next.ext.pairs[me] += groups.length;
    } else {
      taken = settleCaptures(next, fx, mv.caps, [], me, note, 'pairs bracketed');
    }
    eff = { kind: 'place', path: [at], caps: taken };

    next.turn = other(me);
    judge(next, me, at);
    return { next, fx, eff };
  }
};
