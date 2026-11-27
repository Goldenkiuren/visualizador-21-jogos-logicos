/**
 * games/index.js — the 21 games of the book, in the order of its chapters
 * ("uma ordem crescente na sua complexidade", p. 106).
 *
 * Every module describes one chapter:
 *
 *   id, chapter, name, motto, family     what it is
 *   roles      [·, white, black]         what the two sides are called
 *   first      colour that moves first   (a variant may override it)
 *   variants   [{ id, label, …options }] entries of the Game selector
 *   rules      string[]                  the rules, as the book gives them
 *   notation   [[example, meaning]]      how its moves are written
 *
 *   initial(rules, setup)                -> state at ply 0
 *   legalMoves(state, rules)             -> every move the rules allow
 *   play(state, move, rules, note, info) -> { next, fx, eff }
 *
 * and optionally: parse (parser options), format(move), stats(state),
 * tally(state), decor(), check(state), promotes, sharedPiece.
 *
 * `play` never refuses: it carries the move out as written and reports each
 * broken rule through `note`. `legalMoves` is the strict counterpart, and
 * the two are checked against each other on every ply (see state.js).
 */

import velha4 from './velha4.js';
import fivefield from './fivefield.js';
import rastros from './rastros.js';
import alquerque from './alquerque.js';
import raposa from './raposa.js';
import tonkin from './tonkin.js';
import tsoro from './tsoro.js';
import pahtum from './pahtum.js';
import tictackle from './tictackle.js';
import amazonas from './amazonas.js';
import coiote from './coiote.js';
import yote from './yote.js';
import halma from './halma.js';
import quadra from './quadra.js';
import seega from './seega.js';
import baghchal from './baghchal.js';
import dara from './dara.js';
import fanorona from './fanorona.js';
import kono4 from './kono4.js';
import tigres from './tigres.js';
import szkwa from './szkwa.js';

export const GAMES = [
  velha4, fivefield, rastros, alquerque, raposa, tonkin, tsoro, pahtum, tictackle, amazonas,
  coiote, yote, halma, quadra, seega, baghchal, dara, fanorona, kono4, tigres, szkwa
];
