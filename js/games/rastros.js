/**
 * Chapter 4 — Rastros: uma única vez em cada lugar.
 *
 * Both players move the *same* piece. It starts on b2 and steps to a free
 * neighbour along a line; the position it leaves is blocked for good, so
 * every position is visited at most once.
 *
 * Player 1 (who starts) is heading for e5, player 2 for a1 — the piece
 * starts nearer the second player's destination (figure 4.2). You win when
 * the piece reaches your destination, or when the opponent, on their turn,
 * cannot move it.
 *
 * The book does not say what happens when a player steps onto the
 * *opponent's* destination; as in Bill Taylor's original the match then
 * goes to the player whose destination it is.
 *
 * On the board the piece is white and the blocks are block pieces; `turn`
 * is 1 for player 1 and 2 for player 2.
 */

import { toIndex, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLOCK, other, makeState, advance, endGame, newFx, freeNeighbours,
  step, checkStep, relocate, drop, noCaptures, formatMove, sq
} from '../rules.js';

const NAME = 'Rastros';
const START = toIndex('b2');
const GOAL = [-1, toIndex('e5'), toIndex('a1')];
const ROLES = [null, { pt: 'Jogador 1', en: 'Player 1' }, { pt: 'Jogador 2', en: 'Player 2' }];

const pieceOn = (board) => board.indexOf(WHITE);

function judge(state) {
  if (state.over) return;
  const at = pieceOn(state.board);
  if (at < 0) return;
  for (const p of [1, 2]) {
    if (at === GOAL[p]) {
      endGame(state, p, `the piece reached ${sq(at)}, the destination of ${ROLES[p].en}`);
      return;
    }
  }
  if (!freeNeighbours(state.board, at).length) {
    endGame(state, other(state.turn), `the piece is blocked — ${ROLES[state.turn].en} cannot move`);
  }
}

export default {
  id: 'rastros',
  chapter: 4,
  name: NAME,
  motto: 'Uma única vez em cada lugar',
  family: 'bloqueio',
  roles: ROLES,
  first: 1,
  sharedPiece: true,
  variants: [{ id: 'rastros', label: NAME }],

  rules: [
    'There is one piece, moved by both players in turn. It starts on b2.',
    'It steps to a free neighbouring position along a line; the position it leaves is blocked for the rest of the match.',
    'Player 1, who starts, wins by bringing the piece to e5; player 2 by bringing it to a1.',
    'A player who cannot move the piece on their turn loses.',
    'Not in the book: a piece moved onto the opponent’s destination wins for the opponent, as in the original Rastros.'
  ],
  notation: [
    ['c3', 'the piece moves to c3 — only the destination is written'],
    ['e1 – e2', 'the same move with its origin'],
    ['e2 #', 'the move that ends the match']
  ],

  decor() {
    return [
      { index: GOAL[1], kind: 'goal', text: '2', caption: 'destino jogador 1' },
      { index: GOAL[2], kind: 'goal', text: '1', caption: 'destino jogador 2' }
    ];
  },

  initial(rules, setup) {
    let board = setup.board;
    if (!board) {
      board = new Uint8Array(CELLS);
      board[START] = WHITE;
    }
    const state = makeState({ board, turn: setup.turn || 1, started: !!setup.board });
    if (setup.board) judge(state);
    return state;
  },

  check(state) {
    return pieceOn(state.board) < 0
      ? ['Rastros needs its piece on the board — give its position with [Peça "b2"]'] : [];
  },

  legalMoves(state) {
    if (state.over) return [];
    const at = pieceOn(state.board);
    return at < 0 ? [] : freeNeighbours(state.board, at).map((j) => step([at, j]));
  },

  format(mv) {
    return formatMove(mv, { destinationOnly: true });
  },

  stats() {
    return [null,
      [{ label: 'heading for', value: sq(GOAL[1]) }],
      [{ label: 'heading for', value: sq(GOAL[2]) }]];
  },

  /** The scoreline shows no piece count here: nobody owns the piece. */
  tally() {
    return [null, '', ''];
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    const from = pieceOn(state.board);
    const to = mv.path[mv.path.length - 1];

    if (mv.kind === 'move') {
      if (mv.path.length > 2) note('the piece moves one step per turn');
      if (from >= 0 && mv.path[0] !== from) note(`the piece is on ${sq(from)}, not on ${sq(mv.path[0])}`);
    }

    if (from < 0) {
      note('the piece is not on the board');
      if (next.board[to] === EMPTY) drop(next, fx, to, WHITE);
    } else if (to === from) {
      note(`the piece is already on ${sq(to)} — it has to move`);
    } else {
      if (state.board[to] === BLOCK) note(`${sq(to)} is blocked — every position can be visited only once`);
      else checkStep(state.board, from, to, note);
      relocate(next, fx, [from, to], WHITE, false);
      drop(next, fx, from, BLOCK);
    }
    noCaptures(next, fx, mv, me, note);

    next.turn = other(me);
    judge(next);
    return { next, fx, eff: { kind: 'move', path: [from, to], caps: [] } };
  }
};
