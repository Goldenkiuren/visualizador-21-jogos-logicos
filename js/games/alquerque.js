/**
 * Chapter 5 — Alquerque (Fetaix): pioneiros da captura.
 *
 * Twelve against twelve with the centre free (figure 5.1). A plain move is
 * one step to a free neighbour along a line. A capture jumps an adjacent
 * enemy onto the free node beyond and may chain into further jumps, turning
 * freely; jumped pieces leave the board only once the whole path is done, so
 * they still block and cannot be jumped twice (p. 130).
 *
 * The book suggests three stages, each adding a rule (p. 132):
 *   Alquerque              any direction, no promotion
 *   Alquerque + promoção   a piece finishing on the far rank becomes a Mullah
 *   Fetaix                 …and men never step backwards, except to capture
 *
 * A Mullah moves any distance along a line, like a dama, and captures the
 * same way: any distance up to its victim, landing any distance beyond. A
 * path that merely passes through the far rank does not promote (fig. 5.6).
 *
 * Capture is mandatory and the largest capture must be taken — but the
 * opponent may let it pass (p. 128), so a record that skips one is legal.
 * The viewer mentions it without flagging the move.
 */

import { toIndex, rowOf, DIRS, NEIGHBORS, CELLS, stepFrom } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, isKing, kingOf, other, colourOf, makeState, advance,
  endGame, newFx, count, step, lift, relocate, strayPlacement, settleCaptures, walkPath,
  jumpChains, markQuiet, formatMove, chips, sq
} from '../rules.js';

/** Figure 5.1: 12 against 12, the centre node free. White at the bottom. */
export function startingPosition() {
  const board = new Uint8Array(CELLS);
  for (let i = 0; i < 10; i++) board[i] = WHITE;              // ranks 1–2
  for (let i = 15; i < 25; i++) board[i] = BLACK;             // ranks 4–5
  board[toIndex('a3')] = WHITE; board[toIndex('b3')] = WHITE;
  board[toIndex('d3')] = BLACK; board[toIndex('e3')] = BLACK;
  return board;
}

/** The rank a piece must finish on to be promoted. */
const farRow = (player) => (player === WHITE ? 4 : 0);
/** +1 when `player` advances up the board, -1 when down. */
const ahead = (player) => (player === WHITE ? 1 : -1);

function moves(state, rules) {
  const me = state.turn;
  const board = state.board;
  const out = [];

  for (let i = 0; i < CELLS; i++) {
    const code = board[i];
    if (ownerOf(code) !== me) continue;
    const king = isKing(code);
    const crowns = (j) => !king && rules.promotion && rowOf(j) === farRow(me);

    if (king) {
      for (const [dx, dy] of DIRS) {
        for (let j = stepFrom(i, dx, dy); j >= 0 && board[j] === EMPTY; j = stepFrom(j, dx, dy)) out.push(step([i, j]));
      }
    } else {
      for (const j of NEIGHBORS[i]) {
        if (board[j] !== EMPTY) continue;
        if (rules.forwardOnly && (rowOf(j) - rowOf(i)) * ahead(me) < 0) continue;
        out.push(step([i, j], [], { promo: crowns(j) }));
      }
    }
    for (const chain of jumpChains(board, i, me, king)) {
      out.push(step(chain.path, chain.caps, { promo: crowns(chain.path[chain.path.length - 1]) }));
    }
  }
  return markQuiet(out, true, formatMove);
}

function judge(state) {
  if (state.over) return;
  for (const p of [WHITE, BLACK]) {
    if (count(state.board, p) === 0 && count(state.board, other(p)) > 0) {
      endGame(state, other(p), `every ${colourOf(p)} piece has been captured`);
      return;
    }
  }
}

export default {
  id: 'alquerque',
  chapter: 5,
  name: 'Alquerque (Fetaix)',
  motto: 'Pioneiros da captura',
  family: 'captura',
  roles: SIDES,
  first: WHITE,
  promotes: true,
  variants: [
    { id: 'alquerque', label: 'Alquerque', promotion: false, forwardOnly: false },
    { id: 'promocao',  label: 'Alquerque + promoção', promotion: true, forwardOnly: false },
    { id: 'fetaix',    label: 'Fetaix', promotion: true, forwardOnly: true }
  ],

  rules: [
    'Twelve pieces each, set up as in figure 5.1 with the centre free. White moves first.',
    'A piece steps to a free neighbouring position along a line.',
    'It captures by jumping an adjacent enemy piece in a straight line onto the free position beyond; several jumps may follow in one turn, changing direction or not.',
    'Captured pieces leave the board only when the whole move is over, so they cannot be jumped twice.',
    'Capture is mandatory — the opponent may demand it — and the largest capture available must be taken.',
    'Alquerque + promoção: a piece that ends its move on the far rank becomes a Mullah, moving and capturing any distance along a line. Passing through the far rank in mid-capture does not promote.',
    'Fetaix: in addition, ordinary pieces never move backwards, straight or diagonally, except to capture.',
    'Capture every enemy piece to win. With very few pieces left the players usually agree a draw.'
  ],
  notation: [
    ['c3 – b4', 'a step'],
    ['a4 – a2 (x a3)', 'a capture; the list of pieces taken is optional'],
    ['e3 – e5 – c3 (x e4 d4)', 'a multiple capture — write the whole path'],
    ['a4 – a5 [Mullah]', 'a promotion (=Mullah also works)'],
    ['a5 – d2', 'a Mullah moving several positions']
  ],

  initial(rules, setup) {
    const board = setup.board || startingPosition();
    const lost = setup.lost || [0, 0, 0];
    const state = makeState({ board, turn: setup.turn || WHITE, lost, started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  legalMoves(state, rules) {
    return state.over ? [] : moves(state, rules);
  },

  stats(state) {
    return chips(state, { captured: true });
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let landing, wasKing, eff;

    if (mv.kind === 'place') {
      // Alquerque starts with every piece already on the board.
      landing = mv.path[0];
      wasKing = isKing(state.board[landing]);
      strayPlacement(next, fx, landing, me, 'Alquerque', note);
      eff = { kind: 'place', path: [landing], caps: [] };
    } else {
      const path = mv.path;
      landing = path[path.length - 1];
      const code = lift(state, path[0], note);
      wasKing = isKing(code);

      const jumped = walkPath(state.board, path, {
        me,
        king: wasKing,
        forward: rules.forwardOnly ? ahead(me) : 0,
        backwardNote: 'in Fetaix a piece may only move backwards to capture'
      }, note);
      const taken = settleCaptures(next, fx, mv.caps, jumped, me, note, 'pieces jumped');
      relocate(next, fx, path, code, taken.length > 0);
      eff = { kind: 'move', path, caps: taken };
    }

    // ---- promotion ---------------------------------------------------------
    const onFarRank = rowOf(landing) === farRow(me);
    if (mv.promotion || mv.promo) {
      if (!rules.promotion) note(`${rules.label} has no promotion — that is Fetaix`);
      else if (!onFarRank) note(`${sq(landing)} is not on the far rank, so nothing is promoted`);
      next.board[landing] = kingOf(ownerOf(next.board[landing]) || me);
    } else if (rules.promotion && onFarRank && !wasKing) {
      note(`the move finishes on ${sq(landing)} but [Mullah] is not recorded`);
    }
    eff.promo = !wasKing && isKing(next.board[landing]);

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
