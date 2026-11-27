/**
 * Chapter 11 — Amazonas: criando bloqueios no tabuleiro.
 *
 * After Walter Zamkauskas' "El Juego de las Amazonas". A turn has two
 * parts: move one of your pieces any distance in a straight line along the
 * lines of the board, over free positions only; then, from where it landed,
 * throw a block piece the same way. The block stays where it falls and that
 * position is dead for the rest of the match.
 *
 * A player who cannot make a move on their turn loses.
 *
 * The book offers variants — one or two pieces each, starting on the board
 * (figure 11.2 shows one arrangement) or entering one at a time, anywhere,
 * before the moves begin. Any other agreed arrangement can be set with the
 * `[Brancas "…"]` / `[Pretas "…"]` headers.
 */

import { toIndex, DIRS, CELLS, stepFrom, ray } from '../coords.js';
import {
  EMPTY, WHITE, BLACK, BLOCK, SIDES, ownerOf, other, makeState, advance, endGame, newFx,
  empties, count, freeNeighbours, squaresOf, step, place, putPiece, lift, relocate, drop,
  noCaptures, sq, is
} from '../rules.js';

const NAME = 'Amazonas';

function figure11_2() {
  const board = new Uint8Array(CELLS);
  board[toIndex('c1')] = WHITE; board[toIndex('c5')] = WHITE;
  board[toIndex('a3')] = BLACK; board[toIndex('e3')] = BLACK;
  return board;
}

/** Every position reachable from `from` in a straight line over free positions. */
function reach(board, from) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    for (let j = stepFrom(from, dx, dy); j >= 0 && board[j] === EMPTY; j = stepFrom(j, dx, dy)) out.push(j);
  }
  return out;
}

function moves(state) {
  const me = state.turn;
  const board = state.board;
  if (state.hand[me] > 0) return empties(board).map((i) => place([i]));

  const out = [];
  const work = Uint8Array.from(board);
  for (let i = 0; i < CELLS; i++) {
    if (ownerOf(board[i]) !== me) continue;
    for (const to of reach(board, i)) {
      work[i] = EMPTY; work[to] = board[i];
      for (const hit of reach(work, to)) out.push(step([i, to, hit]));
      work[i] = board[i]; work[to] = EMPTY;
    }
  }
  return out;
}

/** A side can move as long as one of its pieces has a free neighbour (it can always throw back). */
function canMove(state) {
  const me = state.turn;
  if (state.hand[me] > 0) return state.board.includes(EMPTY);
  return squaresOf(state.board, me).some((i) => freeNeighbours(state.board, i).length > 0);
}

function judge(state) {
  if (!state.over && !canMove(state)) {
    endGame(state, other(state.turn), `${is(SIDES[state.turn])} blocked and cannot move`);
  }
}

/** Is a → b a straight run over free positions? Says why when it is not. */
function checkRun(board, a, b, verb, note) {
  if (board[b] !== EMPTY) note(`${sq(b)} is occupied`);
  const between = ray(a, b);
  if (between === null) {
    note(a === b ? `${sq(a)}–${sq(b)} goes nowhere` : `${sq(a)}–${sq(b)} does not follow a line of the board`);
  } else if (between.some((j) => board[j] !== EMPTY)) {
    note(`${sq(a)}–${sq(b)} ${verb} over a piece, which is not allowed`);
  }
}

export default {
  id: 'amazonas',
  chapter: 11,
  name: NAME,
  motto: 'Criando bloqueios no tabuleiro',
  family: 'bloqueio',
  roles: SIDES,
  first: WHITE,
  phases: true,
  clicks: [null, null, 'click where the block lands'],
  variants: [
    { id: 'amazonas', label: 'Amazonas — 2 peças, posição da figura 11.2', pieces: 2, onBoard: true },
    { id: 'amazonas-livre', label: 'Amazonas — 2 peças, entram por colocação', pieces: 2, onBoard: false },
    { id: 'amazonas-1', label: 'Amazonas — 1 peça, entra por colocação', pieces: 1, onBoard: false }
  ],

  rules: [
    'Each player has 1 or 2 pieces. They start on the board in agreed positions (figure 11.2), or enter one at a time, anywhere, before the moves begin.',
    'A turn has two parts. First move one of your pieces in a straight line along the lines of the board, as far as you like over free positions — no jumping.',
    'Then, from where it landed, throw a block piece the same way: in a straight line, any distance, without jumping.',
    'A block never moves and its position cannot be used again.',
    'A player who cannot move on their turn loses.'
  ],
  notation: [
    ['c1 – a1 – d4', 'the piece goes from c1 to a1, then throws a block from a1 to d4'],
    ['a3 – b3 – a3', 'a block may land on the position the piece just left'],
    ['c1', 'a piece entering the board (variants that start off the board)'],
    ['[Brancas "a1 e1"] [Pretas "a5 e5"]', 'any other agreed starting position']
  ],

  initial(rules, setup) {
    let board = setup.board;
    let hand = setup.hand;
    if (!board) {
      board = rules.onBoard ? figure11_2() : new Uint8Array(CELLS);
      hand = rules.onBoard ? [0, 0, 0] : [0, rules.pieces, rules.pieces];
    } else if (!hand) {
      hand = rules.onBoard ? [0, 0, 0]
        : [0, Math.max(0, rules.pieces - count(board, WHITE)), Math.max(0, rules.pieces - count(board, BLACK))];
    }
    const turn = setup.turn || WHITE;
    const state = makeState({ board, turn, hand, phase: hand[turn] > 0 ? 'place' : 'move', started: !!setup.board });
    judge(state);
    return state;
  },

  legalMoves(state) {
    return state.over ? [] : moves(state);
  },

  stats(state) {
    let blocks = 0;
    for (const code of state.board) if (code === BLOCK) blocks++;
    const chip = (p) => (state.hand[p] > 0 ? [{ label: 'in hand', value: String(state.hand[p]) }] : []);
    return [null, chip(WHITE), chip(BLACK).concat([{ label: 'blocks on board', value: String(blocks) }])];
  },

  play(state, mv, rules, note) {
    const me = state.turn;
    const next = advance(state);
    const fx = newFx();
    let eff;

    if (mv.kind === 'place') {
      const at = mv.path[0];
      if (state.hand[me] <= 0) note('every piece is already on the board — a turn is now a move and a throw');
      if (putPiece(next, fx, at, me, note) && next.hand[me] > 0) next.hand[me]--;
      eff = { kind: 'place', path: [at], caps: [] };
    } else {
      const path = mv.path;
      const from = path[0];
      const to = path[1];
      const code = lift(state, from, note);
      if (state.hand[me] > 0) note('every piece has to enter the board before any can move');

      checkRun(state.board, from, to, 'moves', note);
      relocate(next, fx, [from, to], code, false);

      if (path.length === 2) {
        note('the throw of the block piece is missing — write the move as origin – landing – block');
      } else {
        if (path.length > 3) note('a turn is one move and one throw — the rest of the path is ignored');
        const hit = path[2];
        checkRun(next.board, to, hit, 'throws the block', note);
        if (next.board[hit] === EMPTY) {
          fx.moves[0].t1 = 0.5;                       // the piece first, then the throw
          drop(next, fx, hit, BLOCK, { from: to, t0: 0.5 });
        }
      }
      eff = { kind: 'move', path: path.slice(0, 3), caps: [] };
    }
    noCaptures(next, fx, mv, me, note);

    next.turn = other(me);
    next.phase = next.hand[next.turn] > 0 ? 'place' : 'move';
    judge(next);
    return { next, fx, eff };
  }
};
