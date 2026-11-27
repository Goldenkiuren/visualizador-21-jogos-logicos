/**
 * Chapter 14 — Halma: deslocando-se rapidamente por saltos.
 *
 * Six pieces each in opposite corners (figure 14.2). A piece steps to a free
 * neighbour along a line, or jumps one adjacent piece of either colour in a
 * straight line onto the free position beyond — and may keep jumping,
 * turning freely. Nothing is captured.
 *
 * As in Five Field Kono, the win is the opponent's starting corner
 * completely filled with pieces of either colour, judged once both players
 * have moved (the corners start full).
 */

import { toIndex, DIRS, NEIGHBORS, CELLS, stepFrom, ray, isAdjacent } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  step, lift, relocate, strayPlacement, noCaptures, sq
} from '../rules.js';

const NAME = 'Halma';

const HOME = [null,
  ['a3', 'a2', 'b2', 'a1', 'b1', 'c1'].map(toIndex),
  ['c5', 'd5', 'e5', 'd4', 'e4', 'e3'].map(toIndex)];

const goalOf = (player) => HOME[other(player)];
const filled = (board, cells) => cells.filter((i) => board[i] !== EMPTY).length;

function standard() {
  const board = new Uint8Array(CELLS);
  for (const i of HOME[WHITE]) board[i] = WHITE;
  for (const i of HOME[BLACK]) board[i] = BLACK;
  return board;
}

/** Every chain of jumps from `from` that never lands twice on one position. */
function hops(board, from) {
  const out = [];
  const work = Uint8Array.from(board);
  work[from] = EMPTY;                                 // the piece is in the air
  (function extend(pos, path) {
    for (const [dx, dy] of DIRS) {
      const over = stepFrom(pos, dx, dy);
      if (over < 0 || work[over] === EMPTY) continue;
      const land = stepFrom(over, dx, dy);
      if (land < 0 || work[land] !== EMPTY || path.indexOf(land) !== -1) continue;
      const p = path.concat(land);
      out.push(p);
      extend(land, p);
    }
  })(from, [from]);
  return out;
}

function moves(state) {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== state.turn) continue;
    for (const j of NEIGHBORS[i]) if (state.board[j] === EMPTY) out.push(step([i, j]));
    for (const path of hops(state.board, i)) out.push(step(path));
  }
  return out;
}

function judge(state) {
  if (state.over || !(state.started || state.ply >= 2)) return;
  for (const p of [other(state.turn), state.turn]) {            // the side that just moved first
    if (filled(state.board, goalOf(p)) === goalOf(p).length) {
      endGame(state, p, `${SIDES[other(p)].en}'s starting corner is completely filled`, { cells: goalOf(p) });
      return;
    }
  }
}

/** Check a recorded path: one plain step, or nothing but jumps. */
function walk(board, path, note) {
  if (path.length === 2 && isAdjacent(path[0], path[1])) {
    if (board[path[1]] !== EMPTY) note(`${sq(path[1])} is occupied`);
    return false;
  }
  const work = Uint8Array.from(board);
  work[path[0]] = EMPTY;                              // the piece is in the air
  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    const between = ray(a, b);
    if (between === null) {
      note(a === b ? `${sq(a)}–${sq(b)} goes nowhere` : `${sq(a)}–${sq(b)} does not follow a line of the board`);
      continue;
    }
    if (work[b] !== EMPTY) note(`${sq(b)} is occupied`);
    if (path.indexOf(b) <= k) note(`the path comes back to ${sq(b)}, where it has already been`);
    if (between.length === 0) note(`${sq(a)}–${sq(b)} is a plain step, which cannot be part of a chain of jumps`);
    else if (between.length > 1) note(`${sq(a)}–${sq(b)} is too far — a jump clears exactly one piece`);
    else if (work[between[0]] === EMPTY) note(`${sq(a)}–${sq(b)} jumps over nothing — there is no piece on ${sq(between[0])}`);
  }
  return true;
}

export default {
  id: 'halma',
  chapter: 14,
  name: NAME,
  motto: 'Deslocando-se rapidamente por saltos',
  family: 'deslocamento',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'halma', label: NAME }],

  rules: [
    'Six pieces each, set up in opposite corners as in figure 14.2. White moves first.',
    'A piece steps to a free neighbouring position along a line, in any direction.',
    'Or it jumps one adjacent piece — its own or the opponent’s — in a straight line onto the free position beyond.',
    'Several jumps may follow one another in the same turn, changing direction or not. Nothing is captured.',
    'You win when the opponent’s starting corner is completely filled with pieces of either colour — judged once each player has moved.'
  ],
  notation: [
    ['a1 – b2', 'a step to a neighbouring position'],
    ['a1 – c1', 'a jump over the piece on b1'],
    ['a1 – c1 – e3 – c5', 'a chain of jumps — write every landing']
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
    const chip = (p) => [{ label: 'far corner filled', value: filled(state.board, goalOf(p)) + '/' + goalOf(p).length }];
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
      const code = lift(state, mv.path[0], note);
      const jumping = walk(state.board, mv.path, note);
      relocate(next, fx, mv.path, code, jumping);
      noCaptures(next, fx, mv, me, note);
      eff = { kind: 'move', path: mv.path, caps: [] };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
