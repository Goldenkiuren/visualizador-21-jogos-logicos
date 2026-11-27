/**
 * serve.mjs — serve the viewer at http://localhost:8000 on Windows, macOS
 * and Linux alike, with nothing but Node.
 *
 *   node tools/serve.mjs          # port 8000
 *   node tools/serve.mjs 8080     # another port (or PORT=8080)
 *
 * The viewer itself needs no Node: any static server works (see README).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../tests/browser.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 8000);

try {
  await serve(root, port);
} catch (err) {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Try another: node tools/serve.mjs 8080`);
    process.exit(1);
  }
  throw err;
}
console.log(`Viewer running at http://localhost:${port}  (Ctrl+C to stop)`);
