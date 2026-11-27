/**
 * input.test.js — playing by clicking the board.
 *
 * The promise of the board input is that every legal move of every game can
 * be made with the mouse, and that no sequence of clicks ever makes a move
 * that is not legal. Both are checked here on positions taken from random
 * matches of all 21 games.
 */

import { suite, test, assert } from './harness.js';
import { replay, last, playout, freshState } from './util.js';
import { VARIANTS, findVariant, legalMoves, notate } from '../js/state.js';
import { clickSequences, clicksFor, press, hintsFor, clicksInEffect } from '../js/input.js';
import { signature } from '../js/rules.js';
import { toIndex } from '../js/coords.js';

/** Feed clicks one by one; returns the move made, or null. */
function click(sequences, squares) {
  let clicks = [];
  let made = null;
  for (const index of squares) {
    assert.equal(made, null, 'a move was made before the clicks ran out');
    const r = press(sequences, clicks, index);
    clicks = r.clicks;
    made = r.move;
  }
  return made;
}

suite('board input — every legal move can be clicked', () => {
  for (const v of VARIANTS) {
    test(`${v.id}`, () => {
      const { game, rules } = findVariant(v.id);
      let checked = 0;
      for (let seed = 1; seed <= 6; seed++) {
        const { states } = playout(v.id, seed * 271 + v.chapter, 60);
        for (let n = 0; n < states.length; n += 3) {
          const state = states[n];
          if (state.over) continue;
          const sequences = clickSequences(game, rules, state);
          const moves = legalMoves(game, rules, state, false);
          const wanted = new Set(moves.map(signature));

          for (const mv of moves) {
            const squares = clicksFor(sequences, mv);
            assert.ok(squares, `no clicks for ${notate(game, mv)}`);
            // The lone piece of a hunt is chosen in advance: its click is optional.
            const preset = clicksInEffect(sequences, []);
            const made = click(sequences, preset.length ? squares.slice(1) : squares);
            assert.ok(made, `${notate(game, mv)}: clicking ${squares.join(',')} made no move`);
            assert.equal(signature(made), signature(mv), `${notate(game, mv)}: the clicks made ${notate(game, made)}`);
            checked++;
          }
          for (const s of sequences) assert.ok(wanted.has(signature(s.mv)), 'a click sequence for an illegal move');
        }
      }
      assert.ok(checked > 20, `only ${checked} moves checked`);
    });
  }
});

