/**
 * samples.test.js — the examples offered by the page.
 *
 * Every entry of the Game selector has at least one example; every example
 * is headed with the game it belongs to; and every example replays without
 * a single flag — except the few that reproduce misprints of the book on
 * purpose, which must raise exactly the flags they announce.
 */

import { suite, test, assert } from './harness.js';
import { replay, last } from './util.js';
import { VARIANTS, variantFromTags } from '../js/state.js';
import { readTags } from '../js/parser.js';
import { SAMPLES, samplesFor, isSample } from '../js/sample.js';

suite('samples', () => {
  test('every entry of the Game selector has a demo', () => {
    for (const v of VARIANTS) assert.ok(samplesFor(v.id).length >= 1, v.id);
    assert.same(Object.keys(SAMPLES).filter((id) => !VARIANTS.find((v) => v.id === id)), [], 'no samples for unknown games');
  });

  for (const v of VARIANTS) {
    test(`${v.id}: ${samplesFor(v.id).length} example(s) replay as announced`, () => {
      const titles = new Set();
      for (const sample of samplesFor(v.id)) {
        assert.ok(!titles.has(sample.title), `duplicate title “${sample.title}”`);
        titles.add(sample.title);
        assert.equal(variantFromTags(readTags(sample.text)), v.id, `“${sample.title}” is headed with its own game`);

        const t = replay(v.id, sample.text);
        assert.ok(t.plies.length > 0, `“${sample.title}” has moves`);
        const flagged = t.plies.filter((p) => p.notes.length).length + t.setupNotes.length;
        assert.equal(flagged, sample.flags, `“${sample.title}”: ${t.warnings.join(' | ')}`);
        assert.ok(isSample(sample.text));
        assert.ok(isSample('  ' + sample.text.replace(/\n/g, '\n  ')), 'whitespace does not matter');
      }
    });
  }

  test('the first example of each game is a clean demo', () => {
    for (const v of VARIANTS) assert.equal(samplesFor(v.id)[0].flags, 0, v.id);
  });

  test('the two original demos are still there, word for word', () => {
    assert.includes(SAMPLES.alquerque[0].text, '7. c1 - e3 - e5 - c3 (x d2 e4 d4)');
    assert.includes(SAMPLES.alquerque[0].text, 'Offered a third time — and this time taking it is a mistake.');
    assert.includes(SAMPLES.fetaix[0].text, '7. b4 - a5 [Mullah]');
    assert.includes(SAMPLES.fetaix[0].text, '8. a5 - d2');
    assert.equal(replay('alquerque', SAMPLES.alquerque[0].text).plies.length, 13);
    assert.equal(replay('fetaix', SAMPLES.fetaix[0].text).plies.length, 15);
  });

  test('most demos are played to a result', () => {
    const open = VARIANTS.filter((v) => !last(replay(v.id, samplesFor(v.id)[0].text)).over).map((v) => v.id);
    // Alquerque and its two stages are openings: the book itself says such games drag into a draw.
    assert.same(open, ['alquerque', 'promocao', 'fetaix']);
  });

  test('an edited example is no longer “a sample”', () => {
    assert.equal(isSample(SAMPLES.alquerque[0].text + '\n8. a1 - a2'), false);
    assert.equal(isSample(''), false);
  });
});
