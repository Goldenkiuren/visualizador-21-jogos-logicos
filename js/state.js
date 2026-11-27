/**
 * state.js — the state machine: turns a parsed record into a timeline.
 *
 * The 21 games live in js/games/, one module per chapter of "Divirta-se com
 * 21 Jogos Lógicos no Mesmo Tabuleiro" (vol. 2). This file knows nothing
 * about any one of them. It
 *   · keeps the registry of games and their variants,
 *   · reads the `[Tag "value"]` headers that set up a position,
 *   · replays the moves, keeping one full state per ply.
 *
 * The timeline stores a *full state per ply*, so seeking anywhere — forward,
 * backward or random — is a single array lookup (O(1)) instead of a replay.
 * A state is 25 bytes of board plus a handful of numbers, so even a 500-move
 * game costs a few tens of kilobytes.
 *
 * This is a viewer, not a referee: a move that breaks a rule is still played
 * out as written, and the rule it broke is attached to the ply as a note.
 */

import { toIndex, toSquare, CELLS } from './coords.js';
import {
  EMPTY, WHITE, BLACK, WHITE_KING, BLACK_KING, BLOCK,
  ownerOf, isKing, kingOf, other, count, counts, advance, newFx,
  signature, formatMove, chips, wins, has
} from './rules.js';
import { tagKey } from './parser.js';
import { GAMES } from './games/index.js';
import { startingPosition } from './games/alquerque.js';

export { EMPTY, WHITE, BLACK, WHITE_KING, BLACK_KING, BLOCK, ownerOf, isKing, counts, GAMES, startingPosition };

/* --------------------------------------------------------------- registry */

const BY_ID = new Map();                 // variant id -> { game, rules }
for (const game of GAMES) for (const rules of game.variants) BY_ID.set(rules.id, { game, rules });

/** What the page opens with — the game the viewer started out as. */
export const DEFAULT_VARIANT = 'alquerque';

/** Every entry of the Game selector, in the order of the book. */
export const VARIANTS = [].concat(...GAMES.map((game) =>
  game.variants.map((rules) => ({ id: rules.id, label: rules.label, chapter: game.chapter, game: game.id }))));

export function findVariant(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_VARIANT);
}

export const hasVariant = (id) => BY_ID.has(id);

/** Other names a record may use for a game. */
const ALIASES = {
  jogodavelha: 'velha4', velha: 'velha4', velha4: 'velha4',
  kono5: 'fivefield', opatkono: 'fivefield',
  qhirkat: 'alquerque', qireq: 'fetaix', alquerquecompromocao: 'promocao',
  achi: 'tsoro2', tsoroyematatu1: 'tsoro1', tsoroyematatu2: 'tsoro2', tsoroyematatu3: 'tsoro3',
  lasamazonas: 'amazonas', amazons: 'amazonas',
  catchthehare: 'coiote', yote: 'yote',
  pente: 'quadra', quina: 'quadra',
  derrah: 'dara', doki: 'dara',
  minifanorona: 'fanorona',
  kono4: 'kono4', fourfieldkono: 'kono4',
  tigresevacas: 'tigres', szkwa: 'szkwa'
};

/** The variant a `[Jogo "…"]` value names, or null. */
export function variantFromName(value) {
  const tries = [tagKey(value)];
  if (tries[0].indexOf('jogo') === 0) tries.push(tries[0].slice(4));      // "Jogo Seega"
  for (const key of tries) {
    if (!key) continue;
    if (BY_ID.has(key)) return key;
    if (ALIASES[key]) return ALIASES[key];
    for (const game of GAMES) {
      for (const rules of game.variants) if (tagKey(rules.label) === key) return rules.id;
    }
    for (const game of GAMES) {
      if (tagKey(game.name) === key || game.id === key) return game.variants[0].id;
    }
    // "Tsoro Yematatu — 2º jogo" is enough to name "… 2º jogo: posições vizinhas".
    const starts = VARIANTS.filter((v) => tagKey(v.label).indexOf(key) === 0);
    if (starts.length === 1) return starts[0].id;
  }
  return null;
}

