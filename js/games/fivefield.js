/**
 * Chapter 3 — Five Field Kono: atravessando o tabuleiro.
 *
 * Seven pieces a side (figure 3.2). A piece steps to a free neighbour along
 * a line, in any direction. The book's adaptation changes two things:
 *
 *   · a piece that reaches one of its destination positions — where the
 *     opponent started — can no longer move;
 *   · you win when the opponent's starting side is completely filled with
 *     pieces of *either* colour, so nobody gains by staying at home. This is
 *     judged "após o primeiro movimento de cada jogador" (p. 120).
 *
 * A player with no move on their turn loses, however many pieces have
 * arrived (figures 3.4–3.5).
 */

import { toIndex, NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  step, plainStep, strayPlacement, noCaptures, sq, is
} from '../rules.js';

const NAME = 'Five Field Kono';

/** HOME[p]: where p starts — and therefore where the other side is heading. */
const HOME = [null,
  ['a1', 'b1', 'c1', 'd1', 'e1', 'a2', 'e2'].map(toIndex),
  ['a5', 'b5', 'c5', 'd5', 'e5', 'a4', 'e4'].map(toIndex)];

const goalOf = (player) => HOME[other(player)];

/** A piece standing on one of its own destination positions is fixed there. */
function arrived(board, i) {
  const owner = ownerOf(board[i]);
  return owner !== 0 && goalOf(owner).indexOf(i) !== -1;
}

function standard() {
  const board = new Uint8Array(CELLS);
  for (const i of HOME[WHITE]) board[i] = WHITE;
  for (const i of HOME[BLACK]) board[i] = BLACK;
  return board;
}

function moves(state) {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== state.turn || arrived(state.board, i)) continue;
    for (const j of NEIGHBORS[i]) if (state.board[j] === EMPTY) out.push(step([i, j]));
  }
  return out;
}

const filled = (board, cells) => cells.filter((i) => board[i] !== EMPTY).length;

function judge(state) {
  if (state.over) return;
  if (state.started || state.ply >= 2) {
    for (const p of [other(state.turn), state.turn]) {          // the side that just moved first
      if (filled(state.board, goalOf(p)) === goalOf(p).length) {
        endGame(state, p, `${SIDES[other(p)].en}'s starting side is completely filled`, { cells: goalOf(p) });
        return;
      }
    }
  }
  if (!moves(state).length) {
    endGame(state, other(state.turn), `${is(SIDES[state.turn])} blocked and cannot move`);
  }
}

export default {
  id: 'fivefield',
  chapter: 3,
  name: NAME,
  motto: 'Atravessando o tabuleiro',
  family: 'deslocamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'fivefield', label: NAME }],

  rules: [
    'Seven pieces each, set up as in figure 3.2. White moves first.',
    'A piece steps to a free neighbouring position along a line, in any direction.',
    'A piece that reaches a destination position (where the opponent started) can no longer move.',
    'You win when the opponent’s starting side is completely filled with pieces of either colour — judged once each player has moved.',
    'A player who has no move on their turn loses.'
  ],
  notation: [
    ['d5 – d4', 'the piece on d5 steps to d4'],
    ['c2 – d2 #', 'the move that ends the match']
  ],

  decor() {
    return HOME[WHITE].map((index) => ({ index, kind: 'zone', side: WHITE }))
      .concat(HOME[BLACK].map((index) => ({ index, kind: 'zone', side: BLACK })));
  },

  initial(rules, setup) {
    const state = makeState({
      board: setup.board || standard(),
      turn: setup.turn || WHITE,
      started: !!setup.board
    });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    const chip = (p) => [{ label: 'far side filled', value: filled(state.board, goalOf(p)) + '/' + goalOf(p).length }];
    return [null, chip(WHITE), chip(BLACK)];
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
      if (arrived(state.board, mv.path[0])) {
        note(`the piece on ${sq(mv.path[0])} has reached its destination and can no longer move`);
      }
      plainStep(state, next, fx, mv, note);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
