/**
 * Chapter 20 — Four Field Kono: saltando sobre a própria peça.
 *
 * The Korean game, adapted to this board with Alquerque's starting position
 * (figure 20.2). A piece steps to a free neighbour along a line.
 *
 * The capture is the odd one: a piece jumps over one of its *own* adjacent
 * pieces, in a straight line, and lands on the enemy piece standing right
 * behind it — which is removed, the attacker taking its place. One capture
 * per turn, no chains.
 *
 * Capture is mandatory when the opponent demands it; with none available a
 * piece must move. The match is won by leaving the opponent with a single
 * piece.
 *
 * The capture lands on its victim, so the book writes it `e5 – x e3`.
 */

import { DIRS, NEIGHBORS, CELLS, stepFrom, ray } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx, count,
  step, lift, checkStep, relocate, capture, strayPlacement, settleCaptures, sameSet,
  markQuiet, formatMove, chips, sq, sqs
} from '../rules.js';
import { startingPosition } from './alquerque.js';

const NAME = 'Four Field Kono';
const format = (mv) => formatMove(mv, { replace: true });

function moves(state) {
  const me = state.turn;
  const foe = other(me);
  const board = state.board;
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (board[j] === EMPTY) out.push(step([i, j]));
    for (const [dx, dy] of DIRS) {
      const over = stepFrom(i, dx, dy);
      if (over < 0 || ownerOf(board[over]) !== me) continue;
      const land = stepFrom(over, dx, dy);
      if (land >= 0 && ownerOf(board[land]) === foe) out.push(step([i, land], [land]));
    }
  }
  return markQuiet(out, false, format);
}

function judge(state) {
  if (state.over) return;
  for (const p of [WHITE, BLACK]) {
    const left = count(state.board, p);
    if (left <= 1 && count(state.board, other(p)) > 1) {
      endGame(state, other(p), `${SIDES[p].en} is left with ${left === 1 ? 'a single piece' : 'no pieces'}`);
      return;
    }
  }
}

export default {
  id: 'kono4',
  chapter: 20,
  name: NAME,
  motto: 'Saltando sobre a própria peça',
  family: 'captura',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'kono4', label: NAME }],

  rules: [
    'Twelve pieces each, set up as in figure 20.2 (the same as Alquerque). White moves first.',
    'A piece steps to a free neighbouring position along a line, in any direction.',
    'To capture, a piece jumps over one of its own adjacent pieces, in a straight line, and lands on the enemy piece right behind it. That piece is removed and the attacker takes its place.',
    'Only one piece can be captured per turn. Capture is mandatory — the opponent may demand it.',
    'Leave the opponent with a single piece to win. With very few pieces on both sides the players may agree a draw.'
  ],
  notation: [
    ['c2 – c3', 'a step'],
    ['e5 – x e3', 'a capture: the piece on e5 jumps its own e4 and takes the piece on e3'],
    ['e5 x e3', 'the same capture, written shorter']
  ],

  initial(rules, setup) {
    const board = setup.board || startingPosition();
    const state = makeState({ board, turn: setup.turn || WHITE, lost: setup.lost || [0, 0, 0], started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  format,

  stats(state) {
    return chips(state, { captured: true });
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
      const path = mv.path;
      const a = path[0];
      const b = path[path.length - 1];
      const code = lift(state, a, note);
      const side = ownerOf(code) || me;
      let taken = [];

      if (path.length > 2) note('a turn is one step or one capture — captures cannot be chained');

      if (state.board[b] !== EMPTY && ownerOf(state.board[b]) === other(side)) {
        // Landing on an enemy piece: a capture, or an attempt at one.
        const between = path.length === 2 ? ray(a, b) : null;
        if (path.length === 2) {
          if (between === null) {
            note(`${sq(a)}–${sq(b)} does not follow a line of the board`);
          } else if (between.length !== 1) {
            note(`${sq(a)}–${sq(b)} is not a jump over one of your own pieces onto the enemy piece right behind it`);
          } else if (state.board[between[0]] === EMPTY) {
            note(`there is no piece on ${sq(between[0])} to jump over — a capture leaps one of your own pieces`);
          } else if (ownerOf(state.board[between[0]]) !== side) {
            note(`${sq(between[0])} is not your own piece — a capture leaps one of your own pieces`);
          }
        }
        if (mv.caps.length && !sameSet(mv.caps, [b])) {
          note(`recorded captures (${sqs(mv.caps)}) do not match the piece taken (${sq(b)})`);
        }
        capture(next, fx, b);
        taken = [b];
        relocate(next, fx, path, code, true);
      } else {
        if (mv.takes) note(`written as a capture (x), but there is no enemy piece on ${sq(b)}`);
        if (path.length === 2) checkStep(state.board, a, b, note);
        relocate(next, fx, path, code, false);
        taken = settleCaptures(next, fx, mv.caps, [], me, note, 'piece taken');
      }
      eff = { kind: 'move', path, caps: taken };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
