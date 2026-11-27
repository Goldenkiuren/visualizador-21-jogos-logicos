/**
 * fuzz.test.js — every game against itself.
 *
 * Each game is described twice: `legalMoves` lists what the rules allow, and
 * `play` carries out whatever a record says and names the rule it broke.
 * These tests make the two keep each other honest:
 *
 *   · random legal matches are written out in notation, parsed again and
 *     replayed — they must come back without a single flag and end on the
 *     very same position;
 *   · random *arbitrary* moves must never slip through unflagged unless
 *     they really are in the legal list.
 */

import { suite, test, assert, rng } from './harness.js';
import { playout } from './util.js';
import { parse } from '../js/parser.js';
import { VARIANTS, findVariant, buildTimeline } from '../js/state.js';
import { signature, count, WHITE, BLACK, EMPTY } from '../js/rules.js';
import { toSquare, CELLS } from '../js/coords.js';

const noop = () => {};

suite('fuzz — legal matches replay without a flag', () => {
  for (const v of VARIANTS) {
    test(`${v.id}: 40 random matches`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const { game, texts, state } = playout(v.id, seed * 7919 + v.chapter, 160);
        // One move per line: turn order must come from the rules, not the layout.
        const record = texts.join('\n');
        const timeline = buildTimeline(parse(record, game.parse), v.id);
        assert.equal(timeline.plies.length, texts.length, `seed ${seed}: plies`);
        assert.same(timeline.warnings, [], `seed ${seed}: ${record.split('\n').slice(0, 12).join(' / ')} …`);
        const end = timeline.states[timeline.states.length - 1];
        assert.same(end.board, state.board, `seed ${seed}: final board`);
        assert.equal(end.turn, state.turn, `seed ${seed}: side to move`);
        assert.same(end.lost, state.lost, `seed ${seed}: captures`);
        assert.same(end.hand, state.hand, `seed ${seed}: pieces in hand`);
        assert.same(end.over, state.over, `seed ${seed}: result`);
      }
    });
  }
});

/**
 * Games where the count of pieces is not constant by design: the two with an
 * unlimited supply, Dara (unplaced pieces are discarded) and Rastros (every
 * move leaves a block behind and nobody owns the piece).
 */
const OPEN_SUPPLY = ['velha4', 'pahtum', 'pahtum-original', 'dara', 'rastros'];

suite('fuzz — pieces are never created or lost by accident', () => {
  for (const v of VARIANTS) {
    if (OPEN_SUPPLY.indexOf(v.id) !== -1) continue;
    test(`${v.id}: on board + in hand + captured stays constant`, () => {
      for (let seed = 1; seed <= 15; seed++) {
        const { states } = playout(v.id, seed * 104729 + v.chapter, 120);
        const total = (s, p) => count(s.board, p) + (s.hand ? s.hand[p] : 0) + s.lost[p];
        const w0 = total(states[0], WHITE), b0 = total(states[0], BLACK);
        states.forEach((s, n) => {
          assert.equal(total(s, WHITE), w0, `seed ${seed} ply ${n}: white`);
          assert.equal(total(s, BLACK), b0, `seed ${seed} ply ${n}: black`);
        });
      }
    });
  }
});

/** A move nobody asked for: random squares, sometimes a capture list. */
function wildMove(random) {
  const sq = () => toSquare(Math.floor(random() * CELLS));
  const roll = random();
  let text = sq();
  if (roll > 0.25) text += ' - ' + sq();
  if (roll > 0.85) text += ' - ' + sq();
  if (random() > 0.8) text += ` (x ${sq()})`;
  return text;
}

suite('fuzz — an illegal move never passes unflagged', () => {
  for (const v of VARIANTS) {
    test(`${v.id}: wild moves are flagged or legal`, () => {
      const { game, rules } = findVariant(v.id);
      for (let seed = 1; seed <= 12; seed++) {
        const random = rng(seed * 31337 + v.chapter);
        // Start from a position some way into a legal match.
        const { texts, states } = playout(v.id, seed * 613 + v.chapter, 4 + Math.floor(random() * 30));
        const base = states[states.length - 1];
        if (base.over) continue;
        const legal = new Set(game.legalMoves(base, rules).map(signature));

        for (let k = 0; k < 40; k++) {
          const wild = wildMove(random);
          const timeline = buildTimeline(parse(texts.join('\n') + '\n' + wild, game.parse), v.id);
          const ply = timeline.plies[timeline.plies.length - 1];
          const before = timeline.states[timeline.states.length - 2];
          assert.same(before.board, base.board, `seed ${seed}: prefix replays the same`);
          if (ply.notes.length) continue;             // flagged: fine
          // Unflagged, so it must be a legal move: replay it strictly.
          const notes = [];
          const tok = parse(wild, game.parse).moves[0];
          const res = game.play(base, {
            kind: tok.kind, path: tok.path.map((s) => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 5),
            caps: tok.captures.map((s) => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 5),
            capAlt: null, takes: tok.takes, promotion: tok.promotion, mark: tok.mark, text: tok.text
          }, rules, (t) => notes.push(t), noop);
          assert.ok(legal.has(signature(res.eff)), `seed ${seed}: “${wild}” passed unflagged but is not legal`);
        }
      }
    });
  }
});

suite('fuzz — the board never holds a stray code', () => {
  for (const v of VARIANTS) {
    test(`${v.id}: only known piece codes`, () => {
      const { states } = playout(v.id, 4242 + v.chapter, 150);
      for (const s of states) for (const code of s.board) assert.ok(code >= EMPTY && code <= 5, 'code ' + code);
    });
  }
});
