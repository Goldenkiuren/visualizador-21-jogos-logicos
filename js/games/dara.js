/**
 * Chapter 18 — Dara: alinhar para capturar.
 *
 * Ten pieces each. They are placed one per turn, and while placing it is
 * illegal to line up 3 or more of your own. A player who can no longer
 * place a piece without doing so opens the movement phase, and whatever
 * both players still hold is discarded.
 *
 * Then pieces step to free neighbours along the lines. A step that lines up
 * exactly 3 of your pieces — side by side on a drawn line — lets you remove
 * any one enemy piece: one piece only, even if two rows are made at once.
 * A row of 4 or more may never be formed. A row broken on one turn may be
 * made again on the next and counts anew.
 *
 * The match is won by leaving the opponent with only two pieces.
 *
 * Which piece comes off is the player's choice, so the record decides:
 * `b5 – b4 (x d3)`.
 */

import { NEIGHBORS, CELLS } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, manOf, other, colourOf, makeState, advance, endGame,
  newFx, count, empties, squaresOf, step, place, putPiece, plainStep, capture, declaredOnly,
  runsAt, chips, sq, sqs
} from '../rules.js';

const NAME = 'Dara';
const PIECES = 10;

/** The rows of `player` through `at`, longest first. */
function rows(board, at, player) {
  return runsAt(board, at, player).sort((a, b) => b.length - a.length);
}

/** Where the side to move may still place without lining up three. */
function placements(state) {
  const me = state.turn;
  const board = Uint8Array.from(state.board);
  return empties(board).filter((i) => {
    board[i] = manOf(me);
    const ok = rows(board, i, me)[0].length < 3;
    board[i] = EMPTY;
    return ok;
  });
}

function moves(state) {
  const me = state.turn;
  if (state.phase === 'place') return state.hand[me] > 0 ? placements(state).map((i) => place([i])) : [];

  const board = state.board;
  const foes = squaresOf(board, other(me));
  const work = Uint8Array.from(board);
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) {
      if (board[j] !== EMPTY) continue;
      work[i] = EMPTY; work[j] = board[i];
      const made = rows(work, j, me);
      work[i] = board[i]; work[j] = EMPTY;
      if (made[0].length >= 4) continue;                          // never allowed
      if (made[0].length === 3 && foes.length) for (const v of foes) out.push(step([i, j], [v]));
      else out.push(step([i, j]));
    }
  }
  return out;
}

/** Leave the placement phase when it can no longer go on. */
function settlePhase(state, info) {
  if (state.phase !== 'place') return;
  const p = state.turn;
  if (state.hand[WHITE] + state.hand[BLACK] === 0) {
    state.phase = 'move';
  } else if (state.hand[p] <= 0 || !placements(state).length) {
    info(state.hand[p] > 0
      ? `${SIDES[p].en} cannot place a piece without lining up 3 — ${SIDES[p].en} opens the movement phase and the pieces still in hand are discarded`
      : `${SIDES[p].en} has no piece left to place — the movement phase begins and the pieces still in hand are discarded`);
    state.hand = [0, 0, 0];
    state.phase = 'move';
  }
}

function judge(state) {
  if (state.over || state.phase !== 'move') return;
  for (const p of [WHITE, BLACK]) {
    const left = count(state.board, p);
    if (left <= 2 && count(state.board, other(p)) > 2) {
      endGame(state, other(p), `${SIDES[p].en} is left with ${left} piece${left === 1 ? '' : 's'}`);
      return;
    }
  }
}

export default {
  id: 'dara',
  chapter: 18,
  name: NAME,
  motto: 'Alinhar para capturar',
  family: 'alinhamento',
  roles: SIDES,
  first: WHITE,
  phases: true,
  variants: [{ id: 'dara', label: NAME }],

  rules: [
    'Ten pieces each, starting off the board. In turn each player places one piece on a free position.',
    'While placing, a row of 3 or more of your own pieces is not allowed. A player who cannot place without making one starts the movement phase; the pieces still in hand are discarded.',
    'Then a turn moves one piece a single step to a free neighbouring position along a line.',
    'A move that lines up exactly 3 of your pieces — side by side on a line of the board — removes any one enemy piece. Two rows in one move still remove only one.',
    'A row of 4 or more may never be formed. A row that was broken may be made again and counts anew.',
    'Leave the opponent with only two pieces to win.'
  ],
  notation: [
    ['b4', 'a piece placed on b4'],
    ['b5 – b4', 'a step'],
    ['b5 – b4 (x d3)', 'a step that makes a row of 3 and removes d3']
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
    if (setup.board) { settlePhase(state, () => {}); judge(state); }
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
      const at = mv.path[0];
      if (state.phase !== 'place') note('the placement phase is over — a piece now has to move');
      else if (state.hand[me] <= 0) note(`${SIDES[me].en} has no pieces left to place`);
      if (putPiece(next, fx, at, me, note)) {
        if (next.hand[me] > 0) next.hand[me]--;
        const longest = rows(next.board, at, me)[0];
        if (longest.length >= 3) {
          note(`placing on ${sq(at)} lines up ${longest.length} pieces (${sqs(longest)}), which is not allowed while placing`);
        }
      }
      let taken = [];
      if (mv.caps.length) {
        note('nothing is captured while pieces are being placed');
        taken = declaredOnly(next, fx, mv.caps, me, note);
      }
      eff = { kind: 'place', path: [at], caps: taken };
    } else {
      if (state.phase === 'place') note('pieces only move once the placement phase is over');
      const code = plainStep(state, next, fx, mv, note);
      const to = mv.path[mv.path.length - 1];
      const owner = ownerOf(code) || me;
      const made = rows(next.board, to, owner);
      const foes = squaresOf(next.board, other(owner));
      let taken = [];

      if (made[0].length >= 4) {
        note(`this lines up ${made[0].length} pieces (${sqs(made[0])}) — a row of 4 or more is never allowed`);
        taken = declaredOnly(next, fx, mv.caps, me, note);
      } else if (made[0].length === 3) {
        if (!foes.length) {
          if (mv.caps.length) note('there is no enemy piece left to remove');
        } else if (!mv.caps.length) {
          note(`a row of 3 was made (${sqs(made[0])}) — it removes an enemy piece, but the record does not say which`);
        } else {
          if (mv.caps.length > 1) note('a row of 3 removes one piece only, however many rows are made');
          const victim = mv.caps[0];
          if (foes.indexOf(victim) === -1) note(`there is no ${colourOf(other(owner))} piece on ${sq(victim)} to remove`);
          else { capture(next, fx, victim); taken.push(victim); }
        }
      } else if (mv.caps.length) {
        note('no row of 3 was made, so nothing is captured');
        taken = declaredOnly(next, fx, mv.caps, me, note);
      }
      eff = { kind: 'move', path: mv.path, caps: taken };
    }

    next.turn = foe;
    settlePhase(next, info);
    judge(next);
    return { next, fx, eff };
  }
};
