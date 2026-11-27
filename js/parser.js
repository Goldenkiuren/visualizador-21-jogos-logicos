/**
 * parser.js — lexical parser for match histories on the 5×5 board.
 *
 * Two passes over the raw text:
 *   1. Blank out everything that is not a move — comments, `[Tag "value"]`
 *      headers, move numbers, results — replacing each character with a space
 *      so that every offset in the blanked copy still points at the same
 *      character of the original. Headers and move numbers are kept aside.
 *   2. Scan the blanked copy for move-shaped tokens, then re-attach the
 *      comments to the moves they sit next to.
 *
 * Anything unrecognised is ignored rather than treated as an error.
 *
 * Recognised forms — the ones the book uses, chapter by chapter:
 *   c3                            a placement (or, in Rastros, where the piece goes)
 *   b4 c5                         a pair of placements (Seega; `pairs` option)
 *   c3 – b4  c3-b4  c3→b4  c3b4   movement
 *   a1 – c1 – e3 – c5             a path of any length (jumps, Amazonas' throw)
 *   a4 – b4 (x c4)                movement with an explicit capture
 *   b4 (x b2 b3) (x c3 d2)        a placement that captures, clause by clause
 *   e5 – x e3   b3 x b1           a capture that lands on, or is written with, `x`
 *   b3 – b5 (x b4) [Mullah]       capture and promotion (`=Mullah` also works)
 *   b3 – c3 (x a3 ou d3)          a choice left open, as the book prints it
 *   b3 – b4 #                     the move that ends the match
 *   ...                           a move left out of the record
 *   pass / passa                  a turn with no move (a blocked side in Seega)
 *   { … }   ; …   // …            comments ({ } may span several lines)
 */

