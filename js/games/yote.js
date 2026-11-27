/**
 * Chapter 13 — Yoté: colocar, mover ou capturar?
 *
 * Twelve pieces each, all starting off the board. On every turn a player
 * chooses one of three things:
 *   · place a new piece on any free position;
 *   · step a piece to a free neighbour along a line;
 *   · capture, jumping an adjacent enemy piece onto the free node beyond.
 * Jumps are never chained. A capture earns a bonus: one more enemy piece of
 * the capturer's choice comes off the board, if there is one.
 *
 * Capturing everything wins. If a player can do none of the three things on
 * their turn the match stops and whoever captured more wins. With both
 * sides down to 3 pieces or fewer the match may be called a draw.
 *
 * The bonus piece is the player's choice, so here the record decides:
 * `b4 – d2 (x c3 c1)` jumps c3 and also removes c1.
 */

import { DIRS, NEIGHBORS, CELLS, stepFrom, ray } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, colourOf, makeState, advance, endGame, newFx,
  count, empties, squaresOf, step, place, putPiece, lift, checkStep, relocate, capture,
  settleCaptures, walkPath, chips, sq, sqs
} from '../rules.js';

const NAME = 'Yoté';
const PIECES = 12;

function moves(state) {
  const me = state.turn;
  const foe = other(me);
  const board = state.board;
  const out = [];
  if (state.hand[me] > 0) for (const i of empties(board)) out.push(place([i]));

  const foes = squaresOf(board, foe);
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (board[j] === EMPTY) out.push(step([i, j]));
    for (const [dx, dy] of DIRS) {
      const over = stepFrom(i, dx, dy);
      if (over < 0 || ownerOf(board[over]) !== foe) continue;
      const land = stepFrom(over, dx, dy);
      if (land < 0 || board[land] !== EMPTY) continue;
      const bonus = foes.filter((v) => v !== over);
      if (!bonus.length) out.push(step([i, land], [over]));
      for (const extra of bonus) out.push(step([i, land], [over, extra]));
    }
  }
  return out;
}

const remaining = (state, p) => count(state.board, p) + state.hand[p];

function judge(state, info) {
  if (state.over) return;
  for (const p of [WHITE, BLACK]) {
    if (remaining(state, p) === 0 && remaining(state, other(p)) > 0) {
      endGame(state, other(p), `every ${colourOf(p)} piece has been captured`);
      return;
    }
  }
  if (!moves(state).length) {
    const white = state.lost[BLACK];
    const black = state.lost[WHITE];
    endGame(state, white > black ? WHITE : black > white ? BLACK : 0,
      `${SIDES[state.turn].en} can neither place, move nor capture — White captured ${white}, Black captured ${black}`);
  }
}

const fewLeft = (state) => remaining(state, WHITE) <= 3 && remaining(state, BLACK) <= 3;

export default {
  id: 'yote',
  chapter: 13,
  name: NAME,
  motto: 'Colocar, mover ou capturar?',
  family: 'captura',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'yote', label: NAME }],

  rules: [
    'Twelve pieces each, starting off the board. White begins.',
    'On your turn do one of three things: place a new piece on any free position; step a piece to a free neighbouring position along a line; or capture.',
    'A capture jumps an adjacent enemy piece in a straight line onto the free position beyond. Jumps cannot be chained.',
    'After a capture you also remove one more enemy piece of your choice from the board, if there is one.',
    'Capture every enemy piece to win. If a player cannot place, move or capture, the match ends and whoever captured more wins.',
    'When both players are down to 3 pieces or fewer the match may be considered drawn.'
  ],
  notation: [
    ['b2', 'a piece placed on b2'],
    ['b4 – c5', 'a step'],
    ['b4 – d2 (x c3 c1)', 'a capture: c3 is jumped and c1 is the extra piece removed']
  ],

  initial(rules, setup) {
    const board = setup.board || new Uint8Array(CELLS);
    const lost = setup.lost || [0, 0, 0];
    const hand = setup.hand || [0,
      Math.max(0, PIECES - count(board, WHITE) - lost[WHITE]),
      Math.max(0, PIECES - count(board, BLACK) - lost[BLACK])];
    const state = makeState({ board, turn: setup.turn || WHITE, hand, lost, phase: 'place', started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    return chips(state, { captured: true, hand: true });
  },

  play(state, mv, rules, note, info) {
    const me = state.turn;
    const foe = other(me);
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      const at = mv.path[0];
      if (state.hand[me] <= 0) note(`${SIDES[me].en} has no pieces left to place`);
      if (putPiece(next, fx, at, me, note) && next.hand[me] > 0) next.hand[me]--;
      const taken = settleCaptures(next, fx, mv.caps, [], me, note, 'pieces jumped');
      eff = { kind: 'place', path: [at], caps: taken };
    } else {
      const path = mv.path;
      const a = path[0];
      const b = path[path.length - 1];
      const code = lift(state, a, note);
      const between = path.length === 2 ? ray(a, b) : null;
      const jumps = between !== null && between.length === 1 &&
        ownerOf(state.board[between[0]]) === foe && state.board[b] === EMPTY;
      let taken = [];

      if (jumps) {
        const jumped = between[0];
        const others = squaresOf(state.board, foe).filter((v) => v !== jumped);
        const extras = mv.caps.filter((v) => v !== jumped);
        if (mv.caps.length && mv.caps.indexOf(jumped) === -1) {
          note(`the piece jumped, ${sq(jumped)}, is missing from the recorded captures (${sqs(mv.caps)})`);
        }
        capture(next, fx, jumped);
        taken.push(jumped);

        if (!others.length) {
          if (extras.length) note(`there is no other ${colourOf(foe)} piece on the board to remove`);
        } else if (!extras.length) {
          note('a capture also removes one more enemy piece — the record does not say which');
        } else {
          if (extras.length > 1) note('only one extra piece comes off after a capture');
          const extra = extras[0];
          if (others.indexOf(extra) === -1) note(`there is no ${colourOf(foe)} piece on ${sq(extra)} to remove`);
          else { capture(next, fx, extra); taken.push(extra); }
        }
        relocate(next, fx, path, code, true);
      } else if (path.length > 2) {
        note('jumps cannot be chained in Yoté — one capture per turn');
        const jumped = walkPath(state.board, path, { me }, note);
        taken = settleCaptures(next, fx, mv.caps, jumped, me, note, 'pieces jumped');
        relocate(next, fx, path, code, taken.length > 0);
      } else {
        checkStep(state.board, a, b, note);
        taken = settleCaptures(next, fx, mv.caps, [], me, note, 'pieces jumped');
        relocate(next, fx, path, code, false);
      }
      eff = { kind: 'move', path, caps: taken };
    }

    next.turn = foe;
    judge(next, info);
    if (!next.over && fewLeft(next) && !fewLeft(state)) {
      info('both players are down to 3 pieces or fewer — the match may be considered drawn');
    }
    return { next, fx, eff };
  }
};
