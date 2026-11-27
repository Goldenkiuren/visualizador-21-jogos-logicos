/**
 * harness.js — a test runner small enough to read in one sitting.
 *
 * No dependencies and nothing Node-specific, so the same test files run
 * under `node tests/run.mjs` and in a browser at /tests/.
 */

const suites = [];
let current = null;

export function suite(name, body) {
  current = { name, tests: [] };
  suites.push(current);
  body();
  current = null;
}

export function test(name, body) {
  if (!current) throw new Error('test() outside suite(): ' + name);
  current.tests.push({ name, body });
}

function show(value) {
  if (value instanceof Uint8Array) return 'Uint8Array[' + Array.from(value).join(',') + ']';
  try { return JSON.stringify(value); } catch (e) { return String(value); }
}

function same(a, b) {
  if (a === b) return true;
  if (a instanceof Uint8Array || b instanceof Uint8Array) {
    return a && b && a.length === b.length && Array.prototype.every.call(a, (v, i) => v === b[i]);
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => same(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => same(a[k], b[k]));
  }
  return false;
}

function fail(message) {
  const err = new Error(message);
  err.isAssertion = true;
  throw err;
}

export const assert = {
  ok(value, message) {
    if (!value) fail(message || 'expected a truthy value, got ' + show(value));
  },
  equal(actual, expected, message) {
    if (actual !== expected) fail((message ? message + ': ' : '') + 'expected ' + show(expected) + ', got ' + show(actual));
  },
  same(actual, expected, message) {
    if (!same(actual, expected)) fail((message ? message + ': ' : '') + 'expected ' + show(expected) + ', got ' + show(actual));
  },
  /** `haystack` (a string, or a list of strings) mentions `needle`. */
  includes(haystack, needle, message) {
    const text = Array.isArray(haystack) ? haystack.join(' | ') : String(haystack);
    if (text.indexOf(needle) === -1) fail((message ? message + ': ' : '') + 'expected ' + show(text) + ' to mention ' + show(needle));
  },
  throws(body, message) {
    try { body(); } catch (e) { return; }
    fail(message || 'expected the function to throw');
  }
};

/**
 * Run everything registered so far.
 * @param {(line: string, kind: string) => void} log   kind: suite | pass | fail | summary
 * @returns {{passed: number, failed: number, failures: Array}}
 */
export function run(log) {
  let passed = 0;
  const failures = [];
  for (const s of suites) {
    log(s.name, 'suite');
    for (const t of s.tests) {
      try {
        t.body();
        passed++;
        log('  ✓ ' + t.name, 'pass');
      } catch (e) {
        failures.push({ suite: s.name, test: t.name, error: e });
        log('  ✗ ' + t.name + '\n      ' + (e.isAssertion ? e.message : (e.stack || e.message)).split('\n').join('\n      '), 'fail');
      }
    }
  }
  log(`\n${passed} passed, ${failures.length} failed`, 'summary');
  return { passed, failed: failures.length, failures };
}

/** A small seeded generator, so random tests fail the same way twice. */
export function rng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
