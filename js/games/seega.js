/**
 * Chapter 16 — Seega: captura por custódia.
 *
 * Twelve pieces each. They enter two at a time — each turn places a pair —
 * anywhere except the centre, until the centre is the only free node. Then
 * the pieces move, one step along a line per turn, and the player who
 * placed the *last* pair moves first.
 *
 * Capture is by custody: the piece that moves takes an enemy piece it
 * leaves between itself and another piece of its own, the three joined by a
 * drawn line with nothing in between. Exactly one enemy piece — a pair is
 * safe (figure 16.4). One move can capture in several directions at once.
 * A piece that steps between two enemies is not captured (figure 16.6).
 *
 * A player who cannot move is skipped and the opponent plays again. The
 * match is won by leaving the opponent with a single piece.
 */

import { CENTER, DIRS, NEIGHBORS, CELLS, stepFrom } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  count, empties, step, place, putPiece, plainStep, settleCaptures, chips, is
} from '../rules.js';

const NAME = 'Seega';
const PIECES = 12;

/** Enemy pieces held between `at` and another piece of the same side. */
function custody(board, at, me) {
  const foe = other(me);
  const out = [];
  for (const [dx, dy] of DIRS) {
    const held = stepFrom(at, dx, dy);
    if (held < 0 || ownerOf(board[held]) !== foe) continue;
    const anchor = stepFrom(held, dx, dy);
    if (anchor >= 0 && ownerOf(board[anchor]) === me) out.push(held);
  }
  return out.sort((a, b) => a - b);
}

function moves(state) {
  const me = state.turn;
  const board = state.board;
  const out = [];

  if (state.phase === 'place') {
    const free = empties(board).filter((i) => i !== CENTER);
    if (state.hand[me] >= 2) {
      for (let a = 0; a < free.length; a++) for (let b = a + 1; b < free.length; b++) out.push(place([free[a], free[b]]));
    } else if (state.hand[me] === 1) {
      for (const i of free) out.push(place([i]));
    }
    return out;
  }

  const work = Uint8Array.from(board);
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) {
      if (board[j] !== EMPTY) continue;
      work[i] = EMPTY; work[j] = board[i];
      out.push(step([i, j], custody(work, j, me)));
      work[i] = board[i]; work[j] = EMPTY;
    }
  }
  return out;
}

function judge(state) {
  if (state.over || state.phase !== 'move') return;
  for (const p of [WHITE, BLACK]) {
    const left = count(state.board, p);
    if (left <= 1 && count(state.board, other(p)) > 1) {
      endGame(state, other(p), `${SIDES[p].en} is left with ${left === 1 ? 'a single piece' : 'no pieces'}`);
      return;
    }
  }
}

/** "Caso um jogador não possa realizar um movimento, o outro jogador joga novamente." */
function skipBlocked(state, info) {
  if (state.over || state.phase !== 'move' || moves(state).length) return;
  const blocked = state.turn;
  const free = other(blocked);
  state.turn = free;
  if (moves(state).length) {
    // If `free` had itself just been skipped by the last-pair rule, play is
    // simply back to normal alternation and no blank turn is owed.
    state.skip = state.skip === free ? 0 : blocked;
    info(`${is(SIDES[blocked])} blocked and cannot move — ${SIDES[free].en} plays again`);
  } else {
    state.turn = blocked;
    info('neither side can move');
  }
}

export default {
  id: 'seega',
  chapter: 16,
  name: NAME,
  motto: 'Captura por custódia',
  family: 'captura',
  roles: SIDES,
  first: WHITE,
  phases: true,
  parse: { pairs: true },
  variants: [{ id: 'seega', label: NAME }],

  rules: [
    'Twelve pieces each. They enter two at a time: each turn places a pair anywhere except the centre.',
    'When all are placed, a turn moves one piece a single step to a free neighbouring position along a line. Whoever placed the last pair moves first.',
    'A moved piece captures an enemy piece it leaves between itself and another of your pieces, the three joined by a line of the board with no gap.',
    'Exactly one enemy piece is taken that way — two in a row are safe — but one move may capture in several directions.',
    'Stepping between two enemy pieces is safe: only the player who moves captures.',
    'A player who cannot move is skipped. Leave the opponent with a single piece to win.'
  ],
  notation: [
    ['b4 c5', 'a pair of pieces placed on b4 and c5'],
    ['a4 – b4', 'a step'],
    ['a4 – b4 (x c4)', 'a step that captures c4'],
    ['a4 – b4 (x b3 c3 c4)', 'three captures in one move'],
    ['pass', 'a blocked player’s turn (… works too)']
  ],

  initial(rules, setup) {
    const board = setup.board || new Uint8Array(CELLS);
    const hand = setup.hand || (setup.board ? [0, 0, 0] : [0, PIECES, PIECES]);
    const state = makeState({
      board,
      turn: setup.turn || WHITE,
      hand,
      lost: setup.lost || [0, 0, 0],
      phase: hand[WHITE] + hand[BLACK] > 0 ? 'place' : 'move',
      started: !!setup.board
    });
    if (setup.board) { judge(state); skipBlocked(state, () => {}); }
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    return chips(state, { captured: true });
  },

  play(state, mv, rules, note, info) {
    const me = state.turn;
    const foe = other(me);
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      if (state.phase !== 'place' || state.hand[me] <= 0) {
        note(`all ${PIECES} pieces are already on the board — a piece now has to move`);
      } else if (mv.path.length < 2 && state.hand[me] >= 2) {
        note('pieces enter two at a time — this turn places only one');
      } else if (mv.path.length > state.hand[me]) {
        note(`${SIDES[me].en} has only one piece left to place`);
      }
      for (const at of mv.path) {
        if (at === CENTER) note('the centre cannot be occupied during the placement phase');
        if (putPiece(next, fx, at, me, note) && next.hand[me] > 0) next.hand[me]--;
      }
      const taken = settleCaptures(next, fx, mv.caps, [], me, note, 'pieces enclosed');
      eff = { kind: 'place', path: mv.path.slice().sort((a, b) => a - b), caps: taken };
    } else {
      if (state.phase === 'place') note(`pieces only move once all ${2 * PIECES} have been placed`);
      const code = plainStep(state, next, fx, mv, note);
      const to = mv.path[mv.path.length - 1];
      const held = mv.path.length === 2 ? custody(next.board, to, ownerOf(code) || me) : [];
      const taken = settleCaptures(next, fx, mv.caps, held, me, note, 'pieces enclosed');
      eff = { kind: 'move', path: mv.path, caps: taken };
    }

    next.turn = foe;
    if (next.phase === 'place' && next.hand[WHITE] + next.hand[BLACK] === 0) {
      next.phase = 'move';
      if (mv.kind === 'place') {
        next.turn = me;                               // the last pair moves first
        next.skip = foe;
        info(`every piece is on the board — ${SIDES[me].en} placed the last pair and so moves first`);
      }
    }
    judge(next);
    skipBlocked(next, info);
    return { next, fx, eff };
  }
};
