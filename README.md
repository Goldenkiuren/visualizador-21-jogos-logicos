# 21 Jogos — Match Viewer

*[Leia em português](README.pt-BR.md)*

Made by **Augusto Mattei Grohmann** · 25 November 2026 · built with Gemini and
Claude.

A dependency-free viewer for written matches of **all 21 games** of
*Divirta-se com 21 Jogos Lógicos no Mesmo Tabuleiro* (vol. 2), Renato Perez
Ribas — every one of them played on the Alquerque board.

Paste a match, step through it move by move, watch the pieces slide, jump,
enter and leave, read the commentary attached to each turn. Or tick **Play on
the board** and play a match with the mouse, the record writing itself as you
go. HTML5 + CSS3 + vanilla ES6 modules; no framework, no build step, no
backend.

## Running

ES modules are blocked over `file://`, so serve the folder from a terminal
opened in it, then open <http://localhost:8000>. Any one of these works:

| You have | Windows | macOS / Linux |
| --- | --- | --- |
| Node.js | `npm start` | `npm start` |
| Python 3 | `python -m http.server 8000` (or `py -m http.server 8000`) | `python3 -m http.server 8000` |

`npm start` runs `tools/serve.mjs`, a small server with no dependencies; it
takes another port as `npm start -- 8080`. On Windows, `python3` usually opens
the Microsoft Store instead of Python, which is why the command there is
`python` or `py`. Press `Ctrl+C` in the terminal to stop the server.

`http://localhost:8000/#seega` opens a game directly (any id from the table
below). The page remembers the game, the record and the speed between visits.

## The games

The **Game** selector lists them in the order of the book, which is the order
of growing complexity. Games the book plays in several ways have one entry per
way — 29 in all. Each entry is numbered by its chapter in the book
(`Ch. 2` … `Ch. 22`); chapter 1 introduces the board.

| Ch. | Game | Kind | Selector ids | How it is won |
| --- | --- | --- | --- | --- |
| 2 | Jogo-da-Velha 4 | posicionamento | `velha4` | four in a row on a drawn line |
| 3 | Five Field Kono | deslocamento | `fivefield` | the opponent's starting side filled; or the opponent blocked |
| 4 | Rastros | bloqueio | `rastros` | the shared piece reaches your destination; or the opponent cannot move it |
| 5 | Alquerque (Fetaix) | captura | `alquerque` `promocao` `fetaix` | every enemy piece captured |
| 6 | Raposa e Cachorros | caça | `raposa` `raposa-fox` | dogs trap the fox; fox reaches rank 1 |
| 7 | Tonkin | alinhamento | `tonkin` | a whole line of the board filled |
| 8 | Tsoro Yematatu | alinhamento | `tsoro1` `tsoro2` `tsoro3` | all four pieces in a row |
| 9 | Pah Tum | posicionamento | `pahtum` `pahtum-original` | most points for rows of 3, 4, 5 |
| 10 | Tic Tackle | alinhamento | `tictackle` | four in a row — drawn line or not |
| 11 | Amazonas | bloqueio | `amazonas` `amazonas-livre` `amazonas-1` | the opponent cannot move |
| 12 | Coiote e Galinhas | caça | `coiote` | coyote eats 6 hens; hens trap the coyote |
| 13 | Yoté | captura | `yote` | every enemy piece captured |
| 14 | Halma | deslocamento | `halma` | the opponent's starting corner filled |
| 15 | Quadra | posicionamento | `quadra` | four in a row, or two pairs captured |
| 16 | Seega | captura | `seega` | the opponent left with one piece |
| 17 | Bagh Chal | caça | `baghchal` | tigers eat 5 goats; goats trap all tigers |
| 18 | Dara | alinhamento | `dara` | the opponent left with two pieces |
| 19 | Fanorona | captura | `fanorona` | every enemy piece captured |
| 20 | Four Field Kono | captura | `kono4` | the opponent left with one piece |
| 21 | Tigres e Vacas | caça | `tigres` | tigers eat 6 cows; cows block both tigers |
| 22 | Sz’kwa | posicionamento | `szkwa` | most pieces captured |

