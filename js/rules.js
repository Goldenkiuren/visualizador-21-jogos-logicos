/**
 * rules.js — piece codes, the per-ply state, and the mechanics several games
 * share: plain steps, chains of jumps, rows of pieces, capture bookkeeping.
 *
 * A board is a Uint8Array(25); one byte per node:
 *   0 empty · 1 white · 2 black · 3 white Mullah · 4 black Mullah · 5 block
 *
 * "White" and "black" are colours, not turn order: each game says who moves
 * first (black does in Coiote e Galinhas and in Tigres e Vacas).
 *
 * Everything here serves a *viewer*: a move that breaks a rule is still
 * carried out as written, and the rule it broke is reported through `note`.
 */

import {
  CELLS, DIRS, AXES, NEIGHBORS, BOARD_LINES,
  toSquare, stepFrom, ray, isAdjacent, rowOf
} from './coords.js';

export const EMPTY = 0, WHITE = 1, BLACK = 2, WHITE_KING = 3, BLACK_KING = 4, BLOCK = 5;

export const ownerOf = (code) => (code === WHITE || code === WHITE_KING ? WHITE
  : code === BLACK || code === BLACK_KING ? BLACK : 0);
export const isKing  = (code) => code === WHITE_KING || code === BLACK_KING;
export const manOf   = (player) => (player === WHITE ? WHITE : BLACK);
export const kingOf  = (player) => (player === WHITE ? WHITE_KING : BLACK_KING);
export const other   = (player) => 3 - player;
export const colourOf = (player) => (player === WHITE ? 'white' : 'black');

export const sq  = toSquare;
export const sqs = (list) => list.map(toSquare).join(' ');

/** How the two sides are called when a game has no names of its own. */
export const SIDES = [null, { pt: 'Brancas', en: 'White' }, { pt: 'Pretas', en: 'Black' }];

/** "White wins" / "Dogs win". */
export const wins = (role) => `${role.en} ${role.plural ? 'win' : 'wins'}`;
/** "White has" / "Dogs have". */
export const has = (role) => `${role.en} ${role.plural ? 'have' : 'has'}`;
/** "White is" / "Dogs are". */
export const is = (role) => `${role.en} ${role.plural ? 'are' : 'is'}`;

/* ------------------------------------------------------------------ state */

/**
 * One state per ply. Everything a game needs to continue from here lives in
 * this object, which is what makes seeking a single array lookup.
 *
 *   board    the 25 nodes
 *   turn     colour to move
 *   hand     [·, white, black] pieces not yet on the board, or null
 *   lost     [·, white, black] pieces captured so far, by colour of the piece
 *   phase    'place' | 'move' — what the side to move does next
 *   ply      moves made since the start
 *   started  true when both sides are past their first move (custom positions)
 *   over     null, or { winner: 0 draw | 1 | 2, reason, line? }
 *   skip     colour whose turn the rules just skipped (Seega), else 0
 *   ext      whatever else one game needs
 */
export function makeState(o) {
  return {
    board: o.board,
    turn: o.turn,
    hand: o.hand || null,
    lost: o.lost || [0, 0, 0],
    phase: o.phase || 'move',
    ply: 0,
    started: !!o.started,
    over: null,
    skip: 0,
    ext: o.ext || {}
  };
}

/** A copy to mutate into the next ply. */
export function advance(s) {
  return {
    board: Uint8Array.from(s.board),
    turn: s.turn,
    hand: s.hand ? s.hand.slice() : null,
    lost: s.lost.slice(),
    phase: s.phase,
    ply: s.ply + 1,
    started: s.started,
    over: s.over,
    skip: 0,
    ext: Object.assign({}, s.ext)
  };
}

/** Record the result once; later moves never rewrite it. */
export function endGame(state, winner, reason, extra) {
  if (!state.over) state.over = Object.assign({ winner, reason }, extra);
}

export function count(board, player) {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (ownerOf(board[i]) === player) n++;
  return n;
}

export function squaresOf(board, player) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (ownerOf(board[i]) === player) out.push(i);
  return out;
}

export function empties(board) {
  const out = [];
  for (let i = 0; i < CELLS; i++) if (board[i] === EMPTY) out.push(i);
  return out;
}

export const freeNeighbours = (board, i) => NEIGHBORS[i].filter((j) => board[j] === EMPTY);

/** Piece counts for the scoreline: [white, black]. */
export function counts(board) {
  return [count(board, WHITE), count(board, BLACK)];
}

/**
 * The small figures shown beside each side's piece count.
 *   opts.captured  show how many enemy pieces each side has taken
 *   opts.goal      [·, white, black] captures that side needs to win
 * Returns [·, chips for white, chips for black]; a chip is { label, value }.
 */
