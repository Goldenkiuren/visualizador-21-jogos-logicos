/**
 * state.test.js — the parts every game shares: the registry, the headers
 * that set up a position, turn numbering and the checks made on each ply.
 */

import { suite, test, assert } from './harness.js';
import { replay, last, on, kingsOn, blocksOn, expectClean, expectNote, freshState, WHITE, BLACK } from './util.js';
import {
  GAMES, VARIANTS, DEFAULT_VARIANT, findVariant, hasVariant, variantFromName, variantFromTags,
  statusText, resultText, scoreline, notate, legalMoves
} from '../js/state.js';
import { readTags } from '../js/parser.js';
import { step, place } from '../js/rules.js';
import { toIndex, BOARD_LINES, GRID_LINES, NEIGHBORS, ray, isAdjacent, stepFrom } from '../js/coords.js';

suite('the board', () => {
  test('16 drawn lines: 12 of five positions and 4 short diagonals of three', () => {
    assert.equal(BOARD_LINES.length, 16);
    assert.equal(BOARD_LINES.filter((l) => l.length === 5).length, 12);
    assert.equal(BOARD_LINES.filter((l) => l.length === 3).length, 4);
    for (const line of BOARD_LINES) {
      for (let k = 0; k + 1 < line.length; k++) assert.ok(isAdjacent(line[k], line[k + 1]), 'a drawn line is made of drawn steps');
    }
  });

  test('diagonals exist only where col + row is even', () => {
    assert.equal(NEIGHBORS[toIndex('c3')].length, 8);
    assert.equal(NEIGHBORS[toIndex('b3')].length, 4);
    assert.equal(NEIGHBORS[toIndex('a1')].length, 3);
    assert.equal(NEIGHBORS[toIndex('b1')].length, 3);
    assert.equal(stepFrom(toIndex('b3'), 1, 1), -1);
    assert.equal(stepFrom(toIndex('b2'), 1, 1), toIndex('c3'));
  });

  test('a ray never turns the corner where the short diagonals meet', () => {
    assert.same(ray(toIndex('a3'), toIndex('c5')), [toIndex('b4')]);
    assert.equal(ray(toIndex('b4'), toIndex('d4')) !== null, true);
    assert.equal(ray(toIndex('a3'), toIndex('e3')).length, 3);
    assert.equal(ray(toIndex('b1'), toIndex('d3')), null, 'b1–c2–d3 is not drawn');
    assert.equal(ray(toIndex('a1'), toIndex('c2')), null);
  });

  test('the bare grid has 30 lines of two or more nodes', () => {
    // 5 rows + 5 columns + 9 diagonals each way, less the 4 single corners… = 5 + 5 + 7 + 7.
    assert.equal(GRID_LINES.length, 24);
    assert.equal(GRID_LINES.filter((l) => l.length === 5).length, 12);
  });
});

