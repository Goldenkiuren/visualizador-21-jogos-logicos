/**
 * coords.js — square naming and the geometry of the board every game shares.
 *
 * Squares are named `a1` … `e5`: file a–e = column 0–4 (left to right),
 * rank 1–5 = row 0–4 (bottom to top). Internally a square is a single
 * integer index `col + row * 5`, so a whole board state fits in 25 bytes.
 *
 * The board (chapter 1 of the book) has 5 horizontals, 5 verticals, 2 long
 * diagonals and 4 short diagonals. Everything here is about *drawn* lines
 * unless a name says otherwise (`stepAny`, `GRID_LINES`).
 */

export const SIZE = 5;
export const CELLS = SIZE * SIZE;
export const FILES = ['a', 'b', 'c', 'd', 'e'];

/** "c3" -> 12, or -1 when the string is not a square. */
export function toIndex(square) {
  if (typeof square !== 'string' || square.length !== 2) return -1;
  const col = square.charCodeAt(0) - 97;          // 'a'
  const row = square.charCodeAt(1) - 49;          // '1'
  if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return -1;
  return col + row * SIZE;
}

/** 12 -> "c3" */
export function toSquare(index) {
  return FILES[index % SIZE] + (Math.floor(index / SIZE) + 1);
}

export const colOf = (index) => index % SIZE;
export const rowOf = (index) => Math.floor(index / SIZE);

/** The centre node, c3 — off limits while placing in Tonkin and Seega. */
export const CENTER = 12;

/**
 * On this board only "even" nodes (col + row even) carry diagonals.
 * That single rule generates the two long diagonals plus the four short ones.
 */
export const hasDiagonals = (index) => (colOf(index) + rowOf(index)) % 2 === 0;

/** One step from `index` in direction (dx, dy), or -1 if no drawn line goes there. */
export function stepFrom(index, dx, dy) {
  if (dx && dy && !hasDiagonals(index)) return -1;
  const c = colOf(index) + dx;
  const r = rowOf(index) + dy;
  if (c < 0 || c >= SIZE || r < 0 || r >= SIZE) return -1;
  return c + r * SIZE;
}

/**
 * One step on the bare 5×5 grid, whether or not a line is drawn there.
 * Only Tic Tackle needs this: its diagonal alignments count "mesmo onde não
 * há linha".
 */
export function stepAny(index, dx, dy) {
  const c = colOf(index) + dx;
  const r = rowOf(index) + dy;
  if (c < 0 || c >= SIZE || r < 0 || r >= SIZE) return -1;
  return c + r * SIZE;
}

/** True when the two squares are joined by a drawn line and one step apart. */
export function isAdjacent(a, b) {
  const dx = colOf(b) - colOf(a);
  const dy = rowOf(b) - rowOf(a);
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (dx === 0 && dy === 0)) return false;
  return stepFrom(a, dx, dy) === b;
}

/**
 * The squares strictly between `a` and `b` when `b` is reachable from `a` by
 * repeating one direction along drawn lines; `null` when it is not.
 *
 * Because a diagonal step keeps col+row parity, a run that starts on a node
 * carrying diagonals stays on such nodes — which is why this never "turns the
 * corner" at c1/a3/c5/e3 where the four small diagonals meet.
 * An adjacent pair returns `[]`.
 */
export function ray(a, b) {
  const dc = colOf(b) - colOf(a);
  const dr = rowOf(b) - rowOf(a);
  if (dc === 0 && dr === 0) return null;
  if (dc !== 0 && dr !== 0 && Math.abs(dc) !== Math.abs(dr)) return null;   // not 45°

  const dx = Math.sign(dc);
  const dy = Math.sign(dr);
  const steps = Math.max(Math.abs(dc), Math.abs(dr));
  const between = [];
  let cur = a;

  for (let n = 0; n < steps; n++) {
    const next = stepFrom(cur, dx, dy);
    if (next < 0) return null;
    if (n === steps - 1) return next === b ? between : null;
    between.push(next);
    cur = next;
  }
  return null;
}

/** The unit direction from `a` towards `b` on the bare grid, or null if they are not aligned. */
export function direction(a, b) {
  const dc = colOf(b) - colOf(a);
  const dr = rowOf(b) - rowOf(a);
  if (dc === 0 && dr === 0) return null;
  if (dc !== 0 && dr !== 0 && Math.abs(dc) !== Math.abs(dr)) return null;
  return [Math.sign(dc), Math.sign(dr)];
}

/** The eight compass directions, orthogonals first. */
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];

/** One direction per axis — enough to look for rows of pieces. */
export const AXES = [[1, 0], [0, 1], [1, 1], [1, -1]];

/** For every node, the nodes one drawn step away. */
export const NEIGHBORS = (() => {
  const out = [];
  for (let i = 0; i < CELLS; i++) {
    const list = [];
    for (const [dx, dy] of DIRS) {
      const j = stepFrom(i, dx, dy);
      if (j >= 0) list.push(j);
    }
    out.push(list);
  }
  return out;
})();

/**
 * The line segments that make up the drawn board:
 * 5 horizontals, 5 verticals, 2 long diagonals and 4 short diagonals.
 * Each entry is [fromIndex, toIndex, kind].
 */
export const LINES = (() => {
  const out = [];
  for (let r = 0; r < SIZE; r++) out.push([r * SIZE, r * SIZE + 4, 'h']);
  for (let c = 0; c < SIZE; c++) out.push([c, c + 20, 'v']);
  out.push([toIndex('a1'), toIndex('e5'), 'diag']);   // long \
  out.push([toIndex('a5'), toIndex('e1'), 'diag']);   // long /
  out.push([toIndex('a3'), toIndex('c1'), 'diag']);   // short, forming the
  out.push([toIndex('c1'), toIndex('e3'), 'diag']);   // central diamond
  out.push([toIndex('e3'), toIndex('c5'), 'diag']);
  out.push([toIndex('c5'), toIndex('a3'), 'diag']);
  return out;
})();

/**
 * The same 16 lines as lists of nodes: 12 lines of five positions and the
 * four short diagonals of three (p. 139 counts them exactly this way).
 */
export const BOARD_LINES = (() => {
  const out = [];
  for (let r = 0; r < SIZE; r++) out.push([0, 1, 2, 3, 4].map((c) => c + r * SIZE));
  for (let c = 0; c < SIZE; c++) out.push([0, 1, 2, 3, 4].map((r) => c + r * SIZE));
  out.push(['a1', 'b2', 'c3', 'd4', 'e5'].map(toIndex));
  out.push(['a5', 'b4', 'c3', 'd2', 'e1'].map(toIndex));
  out.push(['a3', 'b4', 'c5'].map(toIndex));
  out.push(['c5', 'd4', 'e3'].map(toIndex));
  out.push(['e3', 'd2', 'c1'].map(toIndex));
  out.push(['c1', 'b2', 'a3'].map(toIndex));
  return out;
})();

/** Every straight line of the bare 5×5 grid, drawn or not (rows, columns, all diagonals). */
export const GRID_LINES = (() => {
  const out = [];
  for (const [dx, dy] of AXES) {
    for (let i = 0; i < CELLS; i++) {
      if (stepAny(i, -dx, -dy) >= 0) continue;        // not where a line begins
      const line = [i];
      for (let j = stepAny(i, dx, dy); j >= 0; j = stepAny(j, dx, dy)) line.push(j);
      if (line.length > 1) out.push(line);
    }
  }
  return out;
})();