const GAME_KEYS = ['jogo', 'game', 'regras', 'rules', 'variante', 'variant'];

/** The variant named by the record's own headers, or null. */
export function variantFromTags(tags) {
  for (const tag of tags || []) {
    if (GAME_KEYS.indexOf(tag.key) === -1) continue;
    const id = variantFromName(tag.value);
    if (id) return id;
  }
  return null;
}

/* ------------------------------------------------------- position headers */

const COLOUR_KEYS = {
  brancas: WHITE, branca: WHITE, white: WHITE, whites: WHITE,
  pretas: BLACK, preta: BLACK, black: BLACK, blacks: BLACK
};
const BLOCK_KEYS = ['bloqueios', 'bloqueio', 'blocks', 'block', 'bloqueadas'];
const PIECE_KEYS = ['peca', 'piece'];
const KING_KEYS  = ['mullah', 'mullahs', 'damas', 'dama', 'kings', 'king'];
const TURN_KEYS  = ['vez', 'turn', 'tomove', 'joga', 'jogam'];
const HAND_KEYS  = ['reserva', 'mao', 'hand', 'reserve', 'foradotabuleiro'];
const LOST_KEYS  = ['capturadas', 'capturados', 'captured', 'perdidas', 'lost'];

/** Which colour a word names in this game — "pretas", "tigres", "hens"… — or 0. */
function colourNamed(key, game) {
  if (COLOUR_KEYS[key]) return COLOUR_KEYS[key];
  if (game.sharedPiece) return 0;
  for (const p of [WHITE, BLACK]) {
    for (const name of [game.roles[p].pt, game.roles[p].en]) {
      const k = tagKey(name);
      if (key === k || key + 's' === k || key === k + 's') return p;
    }
  }
  return 0;
}

function sideNamed(value, game, first) {
  const key = tagKey(value);
  const colour = colourNamed(key, game);
  if (colour) return colour;
  if (['w', 'b'].indexOf(key) !== -1) return key === 'w' ? WHITE : BLACK;
  if (['1', 'jogador1', 'player1', 'primeiro', 'first'].indexOf(key) !== -1) return first;
  if (['2', 'jogador2', 'player2', 'segundo', 'second'].indexOf(key) !== -1) return other(first);
  return 0;
}

/** "a1 b2 a5=M" -> [{ index, king }], complaining about anything else. */
function readSquares(tag, notes) {
  const out = [];
  const rest = tag.value.replace(/([a-e][1-5])(\s*=\s*M(?:ullah)?|\*)?(?![A-Za-z0-9])/gi, (m, square, king) => {
    out.push({ index: toIndex(square.toLowerCase()), king: !!king });
    return ' ';
  }).replace(/[\s,;.]+|\b(e|and)\b/gi, '');
  if (rest) notes.push(`could not read “${rest}” in [${tag.name} "…"]`);
  return out;
}

/** "8 7" or "brancas 8, pretas 7" -> [·, white, black]. */
function readPair(tag, game, notes) {
  const out = [0, null, null];
  let named = 0;
  for (const word of tag.value.match(/[A-Za-zÀ-ÿ]+|\d+/g) || []) {
    if (/^\d+$/.test(word)) {
      const p = named || (out[WHITE] === null ? WHITE : BLACK);
      out[p] = Number(word);
      named = 0;
    } else {
      named = colourNamed(tagKey(word), game);
    }
  }
  if (out[WHITE] === null && out[BLACK] === null) {
    notes.push(`could not read two numbers in [${tag.name} "${tag.value}"]`);
    return null;
  }
  return [0, out[WHITE] || 0, out[BLACK] || 0];
}