suite('the registry', () => {
  test('21 games, chapters 2 to 22, in the order of the book', () => {
    assert.equal(GAMES.length, 21);
    assert.same(GAMES.map((g) => g.chapter), Array.from({ length: 21 }, (_, i) => i + 2));
    assert.equal(VARIANTS.length, 29);
    assert.equal(new Set(VARIANTS.map((v) => v.id)).size, 29, 'variant ids are unique');
    assert.ok(hasVariant(DEFAULT_VARIANT));
  });

  test('the categories of the book’s introduction', () => {
    const family = (name) => GAMES.filter((g) => g.family === name).map((g) => g.name).sort();
    assert.same(family('bloqueio'), ['Amazonas', 'Rastros']);
    assert.same(family('posicionamento'), ['Jogo-da-Velha 4', 'Pah Tum', 'Quadra', 'Sz’kwa']);
    assert.same(family('alinhamento'), ['Dara', 'Tic Tackle', 'Tonkin', 'Tsoro Yematatu']);
    assert.same(family('deslocamento'), ['Five Field Kono', 'Halma']);
    assert.same(family('captura'), ['Alquerque (Fetaix)', 'Fanorona', 'Four Field Kono', 'Seega', 'Yoté']);
    assert.same(family('caça'), ['Bagh Chal', 'Coiote e Galinhas', 'Raposa e Cachorros', 'Tigres e Vacas']);
  });

  test('every game describes itself completely', () => {
    for (const game of GAMES) {
      for (const key of ['id', 'name', 'motto', 'family']) assert.equal(typeof game[key], 'string', `${game.id}.${key}`);
      assert.ok(game.rules.length >= 3, `${game.id}: rules`);
      assert.ok(game.notation.length >= 2, `${game.id}: notation`);
      assert.ok(game.roles[1].pt && game.roles[1].en && game.roles[2].pt && game.roles[2].en, `${game.id}: roles`);
      assert.ok(game.first === WHITE || game.first === BLACK, `${game.id}: first`);
      for (const fn of ['initial', 'legalMoves', 'play']) assert.equal(typeof game[fn], 'function', `${game.id}.${fn}`);
      const state = freshState(game.variants[0].id);
      assert.equal(state.turn, game.variants[0].first || game.first, `${game.id}: who starts`);
      assert.ok(legalMoves(game, game.variants[0], state, false).length > 0, `${game.id}: there is a first move`);
    }
  });

  test('who moves first', () => {
    const first = (id) => freshState(id).turn;
    assert.equal(first('coiote'), BLACK, 'the coyote');
    assert.equal(first('tigres'), BLACK, 'the tigers');
    assert.equal(first('baghchal'), WHITE, 'the goats');
    assert.equal(first('raposa'), WHITE, 'the dogs, as in the book’s match');
    assert.equal(first('raposa-fox'), BLACK);
    assert.equal(first('alquerque'), WHITE);
  });

  test('a record’s own header names its game', () => {
    const named = (text) => variantFromTags(readTags(text));
    assert.equal(named('[Jogo "Alquerque"]'), 'alquerque');
    assert.equal(named('[Jogo "Fetaix"]'), 'fetaix');
    assert.equal(named('[Jogo "Alquerque + promoção"]'), 'promocao');
    assert.equal(named('[Game "Jogo-da-Velha 4"]'), 'velha4');
    assert.equal(named('[Jogo "Jogo Seega"]'), 'seega');
    assert.equal(named('[Jogo "Sz’kwa"]'), 'szkwa');
    assert.equal(named('[Jogo "Sz\'kwa"]'), 'szkwa');
    assert.equal(named('[Jogo "five field kono"]'), 'fivefield');
    assert.equal(named('[Jogo "Four Field Kono"]'), 'kono4');
    assert.equal(named('[Jogo "Tsoro Yematatu"]'), 'tsoro1');
    assert.equal(named('[Jogo "Tsoro Yematatu — 2º jogo"]'), 'tsoro2');
    assert.equal(named('[Jogo "Tsoro Yematatu — 3º jogo: vizinhas ou salto"]'), 'tsoro3');
    assert.equal(named('[Jogo "Pah Tum — pontuação original"]'), 'pahtum-original');
    assert.equal(named('[Jogo "Raposa e Cachorros — a raposa começa"]'), 'raposa-fox');
    assert.equal(named('[Regras "Amazonas — 1 peça"]'), 'amazonas-1');
    assert.equal(named('[Jogo "tigres"]'), 'tigres');
    assert.equal(named('[Jogo "Xadrez"]'), null);
    assert.equal(named('[Jogador 1 "brancas"]'), null);
    assert.equal(named('1. c3 b2'), null);
  });

  test('every label and every game name leads back to its variant', () => {
    for (const v of VARIANTS) assert.equal(variantFromName(v.label), v.id, v.label);
    for (const g of GAMES) assert.equal(variantFromName(g.name), g.variants[0].id, g.name);
    assert.equal(findVariant('no-such-game').rules.id, DEFAULT_VARIANT);
  });
});

