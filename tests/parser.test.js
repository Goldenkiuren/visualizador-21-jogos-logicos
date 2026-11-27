/**
 * parser.test.js — every way the book (and a hurried typist) writes a move.
 */

import { suite, test, assert } from './harness.js';
import { parse, readTags, tagKey } from '../js/parser.js';

const moves = (text, options) => parse(text, options).moves;
const paths = (text, options) => moves(text, options).map((m) => m.path.join('-'));
const one = (text, options) => {
  const list = moves(text, options);
  assert.equal(list.length, 1, `“${text}” should be one move`);
  return list[0];
};

suite('parser — movement', () => {
  test('every separator the book and a keyboard offer', () => {
    for (const text of ['c3 – b4', 'c3-b4', 'c3 - b4', 'c3 — b4', 'c3→b4', 'c3 → b4', 'c3->b4', 'c3 > b4', 'c3b4', 'c3 −b4', 'C3 – B4', 'c3:b4']) {
      const m = one(text);
      assert.equal(m.kind, 'move', text);
      assert.same(m.path, ['c3', 'b4'], text);
      assert.equal(m.from, 'c3');
      assert.equal(m.to, 'b4');
    }
  });

  test('a path of any length', () => {
    assert.same(one('a1 – c1 – e3 – c5').path, ['a1', 'c1', 'e3', 'c5']);
    assert.same(one('c1-a1-d4').path, ['c1', 'a1', 'd4']);
    assert.same(one('a1c1e3').path, ['a1', 'c1', 'e3']);
  });

  test('a lone coordinate is a placement', () => {
    const m = one('c3');
    assert.equal(m.kind, 'place');
    assert.same(m.path, ['c3']);
    assert.equal(m.to, null);
  });

  test('two moves on a line stay two moves', () => {
    assert.same(paths('1. d1 – d2 c5 – d4'), ['d1-d2', 'c5-d4']);
    assert.same(paths('c3 b2'), ['c3', 'b2']);
    assert.same(paths('a3 a1\ne4 d3'), ['a3', 'a1', 'e4', 'd3']);
  });

  test('coordinates inside words or numbers are not moves', () => {
    assert.same(paths('club3 b12 a1b xe4z'), []);
    assert.same(paths('e2x'), []);
    assert.same(paths('see a4'), ['a4']);
  });
});

suite('parser — captures', () => {
  test('a capture list in parentheses', () => {
    const m = one('a4 – b4 (x c4)');
    assert.same(m.path, ['a4', 'b4']);
    assert.same(m.captures, ['c4']);
    assert.same(one('e3 – e5 – c3 (x e4 d4)').captures, ['e4', 'd4']);
    assert.same(one('a4-b4(xb3,c3,c4)').captures, ['b3', 'c3', 'c4']);
    assert.same(one('a4 – b4 (× c4)').captures, ['c4']);
  });

  test('a placement that captures, clause by clause (Quadra, Sz’kwa)', () => {
    const m = one('b4 (x b2 b3) (x c3 d2) #');
    assert.equal(m.kind, 'place');
    assert.same(m.captures, ['b2', 'b3', 'c3', 'd2']);
    assert.same(m.captureGroups, [['b2', 'b3'], ['c3', 'd2']]);
    assert.equal(m.mark, '#');
    assert.same(one('c2 (x c3 c4 d4 e5)').captures, ['c3', 'c4', 'd4', 'e5']);
  });

  test('“e5 – x e3”: a capture that lands on its victim', () => {
    for (const text of ['e5 – x e3', 'e5 - x e3', 'e5 –x e3', 'e5-xe3', 'e5 x e3', 'e5xe3', 'e5 × e3']) {
      const m = one(text);
      assert.same(m.path, ['e5', 'e3'], text);
      assert.equal(m.takes, true, text);
      assert.same(m.captures, [], text);
    }
    assert.equal(one('e5 – e3').takes, false);
  });

  test('“b3 x b1” after a capture list starts a new move', () => {
    assert.same(paths('a4 – b4 (x c4) d2 x d4'), ['a4-b4', 'd2-d4']);
  });

  test('a choice left open, as the book prints it', () => {
    const m = one('b3 – c3 (x a3 ou d3)');
    assert.same(m.captures, ['a3']);
    assert.same(m.captureAlt, ['d3']);
    assert.same(one('b3 – c3 (x a3 or d3)').captureAlt, ['d3']);
    assert.same(one('b3 – c3 (x a3 / d3)').captureAlt, ['d3']);
  });
});

suite('parser — promotion, marks, blanks', () => {
  test('[Mullah] and =Mullah', () => {
    assert.equal(one('a4 – a5 [Mullah]').promotion, 'Mullah');
    assert.equal(one('a4 – a5 =Mullah').promotion, 'Mullah');
    assert.equal(one('b3 – b5 (x b4) [Mullah]').promotion, 'Mullah');
    assert.equal(one('a4 – a5').promotion, null);
  });

  test('the book’s own quoting: “a4 – a5” [Mullah]', () => {
    const m = one('caso 1, “a4 – a5” [Mullah];');
    assert.same(m.path, ['a4', 'a5']);
    assert.equal(m.promotion, 'Mullah');
    const c = one('caso 2, “b3 – b5 (x b2)” [Mullah];');
    assert.same(c.captures, ['b2']);
    assert.equal(c.promotion, 'Mullah');
  });

  test('# marks the move that ends the match', () => {
    assert.equal(one('a5 #').mark, '#');
    assert.equal(one('b3 – b4#').mark, '#');
    assert.equal(one('c2 – d2 # ').text, 'c2 – d2 #');
    assert.equal(one('a5').mark, null);
  });

  test('“...” is a move the record leaves out', () => {
    const list = moves('10. ... ...\n11. ... d5 – d4');
    assert.same(list.map((m) => m.kind), ['omitted', 'omitted', 'omitted', 'move']);
    assert.same(list.map((m) => m.number), [10, null, 11, null]);
    assert.equal(moves('… c3')[0].kind, 'omitted');
  });

  test('“12...” is a move number, not a blank', () => {
    const list = moves('12... d5 – d4');
    assert.equal(list.length, 1);
    assert.equal(list[0].number, 12);
  });

  test('pass / passa', () => {
    assert.same(moves('pass c3 passa Passou').map((m) => m.kind), ['pass', 'place', 'pass', 'pass']);
    assert.same(moves('passage compass').map((m) => m.kind), []);
  });
});