const LEAD_RE = new RegExp(
  '\\{([^}]*)\\}' +                                             // 1  { comment }
  '|\\{([^}]*)$' +                                              // 2  { unterminated
  '|(?:;|\\/\\/)([^\\n]*)' +                                    // 3  ; or // to end of line
  '|\\[\\s*([A-Za-z\\u00C0-\\u00FF][^\\]"\\u201C\\u201D\\n]*?)\\s*' +   // 4  [Name
  '["\\u201C]([^"\\u201D\\n]*)["\\u201D]\\s*\\]',               // 5        "value"]
  'g'
);
const RESULT_RE  = /(^|\s)(1-0|0-1|1\/2-1\/2|½-½|\*)(?=\s|$)/gm;
const MOVENUM_RE = /(^|[\s(])(\d+)(\.+)(?!\d)/g;
const PROMOTION_RE = /^(?:\[[ \t]*([A-Za-zÀ-ÿ][\wÀ-ÿ' -]*?)[ \t]*\]|=[ \t]*([A-Za-zÀ-ÿ][\wÀ-ÿ'-]*))/;
const OMITTED_RE = /^(\.{2,}|…)/;                       // a move left out of the record
const PASS_RE    = /^(passou|passa|pass)(?![A-Za-z0-9_À-ÿ])/i;
const OR_RE      = /^(ou|or)(?![A-Za-z0-9_À-ÿ])|^[/|]/i;

const DASHES = '-–—−‒';              // - – — − ‒
const QUOTES = '"\'“”‘’';

/** Same length, same newlines — only the visible characters disappear. */
const spaces = (m) => m.replace(/[^\n]/g, ' ');

const isBlank = (ch) => ch === ' ' || ch === '\t';
const isWord  = (ch) => ch !== undefined &&
  /[A-Za-z0-9_À-ÖØ-öø-ÿ]/.test(ch);
const isCross = (ch) => ch === 'x' || ch === 'X' || ch === '×';

/** Tag names compare without case, accents, spaces or punctuation. */
export function tagKey(name) {
  return String(name).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Is there a coordinate at `i` that stands on its own? `b12` and `e2x` (as
 * the head of a word) are not; the compact forms `c3b4` and `b3xb1` are.
 */
function coordAt(text, i) {
  const file = text.charCodeAt(i) | 32;
  if (!(file >= 97 && file <= 101)) return false;                 // a–e
  const rank = text.charCodeAt(i + 1);
  if (!(rank >= 49 && rank <= 53)) return false;                  // 1–5
  const next = text[i + 2];
  if (!isWord(next)) return true;
  if (next >= '0' && next <= '9') return false;
  if (coordAt(text, i + 2)) return true;
  if (next === 'x' || next === 'X') {
    let j = i + 3;
    while (isBlank(text[j])) j++;
    return coordAt(text, j);
  }
  return false;
}

const coord = (text, i) => text.slice(i, i + 2).toLowerCase();

/**
 * A move separator at `i`: a dash or arrow, the capture sign, or both
 * (`e5 – x e3`). Returns where the next coordinate starts, or null.
 */
function readSeparator(text, i) {
  let j = i;
  while (isBlank(text[j])) j++;

  let dash = false;
  const start = j;
  while (text[j] !== undefined && DASHES.indexOf(text[j]) !== -1) j++;
  if (j > start) {
    dash = true;
    if (text[j] === '>') j++;                                     // "->"
  } else if (text[j] === '→' || text[j] === '➔' || text[j] === '>' || text[j] === ':') {
    dash = true;
    j++;
  }
  if (dash) while (isBlank(text[j])) j++;

  let takes = false;
  if (isCross(text[j])) {
    let k = j + 1;
    while (isBlank(text[k])) k++;
    if (coordAt(text, k)) { takes = true; j = k; }
  }
  if (!dash && !takes) return null;
  return coordAt(text, j) ? { end: j, takes } : null;
}

/** Does a move, rather than a lone coordinate, continue at `i`? */
const continuesAt = (text, i) => readSeparator(text, i) !== null || coordAt(text, i);

/**
 * Read one capture clause at `pos`: `(x c4)`, `(x b2 b3)`, `(x a3 ou d3)`.
 * Returns `{ squares, alt, end }` or null.
 */
function readCaptures(text, pos) {
  let j = pos;
  if (text[j] !== '(') return null;
  j++;
  while (isBlank(text[j])) j++;
  if (!isCross(text[j])) return null;
  j++;

  const squares = [];
  const alt = [];
  let into = squares;
  for (;;) {
    while (j < text.length && /[\s,]/.test(text[j])) j++;
    if (coordAt(text, j)) {
      into.push(coord(text, j));
      j += 2;
      continue;
    }
    const or = squares.length ? OR_RE.exec(text.slice(j, j + 3)) : null;
    if (or) { into = alt; j += or[0].length; continue; }
    break;
  }
  if (!squares.length) return null;

  while (j < text.length && /\s/.test(text[j])) j++;
  if (text[j] === ')') j++;
  return { squares, alt, end: j };
}

/** Everything that may follow the squares of a move, in any order. */
function readSuffixes(text, i, tok) {
  for (;;) {
    let j = i;
    while (isBlank(text[j]) || (text[j] !== undefined && QUOTES.indexOf(text[j]) !== -1)) j++;

    const caps = readCaptures(text, j);
    if (caps) {
      tok.captures.push(...caps.squares);
      tok.captureGroups.push(caps.squares);
      if (caps.alt.length) tok.captureAlt = (tok.captureAlt || []).concat(caps.alt);
      i = caps.end;
      continue;
    }
    if (!tok.promotion) {
      const promo = PROMOTION_RE.exec(text.slice(j, j + 40));
      if (promo) {
        tok.promotion = (promo[1] || promo[2]).trim();
        i = j + promo[0].length;
        continue;
      }
    }
    if (!tok.mark && (text[j] === '#' || text[j] === '+')) {
      tok.mark = text[j];
      i = j + 1;
      continue;
    }
    return i;
  }
}

function blank(kind, start, end, text) {
  return {
    kind, omitted: kind === 'omitted', path: [], from: null, to: null,
    captures: [], captureGroups: [], captureAlt: null, takes: false,
    promotion: null, mark: null, comment: null, number: null,
    start, end, text
  };
}

/** Pass 1: strip comments and headers, keeping what they said. */
function strip(raw) {
  const comments = [];
  const tags = [];
  const text = raw.replace(LEAD_RE, (m, braced, open, trailing, name, value, offset) => {
    if (name !== undefined) {
      tags.push({ name: name.trim(), key: tagKey(name), value: value.trim(), index: offset });
    } else {
      const body = (braced !== undefined ? braced : open !== undefined ? open : trailing).trim();
      if (body) comments.push({ index: offset, text: body.replace(/\s+/g, ' ') });
    }
    return spaces(m);
  });
  return { text, comments, tags };
}

/** Just the `[Tag "value"]` headers — enough to tell which game a record is. */
export function readTags(input) {
  return strip(String(input == null ? '' : input)).tags;
}

/**
 * Parse a whole match history.
 * @param {string} input
 * @param {{pairs?: boolean}} [options]  `pairs`: two lone coordinates in a
 *        row are one turn (Seega's placement, "b4 c5").
 * @returns {{moves: Array, tags: Array, warnings: string[]}}
 */
export function parse(input, options) {
  const raw = String(input == null ? '' : input);
  const pairs = !!(options && options.pairs);
  const warnings = [];

  // ---- pass 1: strip -------------------------------------------------------
  const stripped = strip(raw);
  const { comments, tags } = stripped;
  const numbers = [];
  const text = stripped.text
    .replace(RESULT_RE, spaces)
    .replace(MOVENUM_RE, (m, lead, n, dots, offset) => {
      numbers.push({ index: offset + lead.length, n: Number(n) });
      return spaces(m);
    });

  // ---- pass 2: scan for moves ---------------------------------------------
  const moves = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // `...` stands for a move the record leaves out; it still consumes a turn.
    if (ch === '.' || ch === '…') {
      const omitted = OMITTED_RE.exec(text.slice(i, i + 12));
      if (omitted && !/\d/.test(text[i - 1] || '')) {
        moves.push(blank('omitted', i, i + omitted[0].length, '…'));
        i += omitted[0].length;
        continue;
      }
    }

    if (isWord(text[i - 1])) { i++; continue; }           // glued to a word: "club3"

    if (ch === 'p' || ch === 'P') {
      const pass = PASS_RE.exec(text.slice(i, i + 8));
      if (pass) {
        moves.push(blank('pass', i, i + pass[0].length, raw.slice(i, i + pass[0].length)));
        i += pass[0].length;
        continue;
      }
    }

    if (!coordAt(text, i)) { i++; continue; }

    const tok = blank('place', i, i, '');
    tok.path.push(coord(text, i));
    i += 2;

    // Follow the whole path: `e3 – e5 – c3`, `a1 – c1 – e3 – c5`, or `c3b4`.
    for (;;) {
      const sep = readSeparator(text, i);
      if (sep) {
        i = sep.end;
        if (sep.takes) tok.takes = true;
      } else if (!coordAt(text, i)) {
        break;                                            // no further leg
      }
      tok.path.push(coord(text, i));
      i += 2;
    }

    if (tok.path.length > 1) {
      tok.kind = 'move';
    } else if (pairs) {
      // Seega: "b4 c5" is one turn — unless the second square starts a move.
      let j = i;
      while (text[j] !== undefined && ' \t,+&'.indexOf(text[j]) !== -1) j++;
      if (j > i && coordAt(text, j) && !continuesAt(text, j + 2)) {
        tok.path.push(coord(text, j));
        i = j + 2;
      }
    }

    i = readSuffixes(text, i, tok);

    tok.from = tok.path[0];
    tok.to = tok.kind === 'move' ? tok.path[tok.path.length - 1] : null;
    tok.end = i;
    tok.text = raw.slice(tok.start, i).trim().replace(/\s+/g, ' ');
    moves.push(tok);
  }

  // ---- attach comments -----------------------------------------------------
  // A comment preceded on its own line by a move belongs to that move;
  // otherwise it introduces the move that follows it.
  for (const c of comments) {
    const lineStart = raw.lastIndexOf('\n', c.index - 1) + 1;
    let target = null;
    for (const mv of moves) {
      if (mv.start >= lineStart && mv.start < c.index) target = mv;
      else if (mv.start >= c.index) break;
    }
    if (!target) target = moves.find((mv) => mv.start > c.index) || moves[moves.length - 1] || null;
    if (target) target.comment = target.comment ? target.comment + ' ' + c.text : c.text;
    else warnings.push('Comment found but no moves were parsed.');
  }

  // ---- bookkeeping ---------------------------------------------------------
  // A written move number belongs to the first move after it, so a fragment
  // that starts at "11." keeps its numbering in the move list.
  let line = 1, cursor = 0, n = 0, prevEnd = -1;
  moves.forEach((mv, idx) => {
    while (cursor < mv.start) { if (raw[cursor] === '\n') line++; cursor++; }
    mv.line = line;
    mv.ply = idx;
    while (n < numbers.length && numbers[n].index < mv.start) {
      if (numbers[n].index >= prevEnd) mv.number = numbers[n].n;
      n++;
    }
    prevEnd = mv.end;
  });

  if (!moves.length && raw.trim()) warnings.push('No valid move tokens were found in the text.');
  return { moves, tags, warnings };
}