suite('position headers', () => {
  test('[Brancas] [Pretas] [Bloqueios] build a board from nothing', () => {
    const t = replay('alquerque', '[Brancas "a1, b2"] [Pretas "e5 d4"] [Bloqueios "c3"]');
    expectClean(t);
    assert.same(on(t.states[0], WHITE), ['a1', 'b2']);
    assert.same(on(t.states[0], BLACK), ['d4', 'e5']);
    assert.same(blocksOn(t.states[0]), ['c3']);
    assert.equal(t.states[0].started, true);
  });

  test('English names and each game’s own names for its sides', () => {
    assert.same(on(replay('alquerque', '[White "a1"] [Black "e5"]').states[0], BLACK), ['e5']);
    assert.same(on(replay('baghchal', '[Tigres "a1 e5"] [Cabras "c3"]').states[0], BLACK), ['a1', 'e5']);
    assert.same(on(replay('baghchal', '[Tigers "a1"] [Goats "c3 c4"]').states[0], WHITE), ['c3', 'c4']);
    assert.same(on(replay('coiote', '[Coiote "c3"] [Galinhas "a5"]').states[0], BLACK), ['c3']);
    assert.same(on(replay('raposa', '[Raposa "c5"] [Cachorros "a1"]').states[0], WHITE), ['a1']);
    assert.same(on(replay('tigres', '[Vacas "a5 b5"] [Tigre "b3"]').states[0], BLACK), ['b3']);
  });

  test('Mullahs: a5=M, a5* or a [Mullah] header', () => {
    assert.same(kingsOn(replay('fetaix', '[Brancas "a5=M b1"] [Pretas "e5"]').states[0]), ['a5']);
    assert.same(kingsOn(replay('fetaix', '[Brancas "a5* b1"] [Pretas "e1=Mullah"]').states[0]), ['a5', 'e1']);
    assert.same(kingsOn(replay('fetaix', '[Brancas "a5 b1"] [Pretas "e5"] [Mullah "a5"]').states[0]), ['a5']);
    assert.includes(replay('fetaix', '[Brancas "b1"] [Pretas "e5"] [Mullah "c3"]').warnings, 'no piece is listed there');
  });

  test('[Vez] says who is to move — by colour, by role or by number', () => {
    assert.equal(replay('alquerque', '[Vez "pretas"]').states[0].turn, BLACK);
    assert.equal(replay('alquerque', '[Turn "black"]').states[0].turn, BLACK);
    assert.equal(replay('baghchal', '[Vez "tigres"]').states[0].turn, BLACK);
    assert.equal(replay('coiote', '[Vez "galinhas"]').states[0].turn, WHITE);
    assert.equal(replay('coiote', '[Vez "1"]').states[0].turn, BLACK, 'player 1 of Coiote e Galinhas is the coyote');
    assert.equal(replay('rastros', '[Vez "jogador 2"]').states[0].turn, 2);
    assert.includes(replay('alquerque', '[Vez "verdes"]').warnings, 'does not name a side');
    assert.equal(replay('alquerque', '[Vez "pretas"]').states[0].started, false, 'the turn alone does not make a custom position');
  });

  test('[Reserva] and [Capturadas]', () => {
    const t = replay('yote', '[Brancas "a1"] [Pretas "e5"] [Reserva "3 4"] [Capturadas "8 7"]');
    assert.same(t.states[0].hand, [0, 3, 4]);
    assert.same(t.states[0].lost, [0, 8, 7]);
    const named = replay('yote', '[Brancas "a1"] [Pretas "e5"] [Reserva "pretas 2, brancas 5"]');
    assert.same(named.states[0].hand, [0, 5, 2]);
    assert.includes(replay('yote', '[Reserva "muitas"]').warnings, 'could not read two numbers');
  });

  test('pieces in hand default to what the position leaves over', () => {
    assert.same(replay('yote', '[Brancas "a1 b1"] [Pretas "e5"]').states[0].hand, [0, 10, 11]);
    assert.same(replay('baghchal', '[Tigres "a1 e1 a5 e5"] [Cabras "c3 c2"] [Capturadas "1 0"]').states[0].hand, [0, 17, 0]);
    assert.same(replay('seega', '[Brancas "a1"] [Pretas "e5 e4"]').states[0].hand, [0, 0, 0], 'a Seega diagram is a movement position');
    assert.equal(replay('seega', '[Brancas "a1"] [Pretas "e5 e4"]').states[0].phase, 'move');
    assert.same(replay('tonkin', '[Brancas "a1 b1"] [Pretas "e5"]').states[0].hand, [0, 3, 4]);
  });

  test('mistakes in the headers are reported, not swallowed', () => {
    assert.includes(replay('alquerque', '[Brancas "a1 a1"] [Pretas "e5"]').warnings, 'a1 is listed more than once');
    assert.includes(replay('alquerque', '[Brancas "a1 z9"] [Pretas "e5"]').warnings, 'could not read “z9”');
    assert.includes(replay('rastros', '[Bloqueios "b2"]').warnings, 'Rastros needs its piece');
  });

  test('a position that is already decided says so', () => {
    const t = replay('velha4', '[Brancas "a1 b1 c1 d1"] [Pretas "a5 b5 c5"]');
    assert.equal(t.states[0].over.winner, WHITE);
    assert.includes(statusText(t.game, t.states[0]), 'Match over · White wins');
  });
});