export function chips(state, opts) {
  const o = opts || {};
  const out = [null, [], []];
  for (const p of [WHITE, BLACK]) {
    if (state.hand && (state.hand[p] > 0 || o.hand)) out[p].push({ label: 'in hand', value: String(state.hand[p]) });
    if (o.captured && !(o.only && o.only !== p)) {
      const goal = o.goal ? o.goal[p] : 0;
      out[p].push({ label: 'captured', value: state.lost[other(p)] + (goal ? '/' + goal : '') });
    }
  }
  return out;
}

/* ------------------------------------------------------------- move shapes */

export const step  = (path, caps, extra) => Object.assign({ kind: 'move', path, caps: caps || [], promo: false }, extra);
export const place = (path, caps, extra) => Object.assign({ kind: 'place', path, caps: caps || [], promo: false }, extra);

/** Two moves are the same move when they agree on this string. */
export function signature(mv) {
  return mv.kind + ':' + mv.path.join('-') + ':' +
         mv.caps.slice().sort((a, b) => a - b).join(',') + ':' + (mv.promo ? 1 : 0);
}

/**
 * The notation of a move, in the book's style.
 *   style.destinationOnly   Rastros writes only where the piece goes
 *   style.replace           "e5 - x e3": the capture lands on its victim
 */
export function formatMove(mv, style) {
  const s = style || {};
  let text;
  if (mv.kind === 'place') text = mv.path.map(toSquare).join(' ');
  else if (s.destinationOnly) text = toSquare(mv.path[mv.path.length - 1]);
  else if (s.replace && mv.caps.length) text = toSquare(mv.path[0]) + ' - x ' + toSquare(mv.path[1]);
  else text = mv.path.map(toSquare).join(' - ');

  if (mv.caps.length && !s.replace) {
    text += mv.groups
      ? mv.groups.map((g) => ' (x ' + sqs(g) + ')').join('')
      : ' (x ' + sqs(mv.caps) + ')';
  }
  if (mv.promo) text += ' [Mullah]';
  return text;
}

/**
 * Flag the moves that dodge a capture the rules oblige. They stay legal in a
 * record — the book lets the opponent waive the capture (p. 128) — so the
 * viewer only mentions it.
 */
export function markQuiet(moves, largestOnly, fmt) {
  let max = 0;
  for (const m of moves) if (m.caps.length > max) max = m.caps.length;
  if (!max) return moves;
  const best = moves.find((m) => m.caps.length === max);
  for (const m of moves) {
    if (m.caps.length === 0) {
      m.quiet = `capture is mandatory when the opponent demands it — ${fmt(best)} was available`;
    } else if (largestOnly && m.caps.length < max) {
      m.quiet = `the largest capture must be taken — ${fmt(best)} takes ${max}`;
    }
  }
  return moves;
}

/* --------------------------------------------------------------------- fx */

/**
 * What a ply does on screen, so the view can animate it in either direction:
 *   moves    [{ route, arc, code, t0?, t1? }]   pieces that travel
 *   adds     [{ index, code, from?, t0? }]      pieces that appear
 *   removes  [{ index, code, clash? }]          pieces that leave
 */
export const newFx = () => ({ moves: [], adds: [], removes: [] });

/** Take the piece on `index` off the board as a capture. */
export function capture(next, fx, index) {
  const code = next.board[index];
  if (code === EMPTY) return;
  fx.removes.push({ index, code });
  const owner = ownerOf(code);
  if (owner) next.lost[owner]++;
  next.board[index] = EMPTY;
}

/** Move a piece along `path`; whatever stood on the landing node is displaced. */
export function relocate(next, fx, path, code, arc) {
  const from = path[0];
  const to = path[path.length - 1];
  next.board[from] = EMPTY;
  const occupant = next.board[to];
  if (occupant !== EMPTY) fx.removes.push({ index: to, code: occupant, clash: true });
  next.board[to] = code;
  fx.moves.push({ route: path.slice(), arc: !!arc, code });
}

/** Put a new piece on the board. */
export function drop(next, fx, index, code, extra) {
  next.board[index] = code;
  fx.adds.push(Object.assign({ index, code }, extra));
}

/* -------------------------------------------------------- lenient checking */

/** The piece a move starts from — or a stand-in when the record points at nothing. */
export function lift(state, from, note) {
  const code = state.board[from];
  if (code === EMPTY) {
    note(`there is no piece on ${sq(from)}`);
    return manOf(state.turn);
  }
  if (code === BLOCK) {
    note(`${sq(from)} holds a block, which never moves`);
    return manOf(state.turn);
  }
  if (ownerOf(code) !== state.turn) note(`${sq(from)} holds a ${colourOf(ownerOf(code))} piece`);
  return code;
}

