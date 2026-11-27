/**
 * input.js — playing a move by clicking the board.
 *
 * Nothing here touches the page: a legal move is turned into the clicks that
 * make it, and the clicks made so far are matched against those. The page
 * (app.js) only reports clicks and draws the hints.
 *
 * The clicks of a move are the nodes of its path, in order. When several
 * moves share a path and differ only in what they remove — the extra piece
 * in Yoté, the victim in Dara, approach or withdrawal in Fanorona — one more
 * click, on a piece that only one of them takes, tells them apart.
 */

import { EMPTY, signature } from './rules.js';
import { legalMoves } from './state.js';

/**
 * Every legal move of `state` with its clicks.
 * @returns {Array<{mv, steps: number[][], choice: boolean}>}  `steps[k]` lists
 *          the nodes accepted as click k; `choice` marks a final click that
 *          picks what is removed.
 */
export function clickSequences(game, rules, state) {
  const seen = new Set();
  const groups = new Map();
  for (const mv of legalMoves(game, rules, state, false)) {
    const sig = signature(mv);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const key = mv.kind + ':' + mv.path.join('-');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mv);
  }

  const out = [];
  for (const list of groups.values()) {
    const shared = list[0].caps.filter((c) => list.every((m) => m.caps.indexOf(c) !== -1));
    for (const mv of list) {
      const steps = mv.path.map((i) => [i]);
      const only = list.length > 1 ? mv.caps.filter((c) => shared.indexOf(c) === -1) : [];
      if (only.length) steps.push(only);
      out.push({ mv, steps, choice: only.length > 0 });
      // A pair of placements (Seega) can be clicked in either order.
      if (mv.kind === 'place' && mv.path.length === 2) out.push({ mv, steps: [steps[1], steps[0]], choice: false });
    }
  }
  return out;
}

/** The sequences that agree with the clicks made so far. */
export function fitting(sequences, clicks) {
  return sequences.filter((s) =>
    s.steps.length >= clicks.length && clicks.every((c, k) => s.steps[k].indexOf(c) !== -1));
}

/**
 * The clicks in effect: those made, or — before any — the one piece that can
 * move, chosen in advance (the fox, the coyote, the piece of Rastros).
 */
export function clicksInEffect(sequences, clicks) {
  if (clicks.length || !sequences.length) return clicks;
  const start = sequences[0].steps[0][0];
  const lone = sequences.every((s) => s.mv.kind === 'move' && s.steps[0].length === 1 && s.steps[0][0] === start);
  return lone ? [start] : clicks;
}

/**
 * One more click, on node `index`.
 * @returns {{clicks: number[], move: object|null}}  the clicks to remember,
 *          and the move if this click completed one.
 */
export function press(sequences, clicks, index) {
  const sofar = clicksInEffect(sequences, clicks);

  if (sofar.length && index === sofar[sofar.length - 1]) {
    // The same node again: stop the chain here if that is a move, else let go.
    const done = fitting(sequences, sofar).filter((s) => s.steps.length === sofar.length);
    return { clicks: [], move: done.length ? done[0].mv : null };
  }

  let next = sofar.concat(index);
  let open = fitting(sequences, next);
  if (!open.length) { next = [index]; open = fitting(sequences, next); }     // start over from this node
  if (!open.length) return { clicks: [], move: null };

  const done = open.filter((s) => s.steps.length === next.length);
  if (done.length && done.length === open.length) return { clicks: [], move: done[0].mv };
  return { clicks: next, move: null };
}

/**
 * What to draw and what to ask for, given the clicks so far.
 *   hints   [{ index, kind }] — 'pick' a piece that may be chosen, 'sel' the
 *           piece chosen, 'via' a node of the path so far, 'stop' the node to
 *           click again to end here, 'to' a free node, 'take' a piece to take
 *   ask     'place' | 'place-or-move' | 'pick' | 'go' | 'take'
 *   ends    the clicks so far already make a move (a chain may stop here)
 */
export function hintsFor(sequences, clicks, board) {
  const sofar = clicksInEffect(sequences, clicks);
  const open = fitting(sequences, sofar);
  const ends = sofar.length > 0 && open.some((s) => s.steps.length === sofar.length);
  const hints = [];
  const seen = new Set();
  const hint = (index, kind) => {
    if (seen.has(index)) return;
    seen.add(index);
    hints.push({ index, kind });
  };

  sofar.forEach((index, k) => {
    hint(index, k === sofar.length - 1 && k > 0 && ends ? 'stop' : k === 0 ? 'sel' : 'via');
  });

  let placing = false, picking = false, going = false, taking = false;
  for (const s of open) {
    const step = s.steps[sofar.length];
    if (!step) continue;
    const choosing = s.choice && sofar.length === s.steps.length - 1;
    for (const index of step) {
      const free = board[index] === EMPTY;
      if (!sofar.length && !free) { hint(index, 'pick'); picking = true; }
      else if (free && !choosing) { hint(index, 'to'); if (s.mv.kind === 'place') placing = true; else going = true; }
      else { hint(index, 'take'); taking = true; }
    }
  }

  const ask = !sofar.length ? (placing && picking ? 'place-or-move' : placing ? 'place' : 'pick')
    : taking && !going && !placing ? 'take'
    : placing ? 'place' : 'go';
  return { hints, ask, ends, step: sofar.length };
}

/** The clicks that play `mv`, for tests and scripted play. */
export function clicksFor(sequences, mv) {
  const sig = signature(mv);
  const seq = sequences.find((s) => signature(s.mv) === sig);
  if (!seq) return null;
  const list = seq.steps.map((step) => step[0]);
  // A move that is the start of a longer one ends on a second click of its last node.
  const longer = fitting(sequences, list).some((s) => s.steps.length > list.length);
  return longer ? list.concat(list[list.length - 1]) : list;
}