suite('board input — the details', () => {
  const setup = (variant, text) => {
    const t = replay(variant, text || '');
    const state = last(t);
    return { game: t.game, state, sequences: clickSequences(t.game, t.rules, state) };
  };
  const sq = (names) => names.split(' ').map(toIndex);
  const text = (ctx, squares) => { const mv = click(ctx.sequences, sq(squares)); return mv ? notate(ctx.game, mv) : null; };

  test('a step: the piece, then where it goes', () => {
    const ctx = setup('alquerque');
    assert.equal(text(ctx, 'd2 c3'), 'd2 - c3');
    assert.equal(text(ctx, 'd2'), null, 'one click is not a move');
    assert.equal(text(ctx, 'a1 c3'), null, 'a piece that cannot go there');
  });

  test('changing your mind: another piece, or the same one again', () => {
    const ctx = setup('alquerque');
    assert.equal(text(ctx, 'd2 b2 c3'), 'b2 - c3', 'clicking another piece picks that one instead');
    const again = press(ctx.sequences, [toIndex('d2')], toIndex('d2'));
    assert.same(again, { clicks: [], move: null }, 'the same piece again lets go of it');
  });

  test('a chain of jumps is clicked landing by landing, and may be cut short', () => {
    const ctx = setup('alquerque', '[Brancas "a5 d5 e5 b4 c4 d4 a3 e2 a1"] [Pretas "a4 b1 c1 e1"] [Vez "pretas"]');
    assert.equal(text(ctx, 'e1 e3 c5 c3'), 'e1 - e3 - c5 - c3 (x e2 d4 c4)');
    assert.equal(text(ctx, 'e1 e3 e3'), 'e1 - e3 (x e2)', 'a second click on the landing node stops there');
    assert.equal(text(ctx, 'e1 e3 c5 c5'), 'e1 - e3 - c5 (x e2 d4)');
    assert.equal(text(ctx, 'a4 a2'), 'a4 - a2 (x a3)');
  });

  test('a promotion is written without being asked for', () => {
    const ctx = setup('fetaix', '[Brancas "a4 b3 e3 b2 c2 d2"] [Pretas "c5 d5 b4 c4 d4 e4 e2"]');
    assert.equal(text(ctx, 'a4 a5'), 'a4 - a5 [Mullah]');
    assert.equal(text(ctx, 'b3 b5'), 'b3 - b5 (x b4) [Mullah]');
    // Alone on the board, case 3 could go on to a5; a second click on c3 stops it there.
    assert.equal(text(ctx, 'e3 e5 c3 c3'), 'e3 - e5 - c3 (x e4 d4)');
    assert.equal(text(ctx, 'e3 e5 c3 a5'), 'e3 - e5 - c3 - a5 (x e4 d4 b4) [Mullah]');
  });

  test('a placement is one click; Seega’s pair is two, in either order', () => {
    assert.equal(text(setup('velha4'), 'c3'), 'c3');
    assert.equal(text(setup('quadra', '[Brancas "e5 a4 d4 c2 b1 e1"] [Pretas "b5 c4 c3 b2 d2 a1"]'), 'b4'), 'b4 (x c3 d2)');
    assert.equal(text(setup('seega'), 'b4 c5'), 'b4 c5');
    assert.equal(text(setup('seega'), 'c5 b4'), 'b4 c5');
    assert.equal(text(setup('seega'), 'b4 c3'), null, 'the centre is off limits');
    assert.equal(text(setup('tonkin'), 'c3'), null);
  });

  test('Yoté: place, step, or capture and then choose the extra piece', () => {
    const ctx = setup('yote', '[Brancas "c5 d5 a4 b4 c2"] [Pretas "d4 c3 b2 c1 e1"]');
    assert.equal(text(ctx, 'a1'), 'a1');
    assert.equal(text(ctx, 'b4 b5'), 'b4 - b5');
    assert.equal(text(ctx, 'b4 d2'), null, 'the capture waits for the extra piece');
    assert.equal(text(ctx, 'b4 d2 c1'), 'b4 - d2 (x c3 c1)');
    assert.equal(text(ctx, 'b4 d2 e1'), 'b4 - d2 (x c3 e1)');
  });

  test('Dara: a row of three, then the piece to remove', () => {
    const ctx = setup('dara', '[Brancas "b5 c4 d4 a2 b2 d2 b1"] [Pretas "b3 d3 c2 e2 c1"]');
    assert.equal(text(ctx, 'b5 b4 d3'), 'b5 - b4 (x d3)');
    assert.equal(text(ctx, 'b5 b4 c1'), 'b5 - b4 (x c1)');
    assert.equal(text(ctx, 'b5 a5'), 'b5 - a5');
  });

  test('Fanorona: approach or withdrawal, chosen by clicking a piece of the row', () => {
    const ctx = setup('fanorona', '[Vez "pretas"]');
    assert.equal(text(ctx, 'b3 c3 a3'), 'b3 - c3 (x a3)');
    assert.equal(text(ctx, 'b3 c3 d3'), 'b3 - c3 (x d3)');
    const row = setup('fanorona', '[Pretas "a4 e3 b2 d2 e2"] [Brancas "a5 c5 d5 e5 b4 c4 d4 e4 a3 d3"] [Vez "pretas"]');
    assert.equal(text(row, 'd2 d1'), 'd2 - d1 (x d3 d4 d5)', 'only one capture possible: no extra click');
  });

  test('Four Field Kono and Tigres e Vacas: click the piece to be taken', () => {
    assert.equal(text(setup('kono4', '[Brancas "b5 e5 a4 c4 d4 e4 a3 b3"] [Pretas "d3 e3 b2 c2 d2 c1 e1"]'), 'e5 e3'), 'e5 - x e3');
    assert.equal(text(setup('tigres', '[Tigres "a4 e1"] [Vacas "a5 d5 c4 c3 e3 a2 b2 d1"]'), 'a4 c4'), 'a4 - x c4');
  });

  test('Amazonas: the piece, where it goes, where the block lands', () => {
    const ctx = setup('amazonas');
    assert.equal(text(ctx, 'c1 a1 d4'), 'c1 - a1 - d4');
    assert.equal(text(ctx, 'c1 a1'), null);
    assert.equal(text(ctx, 'c1 b1 c1'), 'c1 - b1 - c1', 'the block may land where the piece came from');
  });

  test('the only piece that can move is chosen in advance', () => {
    const rastros = setup('rastros');
    assert.same(clicksInEffect(rastros.sequences, []), [toIndex('b2')]);
    assert.equal(text(rastros, 'c3'), 'c3');
    assert.equal(text(rastros, 'b2 c3'), 'c3', 'clicking it anyway does no harm');
    const fox = setup('raposa', '1. d1 – d2');
    assert.equal(text(fox, 'd4'), 'c5 - d4');
    assert.same(clicksInEffect(setup('alquerque').sequences, []), []);
  });

  test('hints: what is lit at each stage', () => {
    const ctx = setup('alquerque');
    const kinds = (clicks) => {
      const h = hintsFor(ctx.sequences, sq(clicks).filter((i) => i >= 0), ctx.state.board);
      return [h.ask, h.hints.map((x) => x.kind).sort().join(' ')];
    };
    assert.same(kinds(''), ['pick', 'pick pick pick pick']);
    assert.same(kinds('d2'), ['go', 'sel to']);

    const chain = setup('alquerque', '[Brancas "a5 d5 e5 b4 c4 d4 a3 e2 a1"] [Pretas "a4 b1 c1 e1"] [Vez "pretas"]');
    const h = hintsFor(chain.sequences, sq('e1 e3'), chain.state.board);
    assert.equal(h.ends, true);
    assert.same(h.hints.map((x) => x.kind), ['sel', 'stop', 'to']);

    const yote = setup('yote', '[Brancas "c5 d5 a4 b4 c2"] [Pretas "d4 c3 b2 c1 e1"]');
    assert.equal(hintsFor(yote.sequences, [], yote.state.board).ask, 'place-or-move');
    const choose = hintsFor(yote.sequences, sq('b4 d2'), yote.state.board);
    assert.equal(choose.ask, 'take');
    assert.same(choose.hints.filter((x) => x.kind === 'take').length, 4, 'd4 b2 c1 e1 — not the jumped c3');

    const kono = setup('kono4', '[Brancas "b5 e5 a4 c4 d4 e4 a3 b3"] [Pretas "d3 e3 b2 c2 d2 c1 e1"]');
    assert.same(hintsFor(kono.sequences, sq('e5'), kono.state.board).hints.map((x) => x.kind), ['sel', 'to', 'take'], 'e5: itself, the free d5, the enemy e3');
  });

  test('nothing to click when the match is over', () => {
    const t = replay('velha4', '[Brancas "a1 b1 c1 d1"] [Pretas "a5 b5 c5"]');
    assert.same(clickSequences(t.game, t.rules, t.states[0]), []);
    assert.ok(clickSequences(findVariant('velha4').game, findVariant('velha4').rules, freshState('velha4')).length === 25);
  });
});