Each game brings the same things the viewer always had for Alquerque: its
starting position, its rules (shown under **Rules** on the page), its notation,
a status line and scoreline of its own, flags for every rule a record breaks,
and examples — a commented demo match plus the book's own figures and records,
under **Example**. The demos are complete matches except for the three stages
of Alquerque, which are openings: as the book observes, a well-played
Alquerque grinds into an endgame that both sides usually agree to draw.

## Using it

**Load.** Paste a record and press *Load match*. A `[Jogo "Seega"]` header
selects the game by itself. Changing the selector replays whatever is in the
box under the new rules — which is how the three stages of Alquerque, or the
three games of Tsoro Yematatu, can be compared on one record. (An untouched
example makes way for an example of the newly selected game.)

**Step.** First / Prev / Play-Pause / Next / Last, a timeline scrubber, a speed
slider (2.0 s → 0.2 s per ply) and a clickable move list. Keyboard: `←` `→`
`Home` `End` `Space`; `↑` `↓` when the move list has the focus. *Play* at the
end of a record starts it over.

Each move in the list carries badges — ⚠ a broken rule, ℹ a note, 💬 a
comment, ■ the result — that show their text on hover. On the board, the last
move is marked: where the piece came from and went, pieces that entered, and
pieces that were taken.

**Read.** The scoreline names the two sides the way the chapter does (Tigres /
Cabras, Raposa / Cachorros…), underlines the side to move and shows what
matters in that game: pieces in hand, captures against the number needed,
points, how much of the far side is filled. Under the board is the state of the
match: whose turn, which phase, and the result with its reason. The row that
won, the rows that scored and the side that was filled are drawn on the board.

