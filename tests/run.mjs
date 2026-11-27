/**
 * run.mjs — run the tests under Node:
 *
 *     node tests/run.mjs            everything
 *     node tests/run.mjs parser     only the files whose name contains "parser"
 *
 * The same files run in a browser at http://localhost:8000/tests/.
 */

import { run } from './harness.js';
import { FILES } from './files.js';

const only = process.argv.slice(2);
const wanted = FILES.filter((f) => !only.length || only.some((word) => f.indexOf(word) !== -1));
if (!wanted.length) {
  console.error('No test file matches ' + only.join(', ') + '. Files: ' + FILES.join(', '));
  process.exit(2);
}

const quiet = process.env.QUIET === '1';
for (const file of wanted) await import('./' + file);

const started = Date.now();
const result = run((line, kind) => {
  if (quiet && kind === 'pass') return;
  console.log(kind === 'fail' ? '\x1b[31m' + line + '\x1b[0m'
    : kind === 'suite' ? '\x1b[1m' + line + '\x1b[0m' : line);
});
console.log(`(${((Date.now() - started) / 1000).toFixed(1)}s)`);
process.exit(result.failed ? 1 : 0);
