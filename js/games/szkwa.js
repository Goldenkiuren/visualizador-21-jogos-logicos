/**
 * Chapter 22 — Sz'kwa: cercando as peças adversárias.
 *
 * A placement game close to Go. Pieces of one colour joined along the drawn
 * lines form a group; a group with no free neighbouring position has lost
 * all its "graus de liberdade". A placement that takes away the last one of
 * an *enemy* group captures the whole group.
 *
 * Closing in your own group is allowed and safe (figure 22.4): only the
 * groups touching the piece just placed are examined, so a group its owner
 * sealed can never be taken afterwards — there is no position left for the
 * enclosing move.
 *
 * 20 pieces each, no passing. The match ends when the board is full or the
 * player to move has nothing left to place; the most captures win.
 */

import { NEIGHBORS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, manOf, other, makeState, advance, endGame, newFx,
  empties, count, place, putPiece, strayMove, settleCaptures, chips
} from '../rules.js';

const NAME = 'Sz’kwa';
const PIECES = 20;

/** The group through `start` and how many distinct free positions touch it. */
export function groupAt(board, start) {
  const owner = ownerOf(board[start]);
  const cells = [start];
  const seen = new Set(cells);
  const free = new Set();
  for (let k = 0; k < cells.length; k++) {
    for (const n of NEIGHBORS[cells[k]]) {
      if (board[n] === EMPTY) free.add(n);
      else if (ownerOf(board[n]) === owner && !seen.has(n)) { seen.add(n); cells.push(n); }
    }
  }
  return { cells, liberties: free.size };
}

/** Enemy pieces left without a liberty by `me`'s piece on `at`. */
function enclosed(board, at, me) {
  const foe = other(me);
  const seen = new Set();
  const out = [];
  for (const n of NEIGHBORS[at]) {
    if (ownerOf(board[n]) !== foe || seen.has(n)) continue;
    const group = groupAt(board, n);
    for (const c of group.cells) seen.add(c);
    if (group.liberties === 0) out.push(...group.cells);
  }
  return out.sort((a, b) => a - b);
}

function judge(state) {
  if (state.over) return;
  let why = null;
  if (!state.board.includes(EMPTY)) why = 'the board is full';
  else if (state.hand[state.turn] <= 0) why = `${SIDES[state.turn].en} has no pieces left to place`;
  if (!why) return;
  const white = state.lost[BLACK];
  const black = state.lost[WHITE];
  endGame(state, white > black ? WHITE : black > white ? BLACK : 0,
    `${why} — White captured ${white}, Black captured ${black}`);
}

export default {
  id: 'szkwa',
  chapter: 22,
  name: NAME,
  motto: 'Cercando as peças adversárias',
  family: 'posicionamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'szkwa', label: NAME }],

  rules: [
    'Each player in turn places one of 20 pieces on any free position. Pieces never move and a turn cannot be passed.',
    'Pieces of one colour joined along the lines of the board form a group.',
    'A placement that leaves an enemy piece or group without any free neighbouring position captures it.',
    'Sealing in your own pieces is allowed and they are not captured — it even protects them.',
    'The match ends when the board is full or there are no pieces left to place. Whoever captured more pieces wins.'
  ],
  notation: [
    ['a4', 'a piece placed on a4'],
    ['a4 (x a5)', 'a placement that captures a5'],
    ['c2 (x c3 c4 d4 e5)', 'a placement that captures a whole group']
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
      started: !!setup.board
    });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    if (state.over || state.hand[state.turn] <= 0) return [];
    const me = state.turn;
    const board = Uint8Array.from(state.board);
    return empties(board).map((i) => {
      board[i] = manOf(me);
      const caps = enclosed(board, i, me);
      board[i] = EMPTY;
      return place([i], caps);
    });
  },

  stats(state) {
    return chips(state, { captured: true, hand: true });
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
      let taken;
      if (state.hand[me] <= 0) note(`${SIDES[me].en} has no pieces left to place (${PIECES} each)`);
      if (putPiece(next, fx, at, me, note)) {
        if (next.hand[me] > 0) next.hand[me]--;
        taken = settleCaptures(next, fx, mv.caps, enclosed(next.board, at, me), me, note, 'pieces enclosed');
      } else {
        taken = settleCaptures(next, fx, mv.caps, [], me, note, 'pieces enclosed');
      }
      eff = { kind: 'place', path: [at], caps: taken };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