suite('turns, numbering and marks', () => {
  test('turn and column of every ply', () => {
    const t = replay('alquerque', '1. d2 - c3  b4 - d2 (x c3)  2. e1 - c3 (x d2)');
    assert.same(t.plies.map((p) => [p.turn, p.col, p.opensRow]), [[1, 0, true], [1, 1, false], [2, 0, true]]);
    assert.same(t.plies.map((p) => p.player), [WHITE, BLACK, WHITE]);
  });

  test('numbers are optional; the record’s own numbers win', () => {
    const bare = replay('velha4', 'c3 b2 b3 d3');
    assert.same(bare.plies.map((p) => p.turn), [1, 1, 2, 2]);
    const numbered = replay('velha4', '7. c3 b2 8. b3 d3');
    assert.same(numbered.plies.map((p) => p.turn), [7, 7, 8, 8]);
  });

  test('the side that starts sits in the first column, whatever its colour', () => {
    const t = replay('tigres', '1. b3 – b2  a3 – b3');
    assert.same(t.plies.map((p) => [p.player, p.col]), [[BLACK, 0], [WHITE, 1]]);
    assert.equal(t.first, BLACK);
  });

  test('“...” takes a turn and changes nothing', () => {
    const t = replay('alquerque', '1. ... b4 - c3');
    assert.same(t.plies.map((p) => p.omitted), [true, false]);
    assert.same(t.states[1].board, t.states[0].board);
    assert.equal(t.plies[1].player, BLACK);
    expectClean(t);
  });

  test('# is checked against the rules', () => {
    expectNote(replay('alquerque', '1. d2 - c3 #'), 0, '# is written, but White has not won here by the rules');
    expectNote(replay('rastros', '[Peça "b2"]\n a1 #'), 0, '# is written, but this move gives the match to Player 2');
    expectClean(replay('velha4', '[Brancas "a1 b1 c1"] [Pretas "a5 b5 c5"]\n d1 #'));
  });

  test('moves after the end are flagged', () => {
    const t = replay('velha4', '[Brancas "a1 b1 c1"] [Pretas "a5 b5 c5"]\n d1 # d5');
    expectNote(t, 1, 'the match was already over — White wins');
    assert.equal(last(t).over.winner, WHITE, 'the result does not change');
  });

  test('a promotion marker in a game without promotion', () => {
    expectNote(replay('halma', '1. b2 – b3 [Mullah]'), 0, 'Halma has no promotion');
  });

  test('a side left without a move, where the book is silent, is mentioned only', () => {
    const t = replay('tictackle', '[Brancas "a1"] [Pretas "a2 b1 b2 e5"] [Vez "pretas"]\n e5 – e4');
    expectClean(t);
    assert.includes(t.plies[0].infos, 'White has no legal move now');
    assert.equal(last(t).over, null);
  });
});

