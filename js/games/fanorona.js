/**
 * Chapter 19 — Fanorona: captura por aproximação e afastamento.
 *
 * The game of Madagascar on half its board ("Minifanorona"). Twelve pieces
 * each as in figure 19.2: the middle rank alternates and the centre is free.
 *
 * A piece steps to a free neighbour along a line. Two things capture:
 *   · approach — the step brings the piece right next to an enemy piece
 *     straight ahead: that piece and every enemy piece in an unbroken row
 *     behind it, along the line of the move, are taken;
 *   · withdrawal — the piece steps directly away from an enemy piece it was
 *     touching: that piece and the unbroken row behind it are taken.
 * When one step does both, the player picks one (figure 19.5).
 *
 * Capture is mandatory when the opponent demands it. The book describes no
 * chains of captures, so a turn is a single step. Capturing everything wins.
 *
 * Which of the two captures is taken is the player's choice, so the record
 * decides: `b3 – c3 (x a3)` withdraws, `b3 – c3 (x d3)` approaches.
 */

import { toIndex, NEIGHBORS, CELLS, stepFrom, direction, isAdjacent } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, SIDES, ownerOf, other, colourOf, makeState, advance, endGame, newFx,
  count, step, plainStep, strayPlacement, capture, settleCaptures, sameSet, markQuiet,
  formatMove, chips, sqs
} from '../rules.js';

const NAME = 'Fanorona';

function standard() {
  const board = new Uint8Array(CELLS);
  for (let i = 0; i < 10; i++) board[i] = WHITE;              // ranks 1–2
  for (let i = 15; i < 25; i++) board[i] = BLACK;             // ranks 4–5
  board[toIndex('a3')] = WHITE; board[toIndex('d3')] = WHITE;
  board[toIndex('b3')] = BLACK; board[toIndex('e3')] = BLACK;
  return board;
}

/** The unbroken row of `foe` pieces starting on `start` and running along (dx, dy). */
function rowFrom(board, start, dx, dy, foe) {
  const out = [];
  for (let j = start; j >= 0 && ownerOf(board[j]) === foe; j = stepFrom(j, dx, dy)) out.push(j);
  return out;
}

/** What the step a → b would capture, each way. `board` is the position before the step. */
function captures(board, a, b, me) {
  const [dx, dy] = direction(a, b);
  const foe = other(me);
  const ahead = stepFrom(b, dx, dy);
  const behind = stepFrom(a, -dx, -dy);
  return {
    approach: ahead >= 0 ? rowFrom(board, ahead, dx, dy, foe) : [],
    withdrawal: behind >= 0 ? rowFrom(board, behind, -dx, -dy, foe) : []
  };
}

function moves(state) {
  const me = state.turn;
  const board = state.board;
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const j of NEIGHBORS[i]) {
      if (board[j] !== EMPTY) continue;
      const { approach, withdrawal } = captures(board, i, j, me);
      if (approach.length) out.push(step([i, j], approach));
      if (withdrawal.length) out.push(step([i, j], withdrawal));
      if (!approach.length && !withdrawal.length) out.push(step([i, j]));
    }
  }
  return markQuiet(out, false, formatMove);
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

const shared = (a, b) => a.filter((v) => b.indexOf(v) !== -1).length;

export default {
  id: 'fanorona',
  chapter: 19,
  name: NAME,
  motto: 'Captura por aproximação e afastamento',
  family: 'captura',
  roles: SIDES,
  first: WHITE,
  variants: [{ id: 'fanorona', label: NAME }],

  rules: [
    'Twelve pieces each, set up as in figure 19.2 with the centre free. White moves first.',
    'A piece steps to a free neighbouring position along a line.',
    'Approach: a step that ends right next to an enemy piece straight ahead captures it, together with every enemy piece in an unbroken row behind it on the line of the move.',
    'Withdrawal: a step directly away from an enemy piece it was touching captures that piece and the unbroken row behind it.',
    'If one step would capture both ways, the player chooses one of the two.',
    'Capture is mandatory — the opponent may demand it. Capture every enemy piece to win.'
  ],
  notation: [
    ['c2 – c3', 'a step'],
    ['b2 – b3 (x b4)', 'a capture by approach'],
    ['d2 – d1 (x d3 d4 d5)', 'a capture by withdrawal, taking a whole row'],
    ['b3 – c3 (x a3)', 'when both are possible, the list says which one was chosen']
  ],

  initial(rules, setup) {
    const board = setup.board || standard();
    const state = makeState({ board, turn: setup.turn || WHITE, lost: setup.lost || [0, 0, 0], started: !!setup.board });
    if (setup.board) judge(state);
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
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      strayPlacement(next, fx, mv.path[0], me, NAME, note);
      eff = { kind: 'place', path: mv.path, caps: [] };
    } else {
      const a = mv.path[0];
      const b = mv.path[mv.path.length - 1];
      const clean = mv.path.length === 2 && isAdjacent(a, b);
      const code = plainStep(state, next, fx, mv, note);
      const { approach, withdrawal } = clean
        ? captures(state.board, a, b, ownerOf(code) || me)
        : { approach: [], withdrawal: [] };
      const declared = mv.caps;
      let taken;

      if (approach.length && withdrawal.length) {
        if (!declared.length) {
          note(`this step captures by approach (${sqs(approach)}) or by withdrawal (${sqs(withdrawal)}) — the record does not say which, so approach is shown`);
          taken = approach;
        } else if (sameSet(declared, approach)) {
          taken = approach;
        } else if (sameSet(declared, withdrawal)) {
          taken = withdrawal;
        } else {
          note(`recorded captures (${sqs(declared)}) match neither the approach (${sqs(approach)}) nor the withdrawal (${sqs(withdrawal)})`);
          taken = shared(declared, withdrawal) > shared(declared, approach) ? withdrawal : approach;
        }
        for (const v of taken) capture(next, fx, v);
      } else {
        const only = approach.length ? approach : withdrawal;
        taken = settleCaptures(next, fx, declared, only, me, note,
          approach.length ? 'pieces taken by approach' : withdrawal.length ? 'pieces taken by withdrawal' : 'pieces captured');
      }
      if (mv.capAlt && mv.capAlt.length) {
        info(`the record leaves the choice open (${sqs(declared)} or ${sqs(mv.capAlt)}) — the first is shown`);
      }
      eff = { kind: 'move', path: mv.path, caps: taken };
    }

    next.turn = other(me);
    judge(next);
    return { next, fx, eff };
  }
};