/**
 * Read the headers that describe where a record starts.
 *
 *   [Brancas "a1 b2"]  [Pretas "d4 e5"]   the pieces — or the game's own
 *                                         names for them: [Tigres "…"]
 *   [Bloqueios "d5 b3 c2"]                block pieces
 *   [Peça "c3"]                           Rastros' single piece
 *   [Mullah "a5"]  or  a5=M  inside a list   promoted pieces
 *   [Vez "pretas"]                        who is to move
 *   [Reserva "8 8"]                       pieces still off the board
 *   [Capturadas "2 0"]                    pieces already captured, by colour
 *
 * Any header that places a piece makes the position custom: the board starts
 * empty and holds exactly what the headers list.
 */
export function readSetup(tags, game, rules) {
  const notes = [];
  const first = rules.first || game.first;
  let board = null;
  let turn = null, hand = null, lost = null;
  const kings = [];

  const put = (index, code) => {
    if (board[index] !== EMPTY) notes.push(`${toSquare(index)} is listed more than once in the position headers`);
    board[index] = code;
  };

  for (const tag of tags || []) {
    const key = tag.key;
    const colour = colourNamed(key, game);
    const piece = PIECE_KEYS.indexOf(key) !== -1;
    const block = BLOCK_KEYS.indexOf(key) !== -1;

    if (colour || piece || block) {
      if (!board) board = new Uint8Array(CELLS);
      for (const s of readSquares(tag, notes)) {
        put(s.index, block ? BLOCK : piece ? WHITE : s.king ? kingOf(colour) : colour);
      }
    } else if (KING_KEYS.indexOf(key) !== -1) {
      kings.push(...readSquares(tag, notes).map((s) => s.index));
    } else if (TURN_KEYS.indexOf(key) !== -1) {
      turn = sideNamed(tag.value, game, first) || null;
      if (!turn) notes.push(`[${tag.name} "${tag.value}"] does not name a side`);
    } else if (HAND_KEYS.indexOf(key) !== -1) {
      hand = readPair(tag, game, notes);
    } else if (LOST_KEYS.indexOf(key) !== -1) {
      lost = readPair(tag, game, notes);
    }
  }

  for (const index of kings) {
    const owner = board ? ownerOf(board[index]) : 0;
    if (owner) board[index] = kingOf(owner);
    else notes.push(`[Mullah] names ${toSquare(index)}, but no piece is listed there`);
  }

  return { board, turn, hand, lost, notes };
}

/* ------------------------------------------------------------- vocabulary */

export const roleOf = (game, player) => game.roles[player];

/** "White wins — 4 in a row on a5 b4 c3 d2" / "Draw — the board is full". */
export function resultText(game, over) {
  return (over.winner ? wins(game.roles[over.winner]) : 'Draw') + ' — ' + over.reason;
}

/** One line on where the match stands. */
export function statusText(game, state) {
  if (state.over) return 'Match over · ' + resultText(game, state.over);
  const phase = game.phaseLabel ? game.phaseLabel(state)
    : game.phases ? (state.phase === 'place' ? 'Placement' : 'Movement') : '';
  return (phase ? phase + ' · ' : '') + game.roles[state.turn].en + ' to move';
}

/** The figures of the scoreline: a main value and small chips per side. */
export function scoreline(game, state) {
  const main = game.tally ? game.tally(state)
    : [null, String(count(state.board, WHITE)), String(count(state.board, BLACK))];
  return { main, chips: game.stats ? game.stats(state) : chips(state) };
}

/** A move in the notation its game uses. */
export function notate(game, mv) {
  return game.format ? game.format(mv) : formatMove(mv);
}

/**
 * The moves open to the side to move. With `strict`, moves that dodge a
 * mandatory capture are left out — unless nothing else exists.
 */
export function legalMoves(game, rules, state, strict) {
  const all = game.legalMoves(state, rules);
  if (!strict) return all;
  const kept = all.filter((m) => !m.quiet);
  return kept.length ? kept : all;
}

/* --------------------------------------------------------------- timeline */

/**
 * Apply every move in order and keep a state after each one.
 *
 * @param {{moves: Array, tags: Array}} parsed  what parser.js returned
 * @param {string} variantId                    an id from VARIANTS
 * @returns {{game, rules, first, states: Array, plies: Array, warnings: string[], setupNotes: string[]}}
 */