suite('parser — pairs (Seega)', () => {
  const PAIRS = { pairs: true };

  test('two lone coordinates are one turn', () => {
    const list = moves('1. b4 c5  c2 c4', PAIRS);
    assert.same(list.map((m) => m.path.join(' ')), ['b4 c5', 'c2 c4']);
    assert.same(list.map((m) => m.kind), ['place', 'place']);
    assert.same(moves('b4, c5', PAIRS)[0].path, ['b4', 'c5']);
  });

  test('…but not when the second one starts a movement', () => {
    assert.same(paths('b4 c5 – c4', PAIRS), ['b4', 'c5-c4']);
    assert.same(paths('a4 – b4 (x c4)  d2 – d3', PAIRS), ['a4-b4', 'd2-d3']);
    assert.same(paths('b4 c5d5', PAIRS), ['b4', 'c5-d5']);
  });

  test('a single placement and an odd one out', () => {
    assert.same(paths('b4', PAIRS), ['b4']);
    assert.same(paths('b4 c5 a1', PAIRS), ['b4-c5', 'a1']);
    assert.same(paths('b4\nc5', PAIRS), ['b4', 'c5'], 'a pair does not span lines');
  });

  test('without the option they are two placements', () => {
    assert.same(paths('b4 c5'), ['b4', 'c5']);
  });
});

suite('parser — what is ignored', () => {
  test('comments in braces, after ; and after //', () => {
    const { moves: list } = parse('1. c3 { the centre } b2 ; black answers\n// a line of its own\n2. b3');
    assert.same(list.map((m) => m.path[0]), ['c3', 'b2', 'b3']);
    assert.equal(list[0].comment, 'the centre');
    assert.equal(list[1].comment, 'black answers');
    assert.equal(list[2].comment, 'a line of its own');
  });

  test('a comment may span lines, mention squares, and be left open', () => {
    const { moves: list } = parse('1. c3 { takes\n  a1 and b2 }\n2. d4 { never closed: e5');
    assert.same(list.map((m) => m.path[0]), ['c3', 'd4']);
    assert.equal(list[0].comment, 'takes a1 and b2');
    assert.equal(list[1].comment, 'never closed: e5');
  });

  test('a comment on its own line introduces the next move', () => {
    const { moves: list } = parse('{ opening }\n1. c3 b2\n{ reply }\n2. b3');
    assert.equal(list[0].comment, 'opening');
    assert.equal(list[1].comment, null);
    assert.equal(list[2].comment, 'reply');
  });

  test('headers, move numbers and results', () => {
    const text = '[Jogo "Alquerque"]\n[Jogador 1 "brancas"]\n[Site "c3 d4"]\n1. c3 b2 2. b3 d3 1-0\n3. a1 * 1/2-1/2';
    assert.same(paths(text), ['c3', 'b2', 'b3', 'd3', 'a1']);
  });

  test('typographic quotes in headers', () => {
    const tags = readTags('[Jogo “Fetaix”] [Bloqueios "d5 b3"]');
    assert.same(tags.map((t) => [t.key, t.value]), [['jogo', 'Fetaix'], ['bloqueios', 'd5 b3']]);
  });

  test('empty and hopeless input', () => {
    assert.same(parse('').moves, []);
    assert.same(parse('').warnings, []);
    assert.same(parse(null).moves, []);
    assert.includes(parse('nothing here at all').warnings, 'No valid move tokens');
    assert.includes(parse('{ only a comment }').warnings, 'Comment found but no moves');
  });
});

suite('parser — bookkeeping', () => {
  test('offsets point back into the original text', () => {
    const text = '  1. c3 – b4 (x d2) #  { hi }  e5-e4';
    const [a, b] = moves(text);
    assert.equal(text.slice(a.start, a.end), 'c3 – b4 (x d2) #');
    assert.equal(a.text, 'c3 – b4 (x d2) #');
    assert.equal(text.slice(b.start, b.end), 'e5-e4');
  });

  test('line numbers and written move numbers', () => {
    const list = moves('[Jogo "x"]\n\n10. a1 b1\n11. c1\n   d1');
    assert.same(list.map((m) => m.line), [3, 3, 4, 5]);
    assert.same(list.map((m) => m.number), [10, null, 11, null]);
    assert.same(list.map((m) => m.ply), [0, 1, 2, 3]);
  });

  test('tag keys ignore case, accents and punctuation', () => {
    assert.equal(tagKey('Peça'), 'peca');
    assert.equal(tagKey('Sz’kwa'), 'szkwa');
    assert.equal(tagKey('Jogo-da-Velha 4'), 'jogodavelha4');
    assert.equal(tagKey('  BLOQUEIOS '), 'bloqueios');
  });
});