/** Is a → b one step to a free neighbour along a line? Says why when it is not. */
export function checkStep(board, a, b, note) {
  let ok = true;
  if (board[b] !== EMPTY) { note(`${sq(b)} is occupied`); ok = false; }
  const between = ray(a, b);
  if (between === null) {
    note(a === b ? `${sq(a)}–${sq(b)} goes nowhere` : `${sq(a)}–${sq(b)} does not follow a line of the board`);
    ok = false;
  } else if (between.length) {
    note(`${sq(a)}–${sq(b)} is more than one step`);
    ok = false;
  }
  return ok;
}

/** A turn that is one plain step and nothing else. Returns the piece moved. */
export function plainStep(state, next, fx, mv, note) {
  const path = mv.path;
  const code = lift(state, path[0], note);
  if (path.length > 2) note('a move is a single step to a neighbouring position, not a path');
  else checkStep(state.board, path[0], path[1], note);
  relocate(next, fx, path, code, false);
  return code;
}

/** A lone coordinate in a game (or phase) where nothing is placed. */
export function strayPlacement(next, fx, at, me, name, note) {
  note(`a lone coordinate — ${name} has no placement phase`);
  if (next.board[at] !== EMPTY) note(`${sq(at)} was already occupied`);
  else drop(next, fx, at, manOf(me));
}

/** A movement in a game where pieces never move: flagged, then carried out. */
export function strayMove(state, next, fx, mv, name, note) {
  note(`${name} has no movement — pieces are only placed`);
  relocate(next, fx, mv.path, lift(state, mv.path[0], note), false);
}

/** A placement on `at`; reports an occupied node instead of overwriting it. */
export function putPiece(next, fx, at, me, note, extra) {
  if (next.board[at] !== EMPTY) { note(`${sq(at)} is already occupied`); return false; }
  drop(next, fx, at, manOf(me), extra);
  return true;
}

export function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const x = a.slice().sort((m, n) => m - n).join(',');
  const y = b.slice().sort((m, n) => m - n).join(',');
  return x === y;
}

/** Remove what the record lists when the rules themselves capture nothing. */
export function declaredOnly(next, fx, declared, me, note) {
  const taken = [];
  for (const v of declared) {
    const code = next.board[v];
    if (code === EMPTY) note(`there is nothing to capture on ${sq(v)}`);
    else if (code === BLOCK) note(`${sq(v)} holds a block, which cannot be captured`);
    else if (ownerOf(code) === me) note(`${sq(v)} is your own piece and cannot be captured`);
    else { capture(next, fx, v); taken.push(v); }
  }
  return taken;
}

/**
 * Settle a capture the rules fully determine (`actual`) against what the
 * record lists (`declared`, possibly empty).
 *
 * When the rules do capture something they win, and a record that disagrees
 * is flagged: the list is redundant there and a mismatch is nearly always a
 * typo — the book's own figure 5.6 prints two. When the rules capture nothing
 * but the record insists, the enemy pieces it names are removed, flagged.
 */
export function settleCaptures(next, fx, declared, actual, me, note, what) {
  const label = what || 'pieces captured';
  if (actual.length) {
    if (declared.length && !sameSet(declared, actual)) {
      note(`recorded captures (${sqs(declared)}) do not match the ${label} (${sqs(actual)})`);
    }
    for (const v of actual) capture(next, fx, v);
    return actual.slice();
  }
  if (declared.length) {
    note(`recorded captures (${sqs(declared)}) do not match the ${label} (none)`);
    return declaredOnly(next, fx, declared, me, note);
  }
  return [];
}

/** A capture list in a game that has no captures at all. */
export function noCaptures(next, fx, mv, me, note) {
  if (!mv.caps.length) return;
  note('there are no captures in this game');
  declaredOnly(next, fx, mv.caps, me, note);
}

/* ---------------------------------------------------------- rows of pieces */

/** The unbroken row of `player`'s pieces through `index` along one axis ([] if not theirs). */
export function runAt(board, index, dx, dy, player, stepFn) {
  if (ownerOf(board[index]) !== player) return [];
  const go = stepFn || stepFrom;
  const run = [index];
  for (let j = go(index, dx, dy); j >= 0 && ownerOf(board[j]) === player; j = go(j, dx, dy)) run.push(j);
  for (let j = go(index, -dx, -dy); j >= 0 && ownerOf(board[j]) === player; j = go(j, -dx, -dy)) run.unshift(j);
  return run;
}

/** One row per axis through `index`. */
export function runsAt(board, index, player, stepFn) {
  return AXES.map(([dx, dy]) => runAt(board, index, dx, dy, player, stepFn));
}