export function buildTimeline(parsed, variantId) {
  const { game, rules } = findVariant(variantId);
  const first = rules.first || game.first;

  const setup = readSetup(parsed.tags, game, rules);
  const start = game.initial(rules, setup);
  const setupNotes = setup.notes.concat(game.check ? game.check(start) : []);

  const states = [start];
  const plies = [];
  const warnings = setupNotes.map((t) => `Starting position: ${t}`);

  // Rows and columns of the written record: the side that starts sits in the
  // first column, and a row is a pair of turns (or less, when one is skipped).
  let row = 0, lastCol = 1;

  (parsed.moves || []).forEach((tok, n) => {
    const prev = states[n];
    const notes = [];
    const infos = [];
    const note = (t) => { if (t && notes.indexOf(t) === -1) notes.push(t); };
    const info = (t) => { if (t && infos.indexOf(t) === -1) infos.push(t); };
    const blankTurn = tok.kind === 'omitted' || tok.kind === 'pass';

    let mover = prev.turn;
    let fx = newFx();
    let next;

    if (prev.over) note(`the match was already over — ${resultText(game, prev.over)}`);

    if (blankTurn && prev.skip) {
      // The rules gave this turn to nobody; the token is the skipped side's blank.
      mover = prev.skip;
      next = advance(prev);
      next.ply = prev.ply;
      info(`${has(game.roles[mover])} no move this turn`);
    } else if (blankTurn) {
      // A move the record leaves out: it consumes a turn and changes nothing.
      next = advance(prev);
      next.turn = other(prev.turn);
      if (tok.kind === 'pass') note('a turn cannot be passed here');
    } else {
      const mv = {
        kind: tok.kind,
        path: tok.path.map(toIndex),
        caps: tok.captures.map(toIndex),
        capAlt: tok.captureAlt ? tok.captureAlt.map(toIndex) : null,
        takes: tok.takes,
        promotion: tok.promotion,
        mark: tok.mark,
        text: tok.text
      };
      if (mv.promotion && !game.promotes) note(`${game.name} has no promotion`);

      const res = game.play(prev, mv, rules, note, info);
      next = res.next;
      fx = res.fx;

      // The safety net. `play` explains what it can; whatever slips through
      // silently is still measured against the strict list of legal moves.
      if (!notes.length) {
        const wanted = signature(res.eff);
        const hit = game.legalMoves(prev, rules).find((m) => signature(m) === wanted);
        if (!hit) note('this move is not allowed by the rules of the game');
        else if (hit.quiet) info(hit.quiet);
      }

      if (tok.mark === '#' && !prev.over) {
        const role = game.roles[mover];
        if (!next.over) note(`# is written, but ${has(role)} not won here by the rules`);
        else if (next.over.winner === 0) note('# is written, but this move ends the match in a draw');
        else if (next.over.winner !== mover) note(`# is written, but this move gives the match to ${game.roles[next.over.winner].en}`);
      }

      if (!next.over && !game.legalMoves(next, rules).length) {
        info(`${has(game.roles[next.turn])} no legal move now — the book does not say what happens in that case`);
      }
    }

    const col = mover === first ? 0 : 1;
    const before = plies[plies.length - 1];
    if (tok.number != null) row = tok.number;           // the record's own numbering wins
    else if (col <= lastCol) row++;
    lastCol = col;

    plies.push({
      index: n,
      kind: tok.kind,
      omitted: blankTurn,
      text: tok.text,
      mark: tok.mark,
      comment: tok.comment,
      line: tok.line,
      start: tok.start,
      end: tok.end,
      player: mover,
      turn: row,
      col,
      opensRow: !(before && before.turn === row && before.col < col),
      notes,
      infos,
      fx,
      result: !prev.over && next.over ? next.over : null
    });
    notes.forEach((t) => warnings.push(`Move ${n + 1} (${tok.text}): ${t}`));
    states.push(next);
  });

  return { game, rules, first, states, plies, warnings, setupNotes };
}
