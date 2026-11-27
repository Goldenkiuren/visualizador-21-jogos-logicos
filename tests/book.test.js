/**
 * book.test.js — the book as a test suite.
 *
 * Every figure that shows a move, and every match the book prints, is
 * replayed here exactly as written, chapter by chapter. Where the book
 * contradicts itself (a misprint in a record, a figure that breaks the rule
 * it illustrates) the test pins down both what the book prints and what the
 * rules give.
 */

import { suite, test, assert } from './harness.js';
import { replay, last, on, expectPosition, expectClean, expectNote, playout, idx, WHITE, BLACK } from './util.js';
import { findVariant, legalMoves, notate, statusText, resultText } from '../js/state.js';
import { groupAt } from '../js/games/szkwa.js';
import { tally } from '../js/games/pahtum.js';

const moveList = (variant, state) => {
  const { game, rules } = findVariant(variant);
  return legalMoves(game, rules, state, false).map((m) => notate(game, m)).sort();
};

/* ======================================================================= 2 */
suite('ch. 2 — Jogo-da-Velha 4', () => {
  const GAME = '1. c3 b2  2. b3 d3  3. c4 c2  4. d2 d4  5. b4 e1  6. a5 #';

  test('the match on p. 116 plays through and white wins on a5-b4-c3-d2', () => {
    const t = replay('velha4', GAME);
    expectClean(t);
    assert.equal(t.plies.length, 11);
    expectPosition(t.states[4], { white: 'b3 c3', black: 'd3 b2' }, 'figure 2.5');
    expectPosition(last(t), { white: 'a5 b4 c4 b3 c3 d2', black: 'd4 d3 b2 c2 e1' }, 'figure 2.6');
    assert.equal(last(t).over.winner, WHITE);
    assert.same(last(t).over.line.map((i) => i).sort((a, b) => a - b), ['d2', 'c3', 'b4', 'a5'].map(idx).sort((a, b) => a - b));
    assert.includes(resultText(t.game, last(t).over), 'White wins');
  });

  test('figure 2.3: four in a row along a drawn line wins', () => {
    const t = replay('velha4', '[Brancas "a4 c4 d4 c2 d1"] [Pretas "b5 c3 b2 d2 a1 e1"]\n b4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
  });

  test('figure 2.4: a diagonal with no drawn line does not win', () => {
    const t = replay('velha4', '[Brancas "d5 c4 b3 d4 c2"] [Pretas "b5 b2 a1 e1"]\n a2 #');
    assert.equal(last(t).over, null);
    expectNote(t, 0, '# is written, but White has not won');
  });

  test('a full board with no row of four is a draw', () => {
    let found = null;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const { state } = playout('velha4', seed, 30);
      if (state.over && state.over.winner === 0) found = state;
    }
    assert.ok(found, 'no drawn match among the seeds');
    assert.includes(found.over.reason, 'deu velha');
    assert.ok(!found.board.includes(0));
  });

  test('placing on an occupied position, moving, or playing on after the end is flagged', () => {
    const t = replay('velha4', '1. c3 c3  2. c3 - c4');
    expectNote(t, 1, 'c3 is already occupied');
    expectNote(t, 2, 'has no movement');
    const over = replay('velha4', GAME + ' e5');
    expectNote(over, 11, 'the match was already over');
  });
});