export function longestRunAt(board, index, player, stepFn) {
  let best = [];
  for (const run of runsAt(board, index, player, stepFn)) if (run.length > best.length) best = run;
  return best;
}

/** Every maximal row of two or more same-coloured pieces on the given lines. */
export function maximalRuns(board, lines) {
  const out = [];
  for (const line of lines || BOARD_LINES) {
    let k = 0;
    while (k < line.length) {
      const player = ownerOf(board[line[k]]);
      if (!player) { k++; continue; }
      let e = k + 1;
      while (e < line.length && ownerOf(board[line[e]]) === player) e++;
      if (e - k >= 2) out.push({ player, cells: line.slice(k, e) });
      k = e;
    }
  }
  return out;
}

/* ------------------------------------------------------------ jump captures */

/**
 * Every capture by jumping open to the piece on `from`, as { path, caps }.
 *
 * A man jumps an adjacent enemy onto the free node just beyond; a Mullah may
 * glide to its victim and land any distance past it. Jumps chain, turning
 * freely. Jumped pieces stay on the board until the move ends (p. 130), so
 * they keep blocking and cannot be jumped twice. Every stopping point is
 * returned, not just the longest chains.
 */
export function jumpChains(board, from, me, king) {
  const out = [];
  const work = Uint8Array.from(board);
  work[from] = EMPTY;                               // the piece is in the air
  const foe = other(me);

  (function extend(pos, path, caps) {
    for (const [dx, dy] of DIRS) {
      let victim = stepFrom(pos, dx, dy);
      if (king) while (victim >= 0 && work[victim] === EMPTY) victim = stepFrom(victim, dx, dy);
      if (victim < 0 || ownerOf(work[victim]) !== foe || caps.indexOf(victim) !== -1) continue;

      for (let land = stepFrom(victim, dx, dy); land >= 0 && work[land] === EMPTY; land = stepFrom(land, dx, dy)) {
        const p = path.concat(land);
        const c = caps.concat(victim);
        out.push({ path: p, caps: c });
        extend(land, p, c);
        if (!king) break;                           // a man lands right behind
      }
    }
  })(from, [from], []);

  return out;
}

/**
 * Walk each leg of a recorded path over a board where nothing has been
 * removed yet, collecting the pieces jumped and complaining about anything
 * that does not look like a legal step or leap.
 *
 *   opts.me            the side to move
 *   opts.king          the piece glides (Mullah)
 *   opts.canJump       false for pieces that never capture (hens, goats)
 *   opts.noJumpNote    what to say when such a piece jumps anyway
 *   opts.forward       +1 / -1: plain steps may not go against it (Fetaix)
 *   opts.backwardNote  what to say when one does
 */
export function walkPath(board, path, opts, note) {
  const work = Uint8Array.from(board);
  work[path[0]] = EMPTY;                            // the piece is in the air
  const king = !!opts.king;
  const canJump = opts.canJump !== false;
  const jumped = [];

  for (let k = 0; k < path.length - 1; k++) {
    const a = path[k];
    const b = path[k + 1];
    const between = ray(a, b);

    if (between === null) {
      note(a === b ? `${sq(a)}–${sq(b)} goes nowhere` : `${sq(a)}–${sq(b)} does not follow a line of the board`);
      continue;
    }
    if (work[b] !== EMPTY) note(`${sq(b)} is occupied`);

    const blockers = between.filter((j) => work[j] !== EMPTY);

    if (blockers.length === 0) {
      // A plain move. It can only be the whole turn, never one leg of a jump.
      if (path.length > 2) {
        note(`${sq(a)}–${sq(b)} jumps over nothing, so the path cannot continue`);
      } else if (!king && !isAdjacent(a, b)) {
        note(`${sq(a)}–${sq(b)} is more than one step`);
      } else if (opts.forward && !king && (rowOf(b) - rowOf(a)) * opts.forward < 0) {
        note(opts.backwardNote);
      }
    } else if (blockers.length === 1) {
      const victim = blockers[0];
      if (!canJump) {
        note(opts.noJumpNote || `${sq(a)}–${sq(b)} jumps over ${sq(victim)}, which this piece cannot do`);
      } else if (ownerOf(work[victim]) === opts.me) {
        note(`${sq(victim)} is your own piece and cannot be jumped`);
      } else if (jumped.indexOf(victim) !== -1) {
        note(`${sq(victim)} is jumped twice in the same move`);
      } else {
        jumped.push(victim);
      }
      if (canJump && !king && (between.length !== 1 || !isAdjacent(b, victim))) {
        note(`${sq(a)}–${sq(b)} is not a jump onto the node just beyond ${sq(victim)}`);
      }
    } else {
      note(`${sq(a)}–${sq(b)} passes over ${blockers.length} pieces`);
    }
  }
  return jumped;
}