suite('what the page shows', () => {
  test('the status line', () => {
    assert.equal(statusText(findVariant('alquerque').game, freshState('alquerque')), 'White to move');
    assert.equal(statusText(findVariant('coiote').game, freshState('coiote')), 'Coyote to move');
    assert.equal(statusText(findVariant('seega').game, freshState('seega')), 'Placement · White to move');
    assert.equal(statusText(findVariant('rastros').game, freshState('rastros')), 'Player 1 to move');
    assert.equal(statusText(findVariant('baghchal').game, freshState('baghchal')), 'Goats still entering · Goats to move');
  });

  test('results read naturally for singular and plural sides', () => {
    const game = (id) => findVariant(id).game;
    assert.equal(resultText(game('raposa'), { winner: WHITE, reason: 'x' }), 'Dogs win — x');
    assert.equal(resultText(game('raposa'), { winner: BLACK, reason: 'x' }), 'Fox wins — x');
    assert.equal(resultText(game('velha4'), { winner: 0, reason: 'x' }), 'Draw — x');
  });

  test('the scoreline: counts and the small figures beside them', () => {
    const score = (id, text) => { const t = replay(id, text || ''); return scoreline(t.game, last(t)); };
    assert.same(score('alquerque').main, [null, '12', '12']);
    assert.same(score('rastros').main, [null, '', '']);
    assert.same(score('baghchal').chips[1], [{ label: 'to enter', value: '20' }]);
    assert.same(score('baghchal').chips[2], [{ label: 'eaten', value: '0/5' }]);
    assert.same(score('coiote').chips[2], [{ label: 'captured', value: '0/6' }]);
    assert.same(score('coiote').chips[1], []);
    assert.same(score('quadra').chips[1], [{ label: 'in hand', value: '16' }, { label: 'pairs', value: '0/2' }]);
    assert.same(score('pahtum').chips[1], [{ label: 'points', value: '0' }]);
    assert.same(score('alquerque', '1. d2 - c3  b4 - d2 (x c3)').chips[2], [{ label: 'captured', value: '1' }]);
    assert.same(score('fivefield', '1. a2 - a3  a4 - b4').chips[1], [{ label: 'far side filled', value: '6/7' }]);
  });

  test('moves are written the way each chapter writes them', () => {
    const game = (id) => findVariant(id).game;
    const [a1, c1, e3, b2] = ['a1', 'c1', 'e3', 'b2'].map(toIndex);
    assert.equal(notate(game('alquerque'), step([a1, c1], [toIndex('b1')])), 'a1 - c1 (x b1)');
    assert.equal(notate(game('alquerque'), step([a1, c1, e3], [toIndex('b1'), toIndex('d2')], { promo: true })), 'a1 - c1 - e3 (x b1 d2) [Mullah]');
    assert.equal(notate(game('kono4'), step([a1, c1], [c1])), 'a1 - x c1');
    assert.equal(notate(game('tigres'), step([a1, c1])), 'a1 - c1');
    assert.equal(notate(game('rastros'), step([b2, c1])), 'c1');
    assert.equal(notate(game('seega'), place([a1, c1])), 'a1 c1');
    assert.equal(notate(game('quadra'), place([a1], [b2, c1, e3, toIndex('d2')], { groups: [[b2, c1], [e3, toIndex('d2')]] })), 'a1 (x b2 c1) (x e3 d2)');
    assert.equal(notate(game('amazonas'), step([a1, c1, e3])), 'a1 - c1 - e3');
  });

  test('strict legal moves leave out the ones that dodge a capture', () => {
    const { game, rules } = findVariant('alquerque');
    const t = replay('alquerque', '1. d2 - c3');
    const all = legalMoves(game, rules, last(t), false);
    const strict = legalMoves(game, rules, last(t), true);
    assert.ok(all.length > strict.length);
    assert.same(strict.map((m) => notate(game, m)), ['b4 - d2 (x c3)'], 'only the capture of c3 remains');
    assert.ok(all.find((m) => m.quiet && m.caps.length === 0), 'the quiet moves are still legal, and marked');
  });
});
