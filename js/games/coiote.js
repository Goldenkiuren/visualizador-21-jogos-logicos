/**
 * Chapter 12 — Coiote e Galinhas: se não o pegarmos, ele nos come.
 *
 * A hunt game on its original board ("Catch the Hare" of Afonso X's Libro
 * de los Juegos). One coyote (black, c3) against twelve hens (white,
 * figure 12.2). The coyote moves first.
 *
 * Every piece steps to a free neighbour along a line, in any direction.
 * Only the coyote captures: it jumps an adjacent hen onto the free node
 * beyond, and may go on jumping in the same turn, turning freely. Jumped
 * hens leave when the move is over, as in Alquerque.
 *
 * The hens win by trapping the coyote — no step and no jump left. The
 * coyote wins by eating 6 hens, half of them.
 */

import { toIndex, NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, ownerOf, other, makeState, advance, endGame, newFx, count,
  step, lift, relocate, strayPlacement, settleCaptures, walkPath, jumpChains, chips
} from '../rules.js';

const NAME = 'Coiote e Galinhas';
const HENS = WHITE, COYOTE = BLACK;
const FLOCK = 12;
const MEALS = 6;
const ROLES = [null, { pt: 'Galinhas', en: 'Hens', plural: true }, { pt: 'Coiote', en: 'Coyote' }];

function standard() {
  const board = new Uint8Array(CELLS);
  for (let i = 15; i < 25; i++) board[i] = HENS;              // ranks 4–5
  board[toIndex('a3')] = HENS; board[toIndex('e3')] = HENS;
  board[toIndex('c3')] = COYOTE;
  return board;
}

function moves(state) {
  const me = state.turn;
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(state.board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) if (state.board[j] === EMPTY) out.push(step([i, j]));
    if (me === COYOTE) for (const chain of jumpChains(state.board, i, me, false)) out.push(step(chain.path, chain.caps));
  }
  return out;
}

function judge(state) {
  if (state.over) return;
  if (state.lost[HENS] >= MEALS) {
    endGame(state, COYOTE, `the coyote has eaten ${state.lost[HENS]} hens`);
  } else if (state.turn === COYOTE && count(state.board, COYOTE) > 0 && !moves(state).length) {
    endGame(state, HENS, 'the coyote is trapped and cannot move');
  }
}

export default {
  id: 'coiote',
  chapter: 12,
  name: NAME,
  motto: 'Se não o pegarmos, ele nos come',
  family: 'caça',
  roles: ROLES,
  first: COYOTE,
  variants: [{ id: 'coiote', label: NAME }],

  rules: [
    'One coyote (black, on c3) against twelve hens (white), set up as in figure 12.2. The coyote moves first.',
    'Every piece steps to a free neighbouring position along a line, in any direction.',
    'The coyote captures a hen beside it by jumping over it, in a straight line, onto the free position beyond — and may go on jumping in the same turn, in any direction.',
    'The hens cannot capture. They win by trapping the coyote so that it cannot move.',
    'The coyote wins by eating 6 hens.'
  ],
  notation: [
    ['c3 – c2', 'the coyote (or a hen) steps'],
    ['c3 – a5 (x b4)', 'the coyote eats the hen on b4'],
    ['c3 – a5 – a3 (x b4 a4)', 'two hens in one turn — write the whole path']
  ],

  initial(rules, setup) {
    const board = setup.board || standard();
    const lost = setup.lost || [0, setup.board ? Math.max(0, FLOCK - count(board, HENS)) : 0, 0];
    const state = makeState({ board, turn: setup.turn || COYOTE, lost, started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    return chips(state, { captured: true, only: COYOTE, goal: [0, 0, MEALS] });
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
      const jumped = walkPath(state.board, mv.path, {
        me,
        canJump: ownerOf(code) === COYOTE,
        noJumpNote: 'the hens cannot jump — only the coyote captures'
      }, note);
      const taken = settleCaptures(next, fx, mv.caps, jumped, me, note, 'hens jumped');
      relocate(next, fx, mv.path, code, taken.length > 0);
      eff = { kind: 'move', path: mv.path, caps: taken };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