**Play.** Tick *Play on the board*. The pieces that can move are ringed; click
one, then where it goes. Free positions carry a dot, pieces that can be taken a
red ring. A chain of jumps is clicked landing by landing (click the last one
again to stop early); a pair of placements in Seega is two clicks; in Amazonas
the third click is where the block lands; when a capture leaves a choice — the
extra piece in Yoté, the victim in Dara, approach or withdrawal in Fanorona —
one more click picks it. A hint line under the board says what the next click
is for ("Tigres: click where it goes — or click the piece again to stop
here"). `Esc` cancels a move half made. Only legal moves can be clicked. Each
move is written at the end of the record in the book's notation, `#` included.
*Undo move* removes the last move of the record; *New match* empties it, heads
it with the game's `[Jogo "…"]` and ticks *Play on the board* by itself.

## Notation

Common to every game:

| Form | Meaning |
| --- | --- |
| `c3` | a piece placed on c3 |
| `c3 – b4`, `c3-b4`, `c3→b4`, `c3b4` | movement |
| `a1 – c1 – e3 – c5` | a path of any length |
| `a4 – b4 (x c4)` | movement with a capture |
| `b3 x b1` | movement written with the capture symbol |
| `b3 – b4 #` | the move that ends the match |
| `...` | a move the record leaves out (still consumes a turn) |
| `{ … }`, `; …`, `// …` | comments (braces may span lines) |

Move numbers (`1.`, `12...`), results and any other stray text are ignored.
A record that starts at `11.` keeps its numbering in the move list.

What each chapter adds:

| Game | Form | Meaning |
| --- | --- | --- |
| Rastros | `c3` or `e1 – e2` | where the piece goes — the origin is optional |
| Alquerque | `e3 – e5 – c3 (x e4 d4)` | multi-capture — write the whole path |
| Fetaix | `b3 – b5 (x b4) [Mullah]` | promotion (`=Mullah` also works) |
| Amazonas | `c1 – a1 – d4` | the piece goes c1 → a1, then throws a block a1 → d4 |
| Yoté | `b4 – d2 (x c3 c1)` | c3 is jumped, c1 is the extra piece removed |
| Quadra | `b4 (x b2 b3) (x c3 d2)` | a placement that captures two pairs |
| Seega | `b4 c5` | a pair of pieces placed in one turn |
| Seega | `pass` | the turn of a player who cannot move (`...` works too) |
| Fanorona | `b3 – c3 (x a3)` | the list says which capture was chosen |
| Four Field Kono, Tigres e Vacas | `e5 – x e3` | a capture that lands on its victim |
| Sz’kwa | `c2 (x c3 c4 d4 e5)` | a placement that captures a group |

**Capture lists are optional wherever the rules decide the capture** — jumps,
custody, enclosure, bracketed pairs: `e3 – e5 – c3` alone plays correctly.
When a list is written and disagrees with the board, the move is flagged and
the pieces the rules capture are the ones removed. Where the capture is the
player's choice (the three cases above) the list decides, and a missing one is
flagged.

### Starting from any position

Headers set up a diagram instead of the opening position:

```
[Jogo "Bagh Chal"]
[Tigres "c5 e5 d4 a2"]
[Cabras "a5 b5 a4 e4 b3 c3 b2 c2 d2 b1"]
[Vez "tigres"]

1... e5 - e3 - c1 - a1 (x e4 d2 b1)
```

| Header | Meaning |
| --- | --- |
| `[Jogo "…"]` (or `Game`, `Regras`, `Rules`) | the game — a name or an id from the table above |
| `[Brancas "a1 b2"]` `[Pretas "d4 e5"]` | the pieces; `White` / `Black` and each game's own names work too (`Tigres`, `Cabras`, `Raposa`, `Coiote`, `Vacas`…) |
| `[Bloqueios "d5 b3 c2"]` | block pieces (Pah Tum, Amazonas, Rastros) |
| `[Peça "c3"]` | the single piece of Rastros |
| `a5=M` inside a list, or `[Mullah "a5"]` | promoted pieces |
| `[Vez "pretas"]` | who is to move — a colour, a role, or `1` / `2` |
| `[Reserva "8 7"]` | pieces still off the board, white then black |
| `[Capturadas "2 0"]` | pieces already captured, by colour of the piece |

Any header that places a piece makes the position custom: the board then holds
exactly what the headers list. Pieces in hand and captures are worked out from
what is on the board unless stated. Other headers (`[Jogador 1 "brancas"]`)
are ignored.

## Viewer, not referee

A move that breaks a rule is still played out as written and flagged with ⚠ in
the move list and the commentary — a mistyped history plays through instead of
dying. Each game flags its own rules: no piece on the origin, an occupied
destination, a step off the drawn lines, a move of more than one position, a
dog retreating, a goat moving too early, a row of three while placing in Dara,
the centre during placement in Tonkin and Seega, a jump over nothing, a block
thrown over a piece, a capture list that disagrees with the board, a `#` on a
move that does not win, a move after the match is over… Whatever a game's own
checks let through is still compared with the strict list of legal moves, so no
illegal move passes unmarked.

Two things are only *mentioned* (ℹ), never flagged:

- **A mandatory capture that was not made** (Alquerque, Fetaix, Fanorona, Four
  Field Kono). The book lets the opponent waive it — "se um dos jogadores não
  viu uma possibilidade de captura e o outro jogador não quer avisá-lo ele está
  no seu direito, e o jogo continua" — so such a record is legal. The note
  names the capture that was available.
- **A side left without a move where the book does not say what happens.**

## Rules, as implemented

The page shows each game's rules. These are the points where the book needed
reading closely, or says nothing:

- **Lines.** Everything follows the drawn lines; diagonals exist only on the
  nodes where column + row is even. The one exception is the winning row of
  Tic Tackle, which counts on any diagonal ("mesmo onde não há linha").
- **Five Field Kono, Halma.** A side "filled" counts pieces of either colour,
  and is judged only once each player has moved (p. 120) — both sides start
  full. Refilling your own side hands the match to the opponent.
- **Rastros.** Player 1 heads for e5, player 2 for a1, as the text says (the
  figure numbers the corners the other way round, and the board shows them as
  the figure does). A piece moved onto the *opponent's* destination wins for
  the opponent, as in the original game; the book is silent.
- **Alquerque.** Jumped pieces leave when the move ends, so they block and
  cannot be jumped twice. A Mullah moves any distance and captures any distance
  before and after its victim (figure 5.5). Promotion needs the move to *end*
  on the far rank.
- **Raposa e Cachorros.** "Os adversários podem combinar quem realiza o
  primeiro movimento" — hence two entries. The dogs start in the book's match.
- **Tsoro Yematatu.** The four pieces must stand side by side on a drawn line,
  as in Jogo-da-Velha 4.
- **Pah Tum.** Each unbroken row counts once, for its whole length (a row of 4
  is not also two rows of 3) — this is what makes figure 9.2 come to 14 and 6.
  The blocks are those of figure 9.1 unless `[Bloqueios]` says otherwise.
- **Amazonas.** The block may land on the position the piece has just left
  (`a3 – b3 – a3` in the book's record).
- **Coiote e Galinhas, Bagh Chal.** Multiple jumps are allowed, as the book
  says, with the Alquerque convention for the pieces jumped. Capturing is
  optional. "Trapped" means no step *and* no jump.
- **Yoté.** Captured pieces do not return to the hand. With no enemy piece
  left to take as the extra one, the capture stands as it is.
- **Quadra.** Only the placed piece captures; a pair placed between two enemy
  pieces is safe, as in Seega. A full board with no winner is a draw.
- **Seega.** The player of the last pair moves first; a blocked player is
  skipped. No capture happens while placing.
- **Dara.** A row counts when the piece that moved is part of it, and must be
  exactly three. If a player cannot place without making a row, that player
  starts moving and everything still in hand is discarded.
- **Fanorona.** One step per turn — the book describes no chains. A row is
  taken as far as it is unbroken.
- **Sz’kwa.** A placement captures the enemy groups it leaves without a free
  neighbour. A group its own player sealed is never examined again, so it is
  safe for good (figure 22.4). The match ends when the board is full or the
  player to move has no piece left.

### Misprints in the book

Found by replaying every figure and record; `tests/book.test.js` pins each one
down, and the examples include both the corrected and the printed versions.

| Where | Printed | What the figure and the rules give |
| --- | --- | --- |
| p. 132, figure 5.6, case 2 | `b3 – b5 (x b2)` | the piece jumped is b4 |
| p. 132, figure 5.6, case 3 | `e3 – e5 – c3 (x e4 d3)` | the pieces jumped are e4 and d4 |
| p. 140, Tonkin, move 4 | `c3` for black | c2 — the centre is forbidden while placing, and black later plays `c2 – c3` |
| p. 140, Tonkin, move 6 | `d5 – d4` | d5 – c5: d4 is white's own piece and figure 7.4 has the piece on c5 |
| p. 153, Tic Tackle, move 2 | `e5 – d4` for white | e5 is a black piece (and black plays the same move a turn later) |
| p. 160, figure 12.3 | "coiote bloqueado" | the coyote can still jump c1 or b2: d1 and b3 are free |
| p. 126, figure 4.4 | "movimento realizado pelo jogador 1" | with 14 positions blocked it is the 14th move, which is player 2's |

## Tests

```sh
node tests/run.mjs            # 379 tests, about 3 seconds
node tests/run.mjs book       # only the files whose name matches
node tests/ui.mjs             # the page itself, in headless Chrome
```

or open `http://localhost:8000/tests/` to run the same files in a browser.
Node is used only to run the tests and, optionally, `npm start`; the viewer
itself needs nothing but a static server.

| File | What it checks |
| --- | --- |
| `tests/parser.test.js` | every way a move is written |
| `tests/state.test.js` | the board, the registry of games, position headers, numbering, `#` |
| `tests/book.test.js` | **the book**: every figure that shows a move and every record it prints, chapter by chapter — and its misprints |
| `tests/samples.test.js` | every example of the page replays without a flag |
| `tests/input.test.js` | every legal move of every game can be made by clicking, and nothing else can |
| `tests/fuzz.test.js` | thousands of random matches: a legal match is never flagged, an illegal move never passes, pieces are neither created nor lost |
| `tests/ui.mjs` | in a real browser: each demo loads clean, each game is played with real mouse clicks and undone, keyboard, layout at three widths (skips itself when no Chrome or Chromium is installed) |

Each game is described twice in its module — `legalMoves` lists what the rules
allow, `play` carries out whatever a record says and names the rule it broke —
and the fuzz tests make the two keep each other honest.

## Structure

| File | Role |
| --- | --- |
| `index.html` | markup |
| `css/style.css` | styling |
| `js/coords.js` | square naming and the geometry of the board |
| `js/rules.js` | piece codes, the per-ply state, mechanics several games share |
| `js/games/*.js` | one module per chapter: position, legal moves, play, rules text |
| `js/parser.js` | lexical parser: moves, comments, headers |
| `js/state.js` | registry of games, position headers, the timeline: one full state per ply |
| `js/board.js` | SVG grid + DOM piece overlay, animation, highlights |
| `js/input.js` | playing a move by clicking |
| `js/app.js` | controller and playback |
| `js/sample.js` | the examples |
| `tools/selfplay.mjs` | the small engine that produced the demo matches |
| `tools/serve.mjs` | `npm start`: serves the folder on any system |
| `tests/` | the tests |

Adding a game is one file in `js/games/` and one line in `js/games/index.js`.

## Design notes

**O(1) seeking.** `buildTimeline()` stores a complete state after every ply —
a `Uint8Array(25)` for the board plus a handful of numbers (side to move,
pieces in hand, captures, phase, result). Stepping in either direction,
scrubbing, and clicking a move in the list are all a single array lookup;
nothing is ever replayed.

**The view knows no rules.** Each ply carries a small description of what it
does on screen — pieces that travel (with their path), pieces that appear,
pieces that leave — and the board animates that, forwards or backwards. A
block thrown in Amazonas, a tiger landing on a cow, a pair entering in Seega
are all the same three primitives.

**Cheap rendering.** The board artwork (25 nodes, 5 horizontals, 5 verticals,
2 long and 4 small diagonals, labels) is one SVG built once. Pieces are at most
25 DOM elements, positioned with `transform` only and animated via the Web
Animations API — with a CSS-transition fallback when `Element.animate` is
missing. A multi-capture is animated leg by leg along its real path. No blurs,
shadows or filters. `prefers-reduced-motion` is honoured: moves then change
without animation.

**Board geometry.** Diagonals exist only on nodes where col + row is even, which
generates the two long diagonals and the four small ones from a single rule. A
diagonal step preserves that parity, so a Mullah sliding in one direction never
"turns the corner" where the small diagonals meet at a3/c1/e3/c5.

## Demo matches

Where the book prints a match the demo is that match — complete in chapters 2,
6 and 7 (the last with its two misprints corrected), and played on to the end
in chapters 8, 9 and 11, where the book stops after a few moves. The others
were produced by `tools/selfplay.mjs`, a shallow minimax over each game's own
legal moves (mandatory captures honoured, largest capture first), then
commented by hand and replayed through the viewer to confirm they raise no
flag.

```sh
node tools/selfplay.mjs fanorona --seed 11          # one match, in the book's layout
node tools/selfplay.mjs halma --scan 20             # a summary of twenty
node tools/selfplay.mjs amazonas --from "1. c1 - a1 - d4  e3 - c1 - b2"
```

The two original demos are unchanged. The Alquerque one ends on
`c1 - e3 - e5 - c3 (x d2 e4 d4)`, three pieces in one turn. The Fetaix one
promotes with `b4 - a5 [Mullah]` and then plays `a5 - d2`, four nodes down the
long diagonal.

## Since the Alquerque-only version

The first version covered chapter 5 only: Alquerque in its three stages
(Alquerque, Alquerque + promoção, Fetaix). Everything it did is still here; the *Rules*
selector became *Game*, with the same three ids for the three stages. Along the
way a few things were fixed:

- the board was not square on a wide window (it grew taller than its grid);
- `c3→b4`, the form the book itself introduces on p. 112, was not read;
- the marker of the square a piece moved to was hidden under the piece;
- *Play* was disabled at the end of a record instead of starting over;
- a `#` appeared twice in the move list;
- `prefers-reduced-motion` did not stop the main animations.

One behaviour changed on purpose: a written capture list used to win over the
board. It now only wins where the capture is the player's choice — the book's
own figure 5.6 would otherwise remove the wrong pieces.