/* ======================================================================= 3 */
suite('ch. 3 — Five Field Kono', () => {
  const FIG_3_4 = '[Brancas "a5 c5 e5 b4 e4 a3 d3"] [Pretas "d5 c3 e3 b2 a1 b1 e1"]\n';
  const RECORD = '10. ... ...\n11. ... d5 – d4\n12. a3 – a4 b2 – c2\n13. b4 – b5 c2 – d2 #';

  test('figure 3.2: the starting position', () => {
    const t = replay('fivefield', '');
    expectPosition(t.states[0], { white: 'a1 b1 c1 d1 e1 a2 e2', black: 'a5 b5 c5 d5 e5 a4 e4' });
  });

  test('p. 122: the record from figure 3.4 ends with white blocked (figure 3.5)', () => {
    const t = replay('fivefield', FIG_3_4 + RECORD);
    expectClean(t);
    expectPosition(last(t), { white: 'a5 b5 c5 e5 a4 e4 d3', black: 'd4 c3 e3 d2 a1 b1 e1' }, 'figure 3.5');
    assert.equal(last(t).over.winner, BLACK);
    assert.includes(last(t).over.reason, 'White is blocked');
    assert.same(t.plies.map((p) => p.turn), [10, 10, 11, 11, 12, 12, 13, 13], 'the record keeps its own numbering');
    assert.same(t.plies.map((p) => p.player), [1, 2, 1, 2, 1, 2, 1, 2]);
  });

  test('a piece that reached its destination can no longer move', () => {
    const t = replay('fivefield', FIG_3_4 + 'a5 – b5');
    expectNote(t, 0, 'has reached its destination and can no longer move');
  });

  test('figure 3.3: a side filled with pieces of either colour wins for the visitor', () => {
    const t = replay('fivefield', '[Brancas "b5 c5 d5 e5 e4 b2 a3"] [Pretas "a5 a2 c2 e2 b1 d1 e1"]\n a3 – a4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, "Black's starting side is completely filled");
  });

  test('the sides are only judged once each player has moved', () => {
    const t = replay('fivefield', '1. a2 – a3');
    assert.equal(last(t).over, null, 'black’s side is still full of black pieces after white’s first move');
    const back = replay('fivefield', '1. a2 – a3 a4 – b4  2. a3 – a2');
    assert.equal(last(back).over.winner, BLACK, 'refilling your own side hands the match over');
  });

  test('steps must follow a line, one position at a time', () => {
    const t = replay('fivefield', '1. a2 – b3  e4 – e2');
    expectNote(t, 0, 'does not follow a line');
    expectNote(t, 1, 'e2 is occupied');
    expectNote(t, 1, 'more than one step');
  });
});

/* ======================================================================= 4 */
suite('ch. 4 — Rastros', () => {
  test('p. 125: 1. c3 b3 2. b4 leaves a block on every position visited (figure 4.3)', () => {
    const t = replay('rastros', '1. c3 b3\n2. b4');
    expectClean(t);
    expectPosition(last(t), { white: 'b4', black: '', blocks: 'b2 c3 b3' });
    assert.same(t.plies.map((p) => p.player), [1, 2, 1]);
  });

  const FIG_4_4 = 'b5 c5 b4 c4 b3 c3 d3 e3 b2 c2 d2 c1 d1 e1';

  test('figure 4.4 is reached from b2 in fourteen moves: e1 – e2 is player 2’s', () => {
    // The only path from b2 through the figure's blocks to e1 – e2.
    const t = replay('rastros', '1. b3 b4  2. b5 c5  3. c4 c3  4. d3 e3  5. d2 c2  6. c1 d1  7. e1 e2 #');
    expectClean(t);
    assert.equal(t.plies.length, 14);
    assert.equal(t.plies[13].player, 2, 'the 14th move is player 2’s');
    expectPosition(last(t), { white: 'e2', black: '', blocks: FIG_4_4 }, 'figure 4.4');
    assert.equal(last(t).over.winner, 2);
    assert.includes(last(t).over.reason, 'Player 1 cannot move');
  });

  test('the book misprints figure 4.4: it credits e1 – e2 to player 1', () => {
    // As printed — the position set up by hand, player 1 to move. The move
    // itself is legal; it is the figure that cannot arise this way.
    const t = replay('rastros', `[Peça "e1"] [Bloqueios "${FIG_4_4.replace(' e1', '')}"] [Vez "1"]\n e1 – e2 #`);
    expectClean(t);
    assert.equal(last(t).over.winner, 1);
    const blocks = FIG_4_4.split(' ').length;
    assert.equal(blocks, 14, 'one block per move played');
    assert.equal(blocks % 2, 0, 'an even move is player 2’s');
  });

  test('e5 is player 1’s destination and a1 is player 2’s — whoever moves the piece there', () => {
    const one = replay('rastros', '[Peça "d4"] d4 – e5 #');
    expectClean(one);
    assert.equal(last(one).over.winner, 1);
    const gift = replay('rastros', '[Peça "b2"] [Vez "1"] b2 – a1');
    assert.equal(last(gift).over.winner, 2, 'stepping onto the opponent’s destination loses');
    const two = replay('rastros', '1. b1  a1 #');
    expectClean(two);
    assert.equal(last(two).over.winner, 2);
  });

  test('a blocked or distant position cannot be entered', () => {
    const t = replay('rastros', '1. c3 b2');
    expectNote(t, 1, 'b2 is blocked');
    const far = replay('rastros', '1. d4');
    expectNote(far, 0, 'more than one step');
    const wrong = replay('rastros', '1. c3 – d3');
    expectNote(wrong, 0, 'the piece is on b2, not on c3');
  });
});

/* ======================================================================= 5 */
suite('ch. 5 — Alquerque and Fetaix', () => {
  const FIG_5_3 = '[Brancas "a5 d5 e5 b4 c4 d4 a3 e2 a1"] [Pretas "a4 b1 c1 e1"] [Vez "pretas"]\n';
  const FIG_5_5 = '[Brancas "a5=M b1=M d3 e3 c2 e2"] [Pretas "c5 d5 c4 d4 a3"]\n';
  const FIG_5_6 = '[Brancas "a4 b3 e3 b2 c2 d2"] [Pretas "c5 d5 b4 c4 d4 e4 e2"]\n';

  test('figure 5.1: the starting position', () => {
    const t = replay('alquerque', '');
    expectPosition(t.states[0], {
      white: 'a1 b1 c1 d1 e1 a2 b2 c2 d2 e2 a3 b3',
      black: 'd3 e3 a4 b4 c4 d4 e4 a5 b5 c5 d5 e5'
    });
  });

  test('figure 5.3: a simple capture and a triple capture', () => {
    const simple = replay('alquerque', FIG_5_3 + 'a4 – a2 (x a3)');
    expectClean(simple);
    expectPosition(last(simple), { white: 'a5 d5 e5 b4 c4 d4 e2 a1', black: 'a2 b1 c1 e1' });

    const triple = replay('alquerque', FIG_5_3 + 'e1 – e3 – c5 – c3 (x e2 d4 c4)');
    expectClean(triple);
    expectPosition(last(triple), { white: 'a5 d5 e5 b4 a3 a1', black: 'a4 b1 c1 c3' });
    assert.equal(last(triple).lost[WHITE], 3);
  });

  test('the capture list is optional — the path alone plays the same', () => {
    const t = replay('alquerque', FIG_5_3 + 'e1 – e3 – c5 – c3');
    expectClean(t);
    expectPosition(last(t), { white: 'a5 d5 e5 b4 a3 a1', black: 'a4 b1 c1 c3' });
  });

  test('figure 5.5: a Mullah moves and captures at any distance', () => {
    const capture = replay('fetaix', FIG_5_5 + 'a5 – a1 – e5 (x a3 d4)');
    expectClean(capture);
    expectPosition(last(capture), { white: 'e5 b1 d3 e3 c2 e2', black: 'c5 d5 c4', kings: 'e5 b1' });
    const glide = replay('fetaix', FIG_5_5 + 'b1 – e1');
    expectClean(glide);
    expectPosition(last(glide), { white: 'a5 e1 d3 e3 c2 e2', black: 'c5 d5 c4 d4 a3', kings: 'a5 e1' });
  });

  test('figure 5.6, case 1: a4 – a5 [Mullah]', () => {
    const t = replay('fetaix', FIG_5_6 + 'a4 – a5 [Mullah]');
    expectClean(t);
    expectPosition(last(t), { white: 'a5 b3 e3 b2 c2 d2', black: 'c5 d5 b4 c4 d4 e4 e2', kings: 'a5' });
  });

  test('figure 5.6, case 2: b3 – b5 (x b4) [Mullah]', () => {
    const t = replay('fetaix', FIG_5_6 + 'b3 – b5 (x b4) [Mullah]');
    expectClean(t);
    expectPosition(last(t), { white: 'a4 b5 e3 b2 c2 d2', black: 'c5 d5 c4 d4 e4 e2', kings: 'b5' });
  });

  test('figure 5.6, case 3: e3 – e5 – c3 (x e4 d4) passes the far rank without promoting', () => {
    // The figure draws the three cases on one board, so cases 1 and 2 have been played.
    const after12 = '[Brancas "a5=M b5=M e3 b2 c2 d2"] [Pretas "c5 d5 c4 d4 e4 e2"]\n';
    const t = replay('fetaix', after12 + 'e3 – e5 – c3 (x e4 d4)');
    expectClean(t);
    assert.same(t.plies[0].infos, [], 'it is the largest capture on the board');
    expectPosition(last(t), { white: 'a5 b5 c3 b2 c2 d2', black: 'c5 d5 c4 e2', kings: 'a5 b5' });
  });

  test('figure 5.6, case 3 taken alone: the jump could go on to a5 — and would then promote', () => {
    const t = replay('fetaix', FIG_5_6 + 'e3 – e5 – c3 (x e4 d4)');
    expectClean(t);
    expectPosition(last(t), { white: 'a4 b3 c3 b2 c2 d2', black: 'c5 d5 b4 c4 e2', kings: '' });
    assert.includes(t.plies[0].infos, 'the largest capture must be taken — e3 - e5 - c3 - a5 (x e4 d4 b4) [Mullah] takes 3');
    const full = replay('fetaix', FIG_5_6 + 'e3 – e5 – c3 – a5 (x e4 d4 b4) [Mullah]');
    expectClean(full);
    assert.same(full.plies[0].infos, []);
  });

  test('the book misprints both capture lists of figure 5.6: flagged, yet the right pieces go', () => {
    const two = replay('fetaix', FIG_5_6 + 'b3 – b5 (x b2) [Mullah]');
    expectNote(two, 0, 'recorded captures (b2) do not match the pieces jumped (b4)');
    expectPosition(last(two), { white: 'a4 b5 e3 b2 c2 d2', black: 'c5 d5 c4 d4 e4 e2', kings: 'b5' });

    const three = replay('fetaix', FIG_5_6 + 'e3 – e5 – c3 (x e4 d3)');
    expectNote(three, 0, 'recorded captures (e4 d3) do not match the pieces jumped (e4 d4)');
    expectPosition(last(three), { white: 'a4 b3 c3 b2 c2 d2', black: 'c5 d5 b4 c4 e2' });
  });

  test('promotion needs its marker, its rank and its variant', () => {
    const missing = replay('fetaix', FIG_5_6 + 'a4 – a5');
    expectNote(missing, 0, 'the move finishes on a5 but [Mullah] is not recorded');
    assert.same(on(last(missing), WHITE).length, 6);
    const early = replay('fetaix', FIG_5_6 + 'e3 – e5 – c3 (x e4 d4) [Mullah]');
    expectNote(early, 0, 'c3 is not on the far rank, so nothing is promoted');
    const plain = replay('alquerque', FIG_5_6 + 'a4 – a5 [Mullah]');
    expectNote(plain, 0, 'Alquerque has no promotion — that is Fetaix');
    const stage2 = replay('promocao', FIG_5_6 + 'a4 – a5 [Mullah]');
    expectClean(stage2);
  });

  test('figure 5.4: in Fetaix men step sideways and forward, backwards only to capture', () => {
    const back = replay('fetaix', '1. b3 – c3  d3 – b3 (x c3)  2. a3 – c3 (x b3)  b4 – a3\n3. c3 – b4  b5 – b3 (x b4)  4. b2 – b4 (x b3)  a5 – c3 (x b4)  5. d2 – b4 (x c3)');
    expectClean(back);                                   // black steps "down", white captures backwards
    const retreat = replay('fetaix', '[Brancas "c3"] [Pretas "e5"]\n c3 – c2');
    expectNote(retreat, 0, 'in Fetaix a piece may only move backwards to capture');
    const diagonal = replay('fetaix', '[Brancas "c3"] [Pretas "e5"]\n c3 – b2');
    expectNote(diagonal, 0, 'in Fetaix a piece may only move backwards to capture');
    const sideways = replay('fetaix', '[Brancas "c3"] [Pretas "e5"]\n c3 – b3');
    expectClean(sideways);
    const free = replay('promocao', '[Brancas "c3"] [Pretas "e5"]\n c3 – c2');
    expectClean(free);
  });

  test('jumped pieces stay until the move ends: no piece is jumped twice', () => {
    const t = replay('alquerque', '[Brancas "c3"] [Pretas "c4 e5"]\n c3 – c5 – c3 (x c4)');
    expectNote(t, 0, 'c4 is jumped twice in the same move');
  });

  test('skipping a mandatory capture is mentioned, not flagged', () => {
    const t = replay('alquerque', FIG_5_3 + 'b1 – b2');
    expectClean(t);
    assert.includes(t.plies[0].infos, 'capture is mandatory when the opponent demands it — e1 - e3 - c5 - c3 (x e2 d4 c4) was available');
    const small = replay('alquerque', FIG_5_3 + 'a4 – a2 (x a3)');
    assert.same(small.plies[0].notes, []);
    assert.includes(small.plies[0].infos, 'the largest capture must be taken — e1 - e3 - c5 - c3 (x e2 d4 c4) takes 3');
    const best = replay('alquerque', FIG_5_3 + 'e1 – e3 – c5 – c3');
    assert.same(best.plies[0].infos, []);
  });

  test('capturing the last piece ends the match', () => {
    const t = replay('alquerque', '[Brancas "c3"] [Pretas "c4"]\n c3 – c5 (x c4) #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
  });

  test('the old flags are all still raised', () => {
    const t = replay('alquerque', '1. c3 – c4  c3  2. a1 – a4  b3 – d5');
    expectNote(t, 0, 'there is no piece on c3');
    expectNote(t, 0, 'c4 is occupied');
    expectNote(t, 1, 'a lone coordinate — Alquerque has no placement phase');
    expectNote(t, 2, 'a4 is occupied');
    expectNote(t, 2, 'a1–a4 passes over 2 pieces');
    expectNote(t, 3, 'b3 holds a white piece');
    expectNote(t, 3, 'b3–d5 does not follow a line of the board');
  });
});

/* ======================================================================= 6 */
suite('ch. 6 — Raposa e Cachorros', () => {
  const GAME = '1. d1 – d2 c5 – d4\n2. b1 – b2 d4 – c4\n3. c1 – c2 c4 – c3\n4. b2 – a3 c3 – b4\n' +
               '5. d2 – c3 b4 – b3\n6. c3 – d3 b3 – b2\n7. e1 – d1 b2 – b1 #';

  test('p. 136: the match plays through and the fox escapes on b1 (figure 6.4)', () => {
    const t = replay('raposa', GAME);
    expectClean(t);
    expectPosition(t.states[0], { white: 'a1 b1 c1 d1 e1', black: 'c5' }, 'figure 6.1');
    expectPosition(last(t), { white: 'a3 d3 c2 a1 d1', black: 'b1' }, 'figure 6.4');
    assert.equal(last(t).over.winner, BLACK);
    assert.includes(resultText(t.game, last(t).over), 'Fox wins');
  });

  test('figure 6.3: a fox with no free neighbour has lost', () => {
    const t = replay('raposa', '[Raposa "a4"] [Cachorros "a5 b3 a3 d3 c2"] [Vez "cachorros"]\n b3 – b4 #');
    expectClean(t);
    expectPosition(last(t), { white: 'a5 b4 a3 d3 c2', black: 'a4' });
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(resultText(t.game, last(t).over), 'Dogs win');
  });

  test('figure 6.2: dogs go sideways, forward and diagonally forward — never back', () => {
    const t = replay('raposa', '1. b1 – b2 c5 – c4  2. b2 – b1');
    expectNote(t, 2, 'the dogs never move backwards');
    const diag = replay('raposa', '1. b1 – b2 c5 – c4  2. b2 – a1');
    expectNote(diag, 2, 'a1 is occupied');
    const { game, rules } = findVariant('raposa');
    const start = game.initial(rules, { board: null, turn: null, hand: null, lost: null, notes: [] });
    assert.same(legalMoves(game, rules, start, false).map((m) => notate(game, m)).sort(),
      ['a1 - a2', 'a1 - b2', 'b1 - b2', 'c1 - b2', 'c1 - c2', 'c1 - d2', 'd1 - d2', 'e1 - d2', 'e1 - e2']);
  });

  test('“os adversários podem combinar quem realiza o primeiro movimento”', () => {
    const t = replay('raposa-fox', '1. c5 – c4 c1 – c2');
    expectClean(t);
    assert.same(t.plies.map((p) => p.player), [BLACK, WHITE]);
    const wrong = replay('raposa', '1. c5 – c4');
    expectNote(wrong, 0, 'c5 holds a black piece');
  });
});

/* ======================================================================= 7 */
suite('ch. 7 — Tonkin', () => {
  const PRINTED = '1. a3 a1\n2. e4 d3\n3. b3 e5\n4. d4 c3\n5. d5 b2\n6. d5 – d4 c2 – c3\n7. b3 – b4 #';
  const CORRECTED = '1. a3 a1\n2. e4 d3\n3. b3 e5\n4. d4 c2\n5. d5 b2\n6. d5 – c5 c2 – c3\n7. b3 – b4 #';

  test('p. 140, with its two misprints corrected, ends as in figure 7.4', () => {
    const t = replay('tonkin', CORRECTED);
    expectClean(t);
    expectPosition(last(t), { white: 'c5 b4 a3 d4 e4', black: 'e5 c3 d3 b2 a1' }, 'figure 7.4');
    assert.equal(last(t).over.winner, WHITE);
    assert.same(last(t).over.line.slice().sort((a, b) => a - b), ['a3', 'b4', 'c5'].map(idx).sort((a, b) => a - b));
  });

  test('the record exactly as printed contradicts the rules and its own figure', () => {
    const t = replay('tonkin', PRINTED);
    expectNote(t, 7, 'the centre cannot be occupied during the placement phase');   // 4... c3
    expectNote(t, 10, 'd4 is occupied');                                             // 6. d5 – d4
    expectNote(t, 11, 'there is no piece on c2');                                    // 6... c2 – c3
  });

  test('figure 7.3: a line can be filled while still placing', () => {
    const t = replay('tonkin', '[Brancas "a4 c4 d4 e4"] [Pretas "b5 b3 b2 d2"]\n b4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.equal(last(t).over.line.length, 5);
  });

  test('five pieces each: placement first, then single steps', () => {
    const t = replay('tonkin', '1. a1 a5  2. a1 – a2');
    expectNote(t, 2, 'pieces only move once all 5 have been placed');
    const late = replay('tonkin', '1. a1 a5 2. b1 b5 3. d1 d5 4. e1 e5 5. a2 a4 6. e2');
    expectNote(late, 10, 'all 5 pieces are already on the board');
    assert.equal(statusText(late.game, late.states[10]), 'Movement · White to move');
    assert.equal(statusText(late.game, late.states[3]), 'Placement · Black to move');
  });
});

/* ======================================================================= 8 */
suite('ch. 8 — Tsoro Yematatu', () => {
  const RECORD = '1. a3 a1\n2. e4 d3\n3. b3 e5\n4. d4 c3\n5. b3 – e1 d3 – b1';
  const FIG_8_2 = '[Brancas "a4 b4 c4 c2"] [Pretas "b5 c3 b2 a1"]\n';
  const FIG_8_5 = '[Brancas "a5 b4 a1 c1"] [Pretas "b5 c3 b2 c2"] [Vez "pretas"]\n';

  test('p. 145: the record of the first game ends on figure 8.6', () => {
    const t = replay('tsoro1', RECORD);
    expectClean(t);
    expectPosition(last(t), { white: 'd4 e4 a3 e1', black: 'e5 c3 a1 b1' }, 'figure 8.6');
  });

  test('the same free moves are illegal in the second and third games', () => {
    expectNote(replay('tsoro2', RECORD), 8, 'b3–e1 does not follow a line of the board');
    expectNote(replay('tsoro3', RECORD), 8, 'b3–e1 does not follow a line of the board');
  });

  test('figure 8.3: in the first game c2 – d4 lines up four', () => {
    const t = replay('tsoro1', FIG_8_2 + 'c2 – d4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, '4 in a row on a4 b4 c4 d4');
  });

  test('figure 8.5: the third game adds jumps over a piece of either colour', () => {
    for (const move of ['b5 – b3', 'c2 – a2', 'b2 – d2', 'b5 – c5', 'c3 – d3', 'b2 – b1']) {
      expectClean(replay('tsoro3', FIG_8_5 + move), move);
    }
    expectNote(replay('tsoro2', FIG_8_5 + 'b5 – b3'), 0, 'b3 is more than one step'.replace('b3 is', 'b5–b3 is'));
    expectNote(replay('tsoro3', FIG_8_5 + 'c3 – e3'), 0, 'no piece on d3 to jump over');
    const after = replay('tsoro3', FIG_8_5 + 'b5 – b3');
    assert.same(on(last(after), WHITE), ['a1', 'a5', 'b4', 'c1'], 'the piece jumped is not captured');
  });

  test('four in a row wins during placement too', () => {
    const t = replay('tsoro2', '1. a1 a5  2. b1 b5  3. c1 c5  4. d1 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
  });
});

/* ======================================================================= 9 */
suite('ch. 9 — Pah Tum', () => {
  const FIG_9_2 = '[Bloqueios "d5 b3 c2"] [Brancas "a5 b5 c5 e5 a4 e4 a3 a2 b1 d1 e1"] [Pretas "b4 c4 d4 c3 d3 e3 b2 d2 e2 a1 c1"]';
  const GAME = '1. a3 a1  2. e4 d3  3. b1 e2  4. a5 b4  5. b5 c4  6. c5 d4  7. e5 c3\n' +
               '8. a4 e3  9. a2 b2  10. d1 d2  11. e1 c1';

  test('figure 9.2: 14 points for black, 6 for white with the suggested scoring', () => {
    const t = replay('pahtum', FIG_9_2);
    assert.same(t.states[0].ext.score, [0, 6, 14]);
    assert.equal(t.states[0].over.winner, BLACK);
    const { lines } = tally(t.states[0].board, { 3: 2, 4: 4, 5: 8 });
    const rows = (p, n) => lines.filter((l) => l.player === p && l.cells.length === n).length;
    assert.equal(rows(BLACK, 3), 5, 'black: five rows of 3');
    assert.equal(rows(BLACK, 4), 1, 'black: one row of 4');
    assert.equal(rows(WHITE, 3), 1, 'white: one row of 3');
    assert.equal(rows(WHITE, 4), 1, 'white: one row of 4');
  });

  test('the original scoring values the same rows 3, 10 and 25', () => {
    const t = replay('pahtum-original', FIG_9_2);
    assert.same(t.states[0].ext.score, [0, 13, 25]);
  });

  test('p. 149: the record 1. a3 a1 2. e4 d3 3. b1 e2 … can be played out to figure 9.2', () => {
    const t = replay('pahtum', GAME);
    expectClean(t);
    assert.equal(t.plies.length, 22);
    expectPosition(last(t), {
      white: 'a5 b5 c5 e5 a4 e4 a3 a2 b1 d1 e1', black: 'b4 c4 d4 c3 d3 e3 b2 d2 e2 a1 c1', blocks: 'd5 b3 c2'
    }, 'figure 9.2');
    assert.includes(last(t).over.reason, 'White 6 × 14 Black');
    assert.equal(t.states[21].over, null, 'the match is only over when the board is full');
  });

  test('figure 9.1 is the default; a header moves the blocks', () => {
    expectPosition(replay('pahtum', '').states[0], { white: '', black: '', blocks: 'd5 b3 c2' });
    const one = replay('pahtum', '[Bloqueios "c3"]');
    expectClean(one);
    expectPosition(one.states[0], { white: '', black: '', blocks: 'c3' });
    const two = replay('pahtum', '[Bloqueios "c3 a1"]');
    assert.includes(two.warnings, '1 or 3 block pieces');
  });

  test('a block cannot be played on', () => {
    expectNote(replay('pahtum', '1. d5'), 0, 'd5 is already occupied');
  });
});

/* ====================================================================== 10 */
suite('ch. 10 — Tic Tackle', () => {
  test('figure 10.2: the starting position', () => {
    expectPosition(replay('tictackle', '').states[0], { white: 'b5 d5 a1 c1 e1', black: 'a5 c5 e5 b1 d1' });
  });

  test('figure 10.4: a diagonal row wins even where no line is drawn', () => {
    const t = replay('tictackle', '[Brancas "b5 c4 d3 e1 a3"] [Pretas "a1 b1 c1 d2 d4"]\n e1 – e2 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, 'a diagonal with no line, which still counts');
  });

  test('figure 10.4: and so does a row along a line', () => {
    const t = replay('tictackle', '[Brancas "b5 c4 d3 e1 a3"] [Pretas "a1 b1 c1 d2 d4"] [Vez "pretas"]\n d2 – d1 #');
    expectClean(t);
    assert.equal(last(t).over.winner, BLACK);
    assert.includes(last(t).over.reason, '4 in a row on a1 b1 c1 d1');
  });

  test('no piece may travel along an undrawn diagonal', () => {
    expectNote(replay('tictackle', '1. b5 – c4'), 0, 'b5–c4 does not follow a line of the board');
  });

  test('the record on p. 153 cannot be played: its second move takes a black piece', () => {
    const t = replay('tictackle', '1. a1 – b2 a5 – b4\n2. e5 – d4 d1 – d2\n3. c1 – c2 e5 – d4');
    assert.same(t.plies[0].notes, []);
    assert.same(t.plies[1].notes, []);
    expectNote(t, 2, 'e5 holds a black piece');
    expectNote(t, 5, 'there is no piece on e5');
  });
});

/* ====================================================================== 11 */
suite('ch. 11 — Amazonas', () => {
  test('p. 157: the record plays from figure 11.2', () => {
    const t = replay('amazonas', '1. c1 – a1 – d4   e3 – c1 – b2\n2. c5 – c2 – c3   a3 – b3 – a3');
    expectClean(t);
    expectPosition(t.states[0], { white: 'c1 c5', black: 'a3 e3' }, 'figure 11.2');
    expectPosition(last(t), { white: 'a1 c2', black: 'c1 b3', blocks: 'd4 b2 c3 a3' });
  });

  test('figure 11.3: b1 – d1 – d4', () => {
    const t = replay('amazonas', '[Brancas "c5 b2"] [Pretas "a4 b1"] [Bloqueios "a5 b4 c4 c2"] [Vez "pretas"]\n b1 – d1 – d4');
    expectClean(t);
    expectPosition(last(t), { white: 'c5 b2', black: 'a4 d1', blocks: 'a5 b4 c4 c2 d4' });
  });

  test('figure 11.4: the same move leaves white without a move — black wins', () => {
    const t = replay('amazonas', '[Brancas "c5 a2"] [Pretas "a3 b1"] [Bloqueios "a5 b5 d5 b4 c4 c3 e3 b2 c2 a1"] [Vez "pretas"]\n b1 – d1 – d4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, BLACK);
    assert.includes(last(t).over.reason, 'White is blocked');
  });

  test('neither the piece nor the block may pass over anything', () => {
    const t = replay('amazonas', '1. c1 – c5 – a5');
    expectNote(t, 0, 'c5 is occupied');
    const over = replay('amazonas', '1. c1 – c4 – c2   a3 – d3 – a3   2. c4 – c1 – a1');
    expectNote(over, 2, 'c4–c1 moves over a piece, which is not allowed');
    const throwOver = replay('amazonas', '1. c1 – c4 – c2   a3 – c3 – c1');
    expectNote(throwOver, 1, 'c3–c1 throws the block over a piece, which is not allowed');
    const missing = replay('amazonas', '1. c1 – c4');
    expectNote(missing, 0, 'the throw of the block piece is missing');
  });

  test('the variants that start off the board place first', () => {
    const two = replay('amazonas-livre', '1. c1 a3  2. c5 e3  3. c1 – a1 – d4');
    expectClean(two);
    expectPosition(last(two), { white: 'a1 c5', black: 'a3 e3', blocks: 'd4' });
    const one = replay('amazonas-1', '1. c1 c5  2. c1 – c4 – c1  c5 – a5 – b5');
    expectClean(one);
    const early = replay('amazonas-livre', '1. c1 a3  2. c1 – c2 – c1');
    expectNote(early, 2, 'every piece has to enter the board before any can move');
  });

  test('any agreed position can be given in the headers', () => {
    const t = replay('amazonas', '[Brancas "a1 e1"] [Pretas "a5 e5"]\n1. a1 – c3 – c1');
    expectClean(t);
    expectPosition(last(t), { white: 'c3 e1', black: 'a5 e5', blocks: 'c1' });
  });
});

/* ====================================================================== 12 */
suite('ch. 12 — Coiote e Galinhas', () => {
  const FIG_12_4 = '[Coiote "c3"] [Galinhas "c5 e5 a4 b4 c4 e4 d2 b1 e1"]\n';

  test('figure 12.2: the coyote on c3, twelve hens — and the coyote moves first', () => {
    const t = replay('coiote', '1. c3 – c2  a3 – b3');
    expectClean(t);
    expectPosition(t.states[0], { white: 'a5 b5 c5 d5 e5 a4 b4 c4 d4 e4 a3 e3', black: 'c3' });
    assert.same(t.plies.map((p) => p.player), [BLACK, WHITE]);
    assert.same(t.plies.map((p) => p.col), [0, 1], 'the coyote sits in the first column');
  });

  test('figure 12.4: c3 – a5 – a3 eats two hens', () => {
    const t = replay('coiote', FIG_12_4 + 'c3 – a5 – a3 (x b4 a4)');
    expectClean(t);
    expectPosition(last(t), { white: 'c5 e5 c4 e4 d2 b1 e1', black: 'a3' });
    assert.equal(last(t).lost[WHITE], 5, '3 already gone in the figure + 2');
  });

  test('six hens eaten end the match', () => {
    const t = replay('coiote', FIG_12_4 + '1. c3 – a5 – a3 (x b4 a4)  e1 – e2  2. a3 – a2  b1 – a1  3. a2 – c2  d2 – d1  4. c2 – e2  e4 – e3');
    assert.equal(last(t).over, null);
    const won = replay('coiote', '[Coiote "c3"] [Galinhas "c4 d4 a1 a2 a3 b1 b2"]\n c3 – c5 (x c4) #');
    expectClean(won);
    assert.equal(last(won).over.winner, BLACK);
    assert.includes(last(won).over.reason, 'eaten 6 hens');
  });

  test('figure 12.3 is not a trap by the book’s own rule: the coyote can still jump', () => {
    const t = replay('coiote', '[Coiote "b1"] [Galinhas "c5 d5 a4 e4 c3 a2 a1 c1"] [Vez "galinhas"]\n a2 – b2');
    expectClean(t);
    assert.equal(last(t).over, null);
    assert.same(moveList('coiote', last(t)), ['b1 - b3 (x b2)', 'b1 - b3 - d3 (x b2 c3)', 'b1 - d1 (x c1)']);
  });

  test('with the landing positions taken the coyote really is trapped', () => {
    const t = replay('coiote', '[Coiote "b1"] [Galinhas "c5 d5 a4 e4 b3 a2 a1 c1 d1"] [Vez "galinhas"]\n a2 – b2 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(resultText(t.game, last(t).over), 'Hens win — the coyote is trapped');
  });

  test('hens do not jump', () => {
    const t = replay('coiote', '1. c3 – c2  c4 – c1');
    expectNote(t, 1, 'the hens cannot jump');
  });
});

/* ====================================================================== 13 */
suite('ch. 13 — Yoté', () => {
  const FIG_13_4 = '[Brancas "c5 d5 a4 b4 c2"] [Pretas "d4 c3 b2 c1 e1"]\n';

  test('figure 13.2/13.3: place, step or capture', () => {
    const t = replay('yote', '1. b4 c3  2. b2 c3 – c4  3. b4 – d4 (x c4)');
    expectClean(t);
    expectPosition(last(t), { white: 'd4 b2', black: '' });
    assert.same(last(t).hand, [0, 10, 11]);
    assert.same(last(t).lost, [0, 0, 1]);
  });

  test('figure 13.4: b4 – d2 (x c3 c1) jumps c3 and also removes c1', () => {
    const t = replay('yote', FIG_13_4 + 'b4 – d2 (x c3 c1)');
    expectClean(t);
    expectPosition(last(t), { white: 'c5 d5 a4 d2 c2', black: 'd4 b2 e1' });
  });

  test('the bonus piece is the player’s choice, so it has to be written', () => {
    const t = replay('yote', FIG_13_4 + 'b4 – d2 (x c3)');
    expectNote(t, 0, 'a capture also removes one more enemy piece — the record does not say which');
    expectPosition(last(t), { white: 'c5 d5 a4 d2 c2', black: 'd4 b2 c1 e1' });
    const bare = replay('yote', FIG_13_4 + 'b4 – d2');
    expectNote(bare, 0, 'the record does not say which');
    const two = replay('yote', FIG_13_4 + 'b4 – d2 (x c3 c1 e1)');
    expectNote(two, 0, 'only one extra piece comes off after a capture');
  });

  test('jumps are never chained', () => {
    const t = replay('yote', '[Brancas "a1"] [Pretas "b1 d1 e5"]\n a1 – c1 – e1 (x b1 d1)');
    expectNote(t, 0, 'jumps cannot be chained in Yoté');
  });

  test('capturing everything wins', () => {
    const t = replay('yote', '[Brancas "a1"] [Pretas "b1 e5"] [Reserva "0 0"]\n a1 – c1 (x b1 e5) #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
  });

  test('a player who can do nothing ends the match: the most captures win', () => {
    const t = replay('yote', '[Brancas "a1"] [Pretas "b1 a2 b2"] [Reserva "0 0"] [Capturadas "1 3"] [Vez "pretas"]\n b2 – c2');
    const stuck = replay('yote', '[Brancas "a1"] [Pretas "b1 a2 b2 c1 a3 c3"] [Reserva "0 0"] [Capturadas "2 5"]');
    assert.equal(t.states[0].over, null);
    assert.equal(stuck.states[0].over.winner, WHITE, 'white captured 5 against 2');
    assert.includes(stuck.states[0].over.reason, 'White can neither place, move nor capture');
  });
});

/* ====================================================================== 14 */
suite('ch. 14 — Halma', () => {
  test('figure 14.2: the starting position', () => {
    expectPosition(replay('halma', '').states[0], { white: 'a3 a2 b2 a1 b1 c1', black: 'c5 d5 e5 d4 e4 e3' });
  });

  test('figure 14.4: e5 – e3 – c1 – a1, three jumps and nothing captured', () => {
    const t = replay('halma', '[Brancas "d5 b4 d4 e4 d2 b1"] [Pretas "e5 a4 c4 b3 a2 b2"] [Vez "pretas"]\n e5 – e3 – c1 – a1');
    expectClean(t);
    expectPosition(last(t), { white: 'd5 b4 d4 e4 d2 b1', black: 'a1 a4 c4 b3 a2 b2' });
  });

  test('figure 14.3: black’s corner filled — with a black piece among them — wins for white', () => {
    const t = replay('halma', '[Brancas "c5 d5 b4 d4 e4 d2"] [Pretas "e5 a3 a2 a1 b1 c1"]\n d2 – e3 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, "Black's starting corner is completely filled");
  });

  test('p. 169: the three kinds of move', () => {
    expectClean(replay('halma', '1. b2 – b3'), 'a step');
    expectClean(replay('halma', '1. a1 – c3'), 'a jump over b2');
    const chain = replay('halma', '[Brancas "a1 b1 d2 d4"] [Pretas "e5"]\n a1 – c1 – e3 – c5');
    expectClean(chain, 'a1 – c1 – e3 – c5');
    expectPosition(last(chain), { white: 'c5 b1 d2 d4', black: 'e5' });
  });

  test('a path must be all jumps, over a piece each time, and never return', () => {
    expectNote(replay('halma', '1. b2 – b3 – b4'), 0, 'a plain step, which cannot be part of a chain of jumps');
    expectNote(replay('halma', '1. b2 – b4'), 0, 'jumps over nothing');
    expectNote(replay('halma', '1. a1 – c3 – a1'), 0, 'the path comes back to a1');
  });
});

/* ====================================================================== 15 */
suite('ch. 15 — Quadra', () => {
  test('figure 15.2: b4 (x c3 d2) takes the pair — and leaves the single c4', () => {
    const t = replay('quadra', '[Brancas "e5 a4 d4 c2 b1 e1"] [Pretas "b5 c4 c3 b2 d2 a1"]\n b4 (x c3 d2)');
    expectClean(t);
    expectPosition(last(t), { white: 'e5 a4 b4 d4 c2 b1 e1', black: 'b5 c4 b2 a1' });
    assert.equal(last(t).over, null);
    assert.same(last(t).ext.pairs, [0, 1, 0]);
  });

  test('figure 15.3: b4 # lines up four', () => {
    const t = replay('quadra', '[Brancas "e5 a4 c4 d4 c2 b1 e1"] [Pretas "b5 c5 e4 a3 c3 b2 a1"]\n b4 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, '4 in a row on a4 b4 c4 d4');
  });

  test('figure 15.4: b4 (x b2 b3) (x c3 d2) # takes two pairs at once and wins', () => {
    const t = replay('quadra', '[Brancas "e5 a4 d4 d3 c2 b1 e1"] [Pretas "b5 c4 b3 c3 b2 d2 a1"]\n b4 (x b2 b3) (x c3 d2) #');
    expectClean(t);
    expectPosition(last(t), { white: 'e5 a4 b4 d4 d3 c2 b1 e1', black: 'b5 c4 a1' });
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, '2 pairs of enemy pieces captured');
  });

  test('exactly two pieces are bracketed — not one, not three — and only along a line', () => {
    const one = replay('quadra', '[Brancas "d1"] [Pretas "c1"]\n b1');
    expectClean(one);
    assert.same(on(last(one), BLACK), ['c1']);
    const three = replay('quadra', '[Brancas "e1"] [Pretas "b1 c1 d1"]\n a1');
    expectClean(three);
    assert.same(on(last(three), BLACK), ['b1', 'c1', 'd1']);
    const noLine = replay('quadra', '[Brancas "e2"] [Pretas "c4 d3"]\n b5');   // b5-c4-d3-e2 has no line
    expectClean(noLine);
    assert.same(on(last(noLine), BLACK), ['c4', 'd3']);
  });

  test('placing your own pair between two enemies is safe', () => {
    const t = replay('quadra', '[Brancas "b1"] [Pretas "a1 d1"]\n c1');
    expectClean(t);
    assert.same(on(last(t), WHITE), ['b1', 'c1']);
  });

  test('a capture list that disagrees with the board is flagged and the board wins', () => {
    const t = replay('quadra', '[Brancas "e5 a4 d4 c2 b1 e1"] [Pretas "b5 c4 c3 b2 d2 a1"]\n b4 (x c4)');
    expectNote(t, 0, 'recorded captures (c4) do not match the pairs bracketed (c3 d2)');
    expectPosition(last(t), { white: 'e5 a4 b4 d4 c2 b1 e1', black: 'b5 c4 b2 a1' });
  });
});

/* ====================================================================== 16 */
suite('ch. 16 — Seega', () => {
  // Any full placement: 12 pairs, every node but the centre.
  const PLACEMENT = '1. a1 b1  a5 b5\n2. c1 d1  c5 d5\n3. e1 a2  e5 a4\n4. b2 c2  b4 c4\n5. d2 e2  d4 e4\n6. a3 b3  d3 e3\n';

  test('figure 16.2: pieces enter in pairs', () => {
    const t = replay('seega', '1. a4 b2  a1 d2\n2. b4 c5  c2 c4');
    expectClean(t);
    assert.equal(t.plies.length, 4);
    expectPosition(last(t), { white: 'a4 b2 b4 c5', black: 'a1 d2 c2 c4' });
    assert.same(last(t).hand, [0, 8, 8]);
  });

  test('the player who placed the last pair moves first', () => {
    const t = replay('seega', PLACEMENT + '7... d3 – c3');
    expectClean(t);
    assert.equal(t.states[12].phase, 'move');
    assert.equal(t.states[12].turn, BLACK);
    assert.equal(t.plies[12].player, BLACK);
    assert.includes(t.plies[11].infos, 'Black placed the last pair and so moves first');
    assert.same(on(last(t), BLACK).indexOf('c3') !== -1, true);
  });

  test('a “...” in the other player’s column at that point is just an empty cell', () => {
    const t = replay('seega', PLACEMENT + '7. ... d3 – c3\n8. b3 – c3');
    assert.same(t.plies[12].notes, []);
    assert.equal(t.plies[12].player, WHITE, 'the blank belongs to white');
    assert.equal(t.plies[13].player, BLACK);
    assert.same(t.plies[13].notes, []);
    assert.same(t.plies.slice(12, 14).map((p) => p.turn), [7, 7]);
  });

  test('figure 16.4: a4 – b4 (x c4) — one piece in custody, a pair is safe', () => {
    const t = replay('seega', '[Brancas "a4 d4 d3 b1 e1"] [Pretas "b5 c4 b3 c3 b2 d2"]\n a4 – b4 (x c4)');
    expectClean(t);
    expectPosition(last(t), { white: 'b4 d4 d3 b1 e1', black: 'b5 b3 c3 b2 d2' });
  });

  test('figure 16.5: a4 – b4 (x b3 c3 c4) captures three ways at once', () => {
    const t = replay('seega', '[Brancas "a4 d4 d3 b2 d2"] [Pretas "b5 c4 b3 c3 e3 c2"]\n a4 – b4 (x b3 c3 c4)');
    expectClean(t);
    expectPosition(last(t), { white: 'b4 d4 d3 b2 d2', black: 'b5 e3 c2' });
  });

  test('figure 16.6: stepping between two enemies is not a capture', () => {
    const t = replay('seega', '[Brancas "a4 d4 d3 b1"] [Pretas "b5 b3 c3 b2"]\n a4 – b4');
    expectClean(t);
    expectPosition(last(t), { white: 'b4 d4 d3 b1', black: 'b5 b3 c3 b2' });
  });

  test('the capture list is optional and a wrong one is flagged', () => {
    const bare = replay('seega', '[Brancas "a4 d4 d3 b2 d2"] [Pretas "b5 c4 b3 c3 e3 c2"]\n a4 – b4');
    expectClean(bare);
    expectPosition(last(bare), { white: 'b4 d4 d3 b2 d2', black: 'b5 e3 c2' });
    const wrong = replay('seega', '[Brancas "a4 d4 d3 b1 e1"] [Pretas "b5 c4 b3 c3 b2 d2"]\n a4 – b4 (x c4 b3)');
    expectNote(wrong, 0, 'recorded captures (c4 b3) do not match the pieces enclosed (c4)');
  });

  test('a blocked player is skipped and the other plays again', () => {
    // White's two pieces are boxed in on a1 and e1; only black's c4 is free to roam.
    const BOXED = '[Brancas "a1 e1"] [Pretas "a2 b1 b2 d1 e2 d2 c4"] [Vez "pretas"]\n';
    const t = replay('seega', BOXED + '1... c4 – c5\n2. pass c5 – b5\n3. pass b2 – b3\n4. a1 – b2');
    expectClean(t);
    assert.same(t.plies.map((p) => p.player), [BLACK, WHITE, BLACK, WHITE, BLACK, WHITE]);
    assert.same(t.plies.map((p) => p.turn), [1, 2, 2, 3, 3, 4]);
    assert.includes(t.plies[0].infos, 'White is blocked and cannot move — Black plays again');
    assert.includes(t.plies[1].infos, 'White has no move this turn');

    const dots = replay('seega', BOXED + '1... c4 – c5\n2. ... c5 – b5\n3. ... b2 – b3\n4. a1 – b2');
    expectClean(dots);
    assert.same(dots.plies.map((p) => p.player), [BLACK, WHITE, BLACK, WHITE, BLACK, WHITE]);

    const direct = replay('seega', BOXED + 'c4 – c5  c5 – b5  b2 – b3  a1 – b2');
    expectClean(direct);
    assert.same(direct.plies.map((p) => p.player), [BLACK, BLACK, BLACK, WHITE]);
    assert.same(direct.plies.map((p) => p.turn), [1, 2, 3, 4]);

    // …but a pass by a side that could move is not a move.
    const free = replay('seega', '[Brancas "a1 e5"] [Pretas "a2 b1 b2 e3"] [Vez "pretas"]\n e3 – e4  pass');
    expectNote(free, 1, 'a turn cannot be passed here');
  });

  test('leaving the opponent with one piece wins', () => {
    const t = replay('seega', '[Brancas "a1 c1 e5"] [Pretas "b1 e3"]\n e5 – e4 #');
    assert.equal(last(t).over, null);
    const won = replay('seega', '[Brancas "a2 c1 e5"] [Pretas "b1 e3"]\n a2 – a1 (x b1) #');
    expectClean(won);
    assert.equal(last(won).over.winner, WHITE);
    assert.includes(last(won).over.reason, 'Black is left with a single piece');
  });

  test('placement rules: pairs, never the centre, no moving before the end', () => {
    expectNote(replay('seega', '1. a1'), 0, 'pieces enter two at a time');
    expectNote(replay('seega', '1. a1 c3'), 0, 'the centre cannot be occupied');
    expectNote(replay('seega', '1. a1 b1  a5 b5  2. a1 – a2'), 2, 'pieces only move once all 24 have been placed');
  });
});

/* ====================================================================== 17 */
suite('ch. 17 — Bagh Chal', () => {
  test('figure 17.1/17.2: tigers on the corners, goats enter one by one', () => {
    const t = replay('baghchal', '1. c2 a1 – b2  2. c3 e5 – d4');
    expectClean(t);
    expectPosition(t.states[0], { white: '', black: 'a1 e1 a5 e5' });
    expectPosition(last(t), { white: 'c2 c3', black: 'b2 e1 a5 d4' });
    assert.equal(last(t).hand[WHITE], 18);
    assert.equal(statusText(t.game, last(t)), 'Goats still entering · Goats to move');
  });

  test('figure 17.3: e5 – e3 – c1 – a1 (x e4 d2 b1)', () => {
    const t = replay('baghchal', '[Tigres "c5 e5 d4 a2"] [Cabras "a5 b5 a4 e4 b3 c3 b2 c2 d2 b1"] [Vez "tigres"]\n e5 – e3 – c1 – a1 (x e4 d2 b1)');
    expectClean(t);
    expectPosition(last(t), { white: 'a5 b5 a4 b3 c3 b2 c2', black: 'c5 a1 d4 a2' });
    assert.equal(last(t).lost[WHITE], 3);
  });

  test('figure 17.4: four tigers with neither a step nor a jump — the goats win', () => {
    const t = replay('baghchal', '[Tigres "a5 d5 e5 d4"] [Cabras "b5 c5 a4 b4 c4 e4 a3 c3 d3 e3 b2"]\n d2 #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(resultText(t.game, last(t).over), 'Goats win — every tiger is trapped');
  });

  test('five goats eaten win for the tigers', () => {
    const t = replay('baghchal', '[Tigres "a1 e1 a5 e5"] [Cabras "b1 a4"] [Capturadas "4 0"] [Vez "tigres"]\n a1 – c1 (x b1) #');
    expectClean(t);
    assert.equal(last(t).over.winner, BLACK);
  });

  test('goats may not move until all twenty have entered, and never jump', () => {
    const t = replay('baghchal', '1. c2 a1 – b2  2. c2 – c3');
    expectNote(t, 2, 'goats may only move once all 20 have entered');
    const later = replay('baghchal', '[Tigres "a1 e1 a5 e5"] [Cabras "c2 c3"] [Reserva "0 0"]\n c2 – d2');
    expectClean(later);
    const jump = replay('baghchal', '[Tigres "a1 e1 a5 d1"] [Cabras "c1"] [Reserva "0 0"]\n c1 – e1');
    expectNote(jump, 0, 'e1 is occupied');
  });
});

/* ====================================================================== 18 */
suite('ch. 18 — Dara', () => {
  test('figure 18.2: placement, one piece per turn', () => {
    const t = replay('dara', '1. a1 b5  2. d2 d3  3. c4 b2  4. b4 c3');
    expectClean(t);
    expectPosition(last(t), { white: 'a1 d2 c4 b4', black: 'b5 d3 b2 c3' });
    assert.same(last(t).hand, [0, 6, 6]);
  });

  test('figure 18.3: b5 – b4 (x d3) lines up three and removes a piece', () => {
    const t = replay('dara', '[Brancas "b5 c4 d4 a2 b2 d2 b1"] [Pretas "b3 d3 c2 e2 c1"]\n b5 – b4 (x d3)');
    expectClean(t);
    expectPosition(last(t), { white: 'b4 c4 d4 a2 b2 d2 b1', black: 'b3 c2 e2 c1' });
  });

  test('figure 18.4: two rows in one move still remove a single piece', () => {
    const t = replay('dara', '[Brancas "b5 c4 d4 c3 b2 d2 b1"] [Pretas "b3 d3 c2 e2 c1"]\n b5 – b4 (x d3)');
    expectClean(t);
    expectPosition(last(t), { white: 'b4 c4 d4 c3 b2 d2 b1', black: 'b3 c2 e2 c1' });
    const greedy = replay('dara', '[Brancas "b5 c4 d4 c3 b2 d2 b1"] [Pretas "b3 d3 c2 e2 c1"]\n b5 – b4 (x d3 b3)');
    expectNote(greedy, 0, 'a row of 3 removes one piece only');
  });

  test('which piece comes off must be written, and only a row of 3 earns it', () => {
    const silent = replay('dara', '[Brancas "b5 c4 d4 a2 b2 d2 b1"] [Pretas "b3 d3 c2 e2 c1"]\n b5 – b4');
    expectNote(silent, 0, 'a row of 3 was made (b4 c4 d4)');
    const none = replay('dara', '[Brancas "b5 c4 a2"] [Pretas "b3 d3 c2 e2 c1"]\n b5 – b4 (x d3)');
    expectNote(none, 0, 'no row of 3 was made, so nothing is captured');
  });

  test('a row of 3 may not be made while placing, nor a row of 4 ever', () => {
    const t = replay('dara', '1. a1 a5  2. b1 b5  3. c1');
    expectNote(t, 4, 'placing on c1 lines up 3 pieces (a1 b1 c1), which is not allowed while placing');
    const four = replay('dara', '[Brancas "a1 b1 c1 d2"] [Pretas "a5 b5 d5 e5"]\n d2 – d1');
    expectNote(four, 0, 'a row of 4 or more is never allowed');
  });

  test('a row that was broken counts again when it is remade', () => {
    const t = replay('dara', '[Brancas "b5 c4 d4 a1"] [Pretas "a3 e5 e3 e1 c1"]\n1. b5 – b4 (x a3)  e1 – e2\n2. b4 – b5  e2 – e1\n3. b5 – b4 (x e3)');
    expectClean(t);
    assert.same(on(last(t), BLACK), ['c1', 'e1', 'e5']);
  });

  test('leaving the opponent with two pieces wins', () => {
    const t = replay('dara', '[Brancas "b5 c4 d4 a1"] [Pretas "a3 e1 e2"]\n b5 – b4 (x a3) #');
    expectClean(t);
    assert.equal(last(t).over.winner, WHITE);
    assert.includes(last(t).over.reason, 'Black is left with 2 pieces');
  });

  test('a player who cannot place opens the movement phase; unplaced pieces are discarded', () => {
    // White holds a piece but every free position would complete a row of three.
    const t = replay('dara', '[Brancas "a1 b1 d1 e1 a3 b3 d3 e3 a5 b5 d5 e5"] [Pretas "a2 b2 c2 d2 e2 a4 b4 c4 d4 e4"] [Reserva "1 3"] [Vez "pretas"]');
    assert.equal(t.states[0].phase, 'place');
    const next = replay('dara', '[Brancas "a1 b1 d1 e1 a3 b3 d3 e3 a5 b5 d5 e5"] [Pretas "a2 b2 d2 e2 a4 b4 d4 e4 c2"] [Reserva "1 3"] [Vez "pretas"]\n c4');
    assert.equal(last(next).phase, 'move');
    assert.same(last(next).hand, [0, 0, 0]);
    assert.equal(last(next).turn, WHITE);
    assert.includes(next.plies[0].infos, 'White cannot place a piece without lining up 3');
  });
});

/* ====================================================================== 19 */
suite('ch. 19 — Fanorona', () => {
  const FIG_19_3 = '[Pretas "a1 b2 c5 e3 d2 e2"] [Brancas "a5 d5 e5 b4 c4 d4 e4 a3 d3"] [Vez "pretas"]\n';
  const FIG_19_4 = '[Pretas "a4 e3 b2 d2 e2"] [Brancas "a5 c5 d5 e5 b4 c4 d4 e4 a3 d3"] [Vez "pretas"]\n';

  test('figure 19.2: the starting position', () => {
    expectPosition(replay('fanorona', '').states[0], {
      white: 'a1 b1 c1 d1 e1 a2 b2 c2 d2 e2 a3 d3', black: 'b3 e3 a4 b4 c4 d4 e4 a5 b5 c5 d5 e5'
    });
  });

  test('figure 19.3: captures by approach', () => {
    const one = replay('fanorona', FIG_19_3 + 'a1 – a2 (x a3)');
    expectClean(one);
    assert.same(on(last(one), WHITE), ['a5', 'b4', 'c4', 'd3', 'd4', 'd5', 'e4', 'e5']);
    const two = replay('fanorona', FIG_19_3 + 'b2 – b3 (x b4)');
    expectClean(two);
    const row = replay('fanorona', FIG_19_3 + 'b2 – c3 (x d4 e5)');
    expectClean(row);
    assert.same(on(last(row), WHITE), ['a3', 'a5', 'b4', 'c4', 'd3', 'd5', 'e4']);
  });

  test('figure 19.4: captures by withdrawal', () => {
    const one = replay('fanorona', FIG_19_4 + 'b2 – c1 (x a3)');
    expectClean(one);
    const row = replay('fanorona', FIG_19_4 + 'd2 – d1 (x d3 d4 d5)');
    expectClean(row);
    assert.same(on(last(row), WHITE), ['a3', 'a5', 'b4', 'c4', 'c5', 'e4', 'e5']);
  });

  test('figure 19.5: b3 – c3 captures a3 by withdrawal or d3 by approach — the player picks', () => {
    const away = replay('fanorona', '[Vez "pretas"] b3 – c3 (x a3)');
    expectClean(away);
    assert.ok(on(last(away), WHITE).indexOf('a3') === -1 && on(last(away), WHITE).indexOf('d3') !== -1);
    const near = replay('fanorona', '[Vez "pretas"] b3 – c3 (x d3)');
    expectClean(near);
    assert.ok(on(last(near), WHITE).indexOf('d3') === -1 && on(last(near), WHITE).indexOf('a3') !== -1);
    const open = replay('fanorona', '[Vez "pretas"] b3 – c3');
    expectNote(open, 0, 'by approach (d3) or by withdrawal (a3)');
    const asPrinted = replay('fanorona', '[Vez "pretas"] b3 – c3 (x a3 ou d3)');
    assert.same(asPrinted.plies[0].notes, []);
    assert.includes(asPrinted.plies[0].infos, 'the record leaves the choice open (a3 or d3)');
    assert.equal(asPrinted.plies.length, 1, '“ou d3” is not read as another move');
  });

  test('a capture stops at the first gap or friendly piece', () => {
    const t = replay('fanorona', '[Brancas "a1"] [Pretas "a3 a5"]\n a1 – a2 (x a3)');
    expectClean(t);
    assert.same(on(last(t), BLACK), ['a5']);
  });

  test('a capture is determined by the step: the list may be left out', () => {
    const t = replay('fanorona', FIG_19_4 + 'd2 – d1');
    expectClean(t);
    assert.same(on(last(t), WHITE), ['a3', 'a5', 'b4', 'c4', 'c5', 'e4', 'e5']);
    const wrong = replay('fanorona', FIG_19_4 + 'd2 – d1 (x d3)');
    expectNote(wrong, 0, 'recorded captures (d3) do not match the pieces taken by withdrawal (d3 d4 d5)');
  });

  test('skipping a mandatory capture is mentioned, not flagged', () => {
    const t = replay('fanorona', '[Brancas "a1 e1"] [Pretas "a3 c5"]\n e1 – e2');
    expectClean(t);
    assert.includes(t.plies[0].infos, 'capture is mandatory when the opponent demands it — a1 - a2 (x a3) was available');
  });
});

/* ====================================================================== 20 */
suite('ch. 20 — Four Field Kono', () => {
  const FIG_20_4 = '[Brancas "b5 e5 a4 c4 d4 e4 a3 b3"] [Pretas "d3 e3 b2 c2 d2 c1 e1"]\n';

  test('figure 20.2: the starting position is Alquerque’s', () => {
    assert.same(replay('kono4', '').states[0].board, replay('alquerque', '').states[0].board);
  });

  test('figure 20.4: e5 – x e3 jumps the own e4 onto the enemy e3', () => {
    const t = replay('kono4', FIG_20_4 + 'e5 – x e3');
    expectClean(t);
    expectPosition(last(t), { white: 'b5 e3 a4 c4 d4 e4 a3 b3', black: 'd3 b2 c2 d2 c1 e1' });
  });

  test('figure 20.4: c1 – x a3 and d2 – x d4 for black', () => {
    const diag = replay('kono4', FIG_20_4 + '[Vez "pretas"] c1 – x a3');
    expectClean(diag);
    expectPosition(last(diag), { white: 'b5 e5 a4 c4 d4 e4 b3', black: 'd3 e3 b2 c2 d2 a3 e1' });
    const file = replay('kono4', FIG_20_4 + '[Vez "pretas"] d2 – x d4');
    expectClean(file);
    expectPosition(last(file), { white: 'b5 e5 a4 c4 e4 a3 b3', black: 'd3 e3 b2 c2 d4 c1 e1' });
  });

  test('other ways of writing the same capture', () => {
    for (const text of ['e5 x e3', 'e5xe3', 'e5 – e3', 'e5 – e3 (x e3)', 'e5-xe3']) {
      const t = replay('kono4', FIG_20_4 + text);
      expectClean(t, text);
      expectPosition(last(t), { white: 'b5 e3 a4 c4 d4 e4 a3 b3', black: 'd3 b2 c2 d2 c1 e1' }, text);
    }
  });

  test('a capture needs an own piece to jump and an enemy piece to land on', () => {
    expectNote(replay('kono4', '[Brancas "a1"] [Pretas "a3 e5"]\n a1 – x a3'), 0, 'there is no piece on a2 to jump over');
    expectNote(replay('kono4', '[Brancas "a1"] [Pretas "a2 a3 e5"]\n a1 – x a3'), 0, 'a2 is not your own piece');
    expectNote(replay('kono4', '[Brancas "a1 a2"] [Pretas "e5 e4"]\n a1 – x b1'), 0, 'written as a capture (x), but there is no enemy piece on b1');
    expectNote(replay('kono4', '[Brancas "a1 a2"] [Pretas "a3 a4 e5"]\n a2 – a3'), 0, 'not a jump over one of your own pieces');
  });

  test('skipping a mandatory capture is mentioned; leaving one piece wins', () => {
    const t = replay('kono4', FIG_20_4 + 'b5 – c5');
    expectClean(t);
    assert.includes(t.plies[0].infos, 'capture is mandatory when the opponent demands it — e5 - x e3 was available');
    const won = replay('kono4', '[Brancas "a1 a2"] [Pretas "a3 e5"]\n a1 – x a3 #');
    expectClean(won);
    assert.equal(last(won).over.winner, WHITE);
  });
});

/* ====================================================================== 21 */
suite('ch. 21 — Tigres e Vacas', () => {
  const FIG_21_5 = '[Tigres "a4 e1"] [Vacas "a5 d5 c4 c3 e3 a2 b2 d1"]\n';

  test('figure 21.2: two tigers, thirteen cows — and the tigers move first', () => {
    const t = replay('tigres', '1. b3 – b2  a3 – b3');
    expectClean(t);
    expectPosition(t.states[0], { white: 'a5 b5 c5 d5 e5 a4 b4 c4 d4 e4 a3 c3 e3', black: 'b3 d3' });
    assert.same(t.plies.map((p) => p.player), [BLACK, WHITE]);
  });

  test('figure 21.5: the four captures, each over one empty position', () => {
    for (const [move, gone] of [['a4 – x a2', 'a2'], ['a4 – x c4', 'c4'], ['e1 – x c3', 'c3'], ['e1 – x e3', 'e3']]) {
      const t = replay('tigres', FIG_21_5 + move);
      expectClean(t, move);
      assert.ok(on(last(t), WHITE).indexOf(gone) === -1, `${move} removes ${gone}`);
      assert.ok(on(last(t), BLACK).indexOf(gone) !== -1, `${move}: the tiger takes its place`);
      assert.equal(on(last(t), WHITE).length, 7);
    }
  });

  test('a cow right next to a tiger cannot be captured', () => {
    const t = replay('tigres', FIG_21_5 + 'a4 – x a5');
    expectNote(t, 0, 'the cow on a5 is right next to the tiger and cannot be captured');
    assert.same(moveList('tigres', replay('tigres', FIG_21_5).states[0]).filter((m) => m.indexOf('x') !== -1),
      ['a4 - x a2', 'a4 - x c4', 'e1 - x c3', 'e1 - x e3']);
  });

  test('figure 21.3: both tigers blocked — the cows win', () => {
    const t = replay('tigres', '[Tigres "e2 a1"] [Vacas "e5 c3 e3 a2 b2 d2 b1 e1"]');
    assert.equal(t.states[0].over.winner, WHITE);
    assert.includes(resultText(t.game, t.states[0].over), 'Cows win — both tigers are blocked');
    const move = replay('tigres', '[Tigres "e2 a1"] [Vacas "e5 c3 e3 a2 b2 d3 b1 e1"] [Vez "vacas"]\n d3 – d2 #');
    expectClean(move);
    assert.equal(last(move).over.winner, WHITE);
  });

  test('six cows eaten win for the tigers; cows never capture', () => {
    const t = replay('tigres', '[Tigres "a4 e1"] [Vacas "a2 e5"] [Capturadas "5 0"]\n a4 – x a2 #');
    expectClean(t);
    assert.equal(last(t).over.winner, BLACK);
    const cow = replay('tigres', '[Tigres "a4 e1"] [Vacas "a2 e5"] [Vez "vacas"]\n a2 – x a4');
    expectNote(cow, 0, 'cows cannot capture');
  });
});

/* ====================================================================== 22 */
suite('ch. 22 — Sz’kwa', () => {
  const FIG_22_3 = '[Pretas "b5 c5 d5 b4 e4 b3 d3 e3 b2 d2"] [Brancas "a5 e5 c4 d4 c3 a2 e2 b1"] [Vez "pretas"]\n';
  const FIG_22_5 = '[Brancas "a5 e5 d4 a3 c3 a2 d2 e2 b1 e1"] [Pretas "b5 c5 d5 a4 b4 e4 b3 d3 e3 b2 c2 a1 c1 d1"]\n';

  test('figure 22.2: groups are joined along the lines of the board', () => {
    const t = replay('szkwa', '[Brancas "a5 e5 c4 d4 c3"] [Pretas "b5 c5 d5 b4 b3 d3 e3 c2 e2"]');
    const board = t.states[0].board;
    const size = (square) => groupAt(board, idx(square)).cells.length;
    assert.equal(size('b5'), 5, 'the black group of five');
    assert.equal(size('e5'), 4, 'the white group of four, joined through the diagonal e5–d4');
    assert.equal(size('d3'), 3, 'the black group of three');
    assert.equal(size('c2'), 1, 'c2 has no diagonal to d3');
    assert.equal(size('a5'), 1);
  });

  test('figure 22.3: a4 (x a5) and c2 (x c3 c4 d4 e5)', () => {
    const single = replay('szkwa', FIG_22_3 + 'a4 (x a5)');
    expectClean(single);
    assert.same(on(last(single), WHITE), ['a2', 'b1', 'c3', 'c4', 'd4', 'e2', 'e5']);
    const group = replay('szkwa', FIG_22_3 + 'c2 (x c3 c4 d4 e5)');
    expectClean(group);
    assert.same(on(last(group), WHITE), ['a2', 'a5', 'b1', 'e2']);
    assert.equal(last(group).lost[WHITE], 4);
  });

  test('figure 22.4: sealing in your own pieces is not a capture', () => {
    const base = '[Pretas "b5 c5 d5 a4 b4 e4 b3 d3 e3 b2 c2 d2"] [Brancas "e5 c4 d4 a2 e2 b1"]\n';
    const lone = replay('szkwa', base + 'a5');
    expectClean(lone);
    assert.ok(on(last(lone), WHITE).indexOf('a5') !== -1);
    const group = replay('szkwa', base + 'c3');
    expectClean(group);
    assert.same(on(last(group), WHITE), ['a2', 'b1', 'c3', 'c4', 'd4', 'e2', 'e5']);
    // …and black can never take them afterwards: there is no position left to enclose from.
    const later = replay('szkwa', base + '1. c3 a3');
    expectClean(later);
    assert.same(on(last(later), WHITE), ['a2', 'b1', 'c3', 'c4', 'd4', 'e2', 'e5'], 'the sealed group stays');
    assert.equal(groupAt(last(later).board, idx('c3')).liberties, 0);
  });

  test('figure 22.5: the last free position takes the group of eleven', () => {
    const t = replay('szkwa', FIG_22_5 + 'c4 (x b5 c5 d5 a4 b4 b3 b2 c2 a1 c1 d1)');
    expectClean(t);
    assert.same(on(last(t), BLACK), ['d3', 'e3', 'e4'], 'the three that do not touch c4 stay');
    assert.equal(last(t).lost[BLACK], 11);
  });

  test('the match ends when the board is full or the pieces run out; most captures win', () => {
    const full = replay('szkwa', '[Brancas "b1 c1 d1 e1 a2 b2 c2 d2 e2 a3 b3 c3"] [Pretas "d3 e3 a4 b4 c4 d4 e4 a5 b5 c5 d5 e5"] [Capturadas "1 3"]\n a1');
    expectClean(full);
    assert.equal(last(full).over.winner, WHITE);
    assert.includes(last(full).over.reason, 'the board is full — White captured 3, Black captured 1');

    const out = replay('szkwa', '[Brancas "a1"] [Pretas "e5"] [Reserva "1 5"] [Capturadas "4 2"]\n1. c3 d3');
    expectClean(out);
    assert.equal(out.states[1].over, null, 'black still has pieces to place');
    assert.equal(last(out).over.winner, BLACK);
    assert.includes(last(out).over.reason, 'White has no pieces left to place — White captured 2, Black captured 4');
  });

  test('filling the last free position can empty half the board', () => {
    const t = replay('szkwa', '[Brancas "a1 b1 c1 d1 e1 a2 b2 c2 d2 e2 a3 b3"] [Pretas "d3 e3 a4 b4 c4 d4 e4 a5 b5 c5 d5 e5"]\n c3');
    expectClean(t);
    assert.same(on(last(t), BLACK), []);
    assert.equal(last(t).lost[BLACK], 12);
    assert.equal(last(t).over, null, 'the board is no longer full, so play goes on');
  });

  test('a turn cannot be passed', () => {
    expectNote(replay('szkwa', '1. c3 pass'), 1, 'a turn cannot be passed here');
  });

  test('a capture list that disagrees with the board is flagged', () => {
    const t = replay('szkwa', FIG_22_3 + 'c2 (x c3 c4)');
    expectNote(t, 0, 'recorded captures (c3 c4) do not match the pieces enclosed (c3 c4 d4 e5)');
    const none = replay('szkwa', FIG_22_3 + 'a3 (x a2)');
    expectNote(none, 0, 'recorded captures (a2) do not match the pieces enclosed (none)');
  });
});
