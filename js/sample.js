/**
 * sample.js — example records for every entry of the Game selector.
 *
 * Each game has a demo first — a complete match, or the opening of one —
 * followed by the book's own figures and records, set up with position
 * headers so that they can be stepped through.
 *
 * The demos are legal under the rules of their chapter. Where the book gives
 * a match (chapters 2, 6, 7, 8, 9, 11) the demo is that match, played on to
 * the end when the book stops early. The others were produced by the small
 * self-play engine in tools/selfplay.mjs (mandatory captures honoured), then
 * replayed through the viewer: tests/samples.test.js checks that every one
 * of them comes back without a flag — except the few marked `flags`, which
 * reproduce misprints of the book on purpose.
 */

export const SAMPLES = {};

function add(variant, title, text, flags) {
  if (!SAMPLES[variant]) SAMPLES[variant] = [];
  SAMPLES[variant].push({ title, text: text.replace(/^\n/, ''), flags: flags || 0 });
}

/* ================================================================== 2 === */

add('velha4', 'Book, p. 116 — the complete match', `
[Jogo "Jogo-da-Velha 4"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// O registro da página 116, tal como impresso.
1. c3   b2
2. b3   d3 { Figure 2.5 shows the board at this point. }
3. c4   c2
4. d2   d4
5. b4   e1 { White now has b4, c3 and d2 on the long diagonal, with a5 still free. }
6. a5 #
   { a5, b4, c3, d2: four in a row along a drawn line (figure 2.6). }
`);

add('velha4', 'Figure 2.3 — four in a row on a line', `
[Jogo "Jogo-da-Velha 4"]
[Brancas "a4 c4 d4 c2 d1"]
[Pretas "b5 c3 b2 d2 a1 e1"]

1. b4 # { The piece dropped on b4 completes a4, b4, c4, d4. }
`);

add('velha4', 'Figure 2.4 — a diagonal with no line does not count', `
[Jogo "Jogo-da-Velha 4"]
[Brancas "d5 c4 b3 d4 c2"]
[Pretas "b5 b2 a1 e1"]

1. a2
   { a2, b3, c4, d5 look like four in a row, but the board has no line
     there: "não é um alinhamento válido". The match simply goes on. }
   e5
`);

/* ================================================================== 3 === */

add('fivefield', 'Demo — a complete match', `
[Jogo "Five Field Kono"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. c1 - b2 { A step along one of the short diagonals. }   a5 - b4
2. a2 - a3     b4 - b3
3. a3 - b4     c5 - c4
4. b2 - a3     b3 - b2
5. d1 - d2     c4 - c3
6. d2 - d3     b2 - c1
   { The first piece home. c1 is one of Black's destination positions, so
     this piece will not move again. }
7. e2 - e3     c3 - d2
8. a1 - a2     d5 - d4
9. b4 - c5 { White's first arrival. }   d4 - c3
10. e1 - e2    c3 - c2
11. b1 - b2    d2 - e1
12. a3 - b4    e5 - d4
13. b4 - a5    d4 - c3
14. a2 - a3    b5 - b4
15. d3 - d4    c3 - d2
16. d4 - e5    b4 - c3
17. e3 - d4    e4 - e3
18. a3 - b4    d2 - d1
19. d4 - d5    a4 - a3
20. b2 - b3    a3 - a2
21. b4 - b5    e3 - d2
22. b3 - b4    c3 - b2
23. e2 - e3    b2 - b1 { Black has five of its seven pieces home. }
24. e3 - e4    d2 - c3
25. b4 - a4 #
   { The seventh position of Black's starting side is filled, and White
     wins the race. }
`);

add('fivefield', 'Figures 3.4–3.5 — blocked, so beaten (book, p. 122)', `
[Jogo "Five Field Kono"]
[Brancas "a5 c5 e5 b4 e4 a3 d3"]
[Pretas "d5 c3 e3 b2 a1 b1 e1"]

// A posição da figura 3.4, depois do 11º lance das brancas.
10. ...        ...
11. ...        d5 - d4
12. a3 - a4    b2 - c2
13. b4 - b5    c2 - d2 #
   { Figure 3.5. Six white pieces have arrived and may not move again; the
     seventh, on d3, has a black piece on every side. White cannot move and
     loses — however many pieces it had brought home. }
`);

/* ================================================================== 4 === */

add('rastros', 'Demo — the piece reaches e5', `
[Jogo "Rastros"]
[Jogador 1 "destino e5"]
[Jogador 2 "destino a1"]

1. c3 { The piece leaves b2, which stays blocked for the rest of the match. }
   b3
2. b4
   a3 { Player 2 heads straight for a1 — and the book warns that this is
        not always the best plan. }
3. a4
   { The only safe answer: from a2 the piece would be one step from a1.
     Now it can only run along the edge. }
   a5
4. b5   c5
5. c4 { From c4 the only free neighbour is d4. }
   d4
6. e5 # { The piece reaches Player 1's destination. }
`);

add('rastros', 'Demo — the piece is blocked', `
[Jogo "Rastros"]

1. c3   b3
2. b4   a3
3. a4   a5
4. b5   c5
5. d5   d4 { Forced: the other way out of d5 was e5 itself. }
6. c4 #
   { Every neighbour of c4 has been visited: b4, c5, c3 and d4. Player 2
     cannot move the piece and loses. }
`);

add('rastros', 'Figure 4.3 — the book’s first moves (p. 125)', `
[Jogo "Rastros"]

// Só o destino é anotado: a peça é uma só.
1. c3   b3
2. b4
`);

add('rastros', 'Figure 4.4 — e1 – e2 leaves no move (corrected)', `
[Jogo "Rastros"]

// O único caminho de b2 até a figura 4.4: catorze jogadas.
1. b3   b4
2. b5   c5
3. c4   c3
4. d3   e3
5. d2   c2
6. c1   d1
7. e1   e2 #
   { Figure 4.4: fourteen positions blocked, so e1 – e2 is the 14th move —
     player 2's. Player 1 is left without a move. The book (p. 126) credits
     the move to player 1. }
`);

add('rastros', 'Figure 4.4 — as the book prints it (player 1 moves)', `
[Jogo "Rastros"]
[Peça "e1"]
[Bloqueios "b5 c5 b4 c4 b3 c3 d3 e3 b2 c2 d2 c1 d1"]
[Vez "1"]

1. e1 - e2 #
   { "Após o movimento e1 – e2 realizado pelo jogador 1, a peça do jogo
     fica bloqueada e o jogador 2 não pode realizar nenhum movimento."
     The figure cannot be reached with player 1 to move: its fourteen
     blocks make e1 – e2 the 14th move, which is player 2's. }
`);

/* ================================================================== 5 === */

add('alquerque', 'Demo — an opening and a triple capture', `
[Jogo "Alquerque"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Abertura pela casa central, a única livre no início.
1. d2 - c3 { Only c3 is free at the start, so the game opens there. }   b4 - d2 (x c3)
2. e1 - c3 (x d2)   e3 - e1 (x e2)
3. c3 - e3 (x d3)   e4 - e2 (x e3)
4. b3 - c3 { White offers c3 again. }   a4 - b4
5. c3 - b3   e5 - e4
6. b3 - c3 { Offered a third time — and this time taking it is a mistake. }
   b4 - d2 (x c3)
7. c1 - e3 - e5 - c3 (x d2 e4 d4)
   { Three in one turn. The jumped pieces stay on the board until the whole
     path is finished, which is what keeps d4 available for the last leg. }
`);

add('alquerque', 'Figure 5.3 — a simple and a multiple capture', `
[Jogo "Alquerque"]
[Brancas "a5 d5 e5 b4 c4 d4 a3 e2 a1"]
[Pretas "a4 b1 c1 e1"]
[Vez "pretas"]

1... e1 - e3 - c5 - c3 (x e2 d4 c4)
   { "Capturas múltiplas": up the edge over e2, along the short diagonal
     over d4, then down the middle over c4. }
2. ...   a4 - a2 (x a3) { "Captura simples": a4 jumps a3 and lands on a2. }
`);

add('promocao', 'Demo — two promotions and a flying capture', `
[Jogo "Alquerque + promoção"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. b2 - c3          b4 - b2 (x b3)
2. b1 - b3 (x b2)   d4 - b2 - b4 (x c3 b3)
   { Two in one turn, turning the corner on b2. }
3. d2 - d4 (x d3)   d5 - d3 (x d4)
4. c1 - b2          d3 - d4
5. a3 - b3          c5 - d5
6. c2 - c1          d4 - d3
7. a1 - b1          b4 - a3
8. b3 - c3          a3 - a1 (x a2) [Mullah]
   { The capture ends on White's first rank, so the piece is promoted. }
9. c3 - c5 (x c4) [Mullah]
   { And White answers in kind on the far side. }
   a1 - d4 (x b2)
   { A Mullah captures like a dama: from a1 it flies over b2, across the
     empty c3, and comes down on d4. }
`);

add('promocao', 'Figure 5.5 — a Mullah moves and captures at any distance', `
[Jogo "Alquerque + promoção"]
[Brancas "a5=M b1=M d3 e3 c2 e2"]
[Pretas "c5 d5 c4 d4 a3"]

1. a5 - a1 - e5 (x a3 d4)
   { Down the edge over a3, then the whole long diagonal over d4. }
   ...
2. b1 - e1 { A plain move of three positions. }
`);

add('fetaix', 'Demo — promotion to Mullah', `
[Jogo "Fetaix"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Em Fetaix as peças não recuam, exceto para capturar.
1. b3 - c3   d3 - b3 (x c3)
2. a3 - c3 (x b3)   b4 - a3 { Black steps back — legal, black advances downwards. }
3. c3 - b4   b5 - b3 (x b4)
4. b2 - b4 (x b3)   a5 - c3 (x b4)
5. d2 - b4 (x c3) { A backward jump: capturing is the one way to go back. }
   e3 - d3
6. c2 - b2   a3 - b3
7. b4 - a5 [Mullah]
   { Reaching the far rank promotes the piece. Note it only promotes because
     the move *ends* there — a jump merely passing through would not. }
   b3 - a3
8. a5 - d2
   { And now it moves like a dama: a5-b4-c3-d2 in one go, four nodes down the
     long diagonal, which no ordinary piece could do. }
`);

add('fetaix', 'Figure 5.5 — a Mullah moves and captures at any distance', `
[Jogo "Fetaix"]
[Brancas "a5=M b1=M d3 e3 c2 e2"]
[Pretas "c5 d5 c4 d4 a3"]

1. a5 - a1 - e5 (x a3 d4)
   { Down the edge over a3, then the whole long diagonal over d4. }
   ...
2. b1 - e1 { A plain move of three positions. }
`);

add('fetaix', 'Figure 5.6 — to promote or not: cases 1, 2 and 3', `
[Jogo "Fetaix"]
[Brancas "a4 b3 e3 b2 c2 d2"]
[Pretas "c5 d5 b4 c4 d4 e4 e2"]

// Os três casos da figura, um após o outro; as pretas não jogam.
1. a4 - a5 [Mullah] { Case 1: a step onto the far rank. }
   ...
2. b3 - b5 (x b4) [Mullah] { Case 2: a capture that ends there. }
   ...
3. e3 - e5 - c3 (x e4 d4)
   { Case 3: the capture passes through e5 but must go on, so the piece
     leaves the far rank and is not promoted. }
`);

add('fetaix', 'Figure 5.6 — as the book prints it (two misprints)', `
[Jogo "Fetaix"]
[Brancas "a4 b3 e3 b2 c2 d2"]
[Pretas "c5 d5 b4 c4 d4 e4 e2"]

// A página 132 anota "(x b2)" e "(x e4 d3)". As peças saltadas são b4 e d4.
1. a4 - a5 [Mullah]   ...
2. b3 - b5 (x b2) [Mullah]
   { The piece jumped is b4; b2 is White's own. The viewer flags the list
     and removes the piece that was actually jumped. }
   ...
3. e3 - e5 - c3 (x e4 d3) { Likewise: the second piece jumped is d4. }
`, 2);

/* ================================================================== 6 === */

add('raposa', 'Book, p. 136 — the fox escapes', `
[Jogo "Raposa e Cachorros"]
[Jogador 1 "brancas — cachorros"]
[Jogador 2 "pretas — raposa"]

1. d1 - d2   c5 - d4
2. b1 - b2   d4 - c4
3. c1 - c2   c4 - c3
4. b2 - a3 { A dog may go sideways or forward, never back. }   c3 - b4
5. d2 - c3   b4 - b3
6. c3 - d3   b3 - b2 { The fox slips through the gap the dogs left on b2. }
7. e1 - d1   b2 - b1 #
   { Figure 6.4: the fox reaches the other side of the board. }
`);

add('raposa', 'Demo — the dogs trap the fox', `
[Jogo "Raposa e Cachorros"]

1. e1 - d2   c5 - d4
2. d2 - c3   d4 - e3 { The fox drifts to the edge, where it has fewer ways out. }
3. c1 - d2   e3 - e2
4. d1 - e1 { A sideways step closes the bottom rank. }   e2 - e3
5. c3 - d3   e3 - e2
6. d3 - e3 #
   { e2 has no diagonals. With dogs on e1, d2 and e3 the fox cannot move:
     the dogs win. }
`);

add('raposa', 'Figure 6.3 — the fox trapped on the edge', `
[Jogo "Raposa e Cachorros"]
[Raposa "a4"]
[Cachorros "a5 b3 a3 d3 c2"]
[Vez "cachorros"]

1. b3 - b4 # { Dogs on a5, b4 and a3: "raposa trancada". }
`);

add('raposa-fox', 'Demo — the fox moves first, and is driven back', `
[Jogo "Raposa e Cachorros — a raposa começa"]
[Jogador 1 "pretas — raposa"]
[Jogador 2 "brancas — cachorros"]

// "Os adversários podem combinar quem realiza o primeiro movimento."
1. c5 - d4   c1 - d2
2. d4 - c3   b1 - b2
3. c3 - c2 { The fox is one step from the far side… }   d1 - c1 { …and the door shuts. }
4. c2 - c3   c1 - c2
5. c3 - b4   c2 - c3
6. b4 - a3   a1 - a2
7. a3 - b4   a2 - a3
8. b4 - b3   e1 - d1
9. b3 - b4   b2 - b3
10. b4 - c4  d2 - e3
11. c4 - d4  d1 - d2
12. d4 - d3  a3 - b4
13. d3 - d4  d2 - d3 { The dogs advance in a chain; the fox has less room every turn. }
14. d4 - e4  c3 - d4
15. e4 - e5  e3 - e4
16. e5 - d5  b4 - c5
17. d5 - e5  c5 - d5 #
   { Back where it almost started, with dogs on d5, e4 and d4, the fox is
     trapped. }
`);

/* ================================================================== 7 === */

add('tonkin', 'Book, p. 140 — corrected to match figure 7.4', `
[Jogo "Tonkin"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Colocação: cinco peças cada, nunca na posição central.
1. a3   a1
2. e4   d3
3. b3   e5
4. d4   c2 { The book prints c3 here — the centre, which is off limits while placing. }
5. d5   b2
// Movimentação.
6. d5 - c5 { The book prints d5 – d4, but d4 is White's own piece; figure 7.4 has it on c5. }
   c2 - c3
7. b3 - b4 #
   { a3, b4, c5: every position of a short diagonal. Three pieces are
     enough when the line has only three positions. }
`);

add('tonkin', 'Book, p. 140 — exactly as printed, misprints and all', `
[Jogo "Tonkin"]

1. a3   a1
2. e4   d3
3. b3   e5
4. d4   c3
5. d5   b2
6. d5 - d4   c2 - c3
7. b3 - b4 #
`, 4);

add('tonkin', 'Figure 7.3 — a line filled while still placing', `
[Jogo "Tonkin"]
[Brancas "a4 c4 d4 e4"]
[Pretas "b5 b3 b2 d2"]

1. b4 # { White's fifth piece fills rank 4 before any piece has moved. }
`);

/* ================================================================== 8 === */

add('tsoro1', 'Book, p. 145 — and how it could go on', `
[Jogo "Tsoro Yematatu — 1º jogo"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Colocação: quatro peças cada.
1. a3   a1
2. e4   d3
3. b3   e5
4. d4   c3
// Primeiro jogo: uma peça troca de lugar livremente.
5. b3 - e1 { In the first game a piece may be lifted to any free position at all. }
   d3 - b1 { The book's record stops here, with figure 8.6. }
6. e1 - b2   e5 - c1 { a1, b1, c1: Black threatens d1. }
7. e4 - d1 { White simply drops a piece in the way. }   a1 - c2
8. d1 - c4   b1 - d2
9. a3 - c5   c3 - d1
10. b2 - b4 { b4, c4, d4 — and both a4 and e4 are free. }   d2 - d3
11. c5 - a4 # { a4, b4, c4, d4: four in a row, as in figure 8.3. }
`);

add('tsoro1', 'Figure 8.3 — c2 – d4 lines up four', `
[Jogo "Tsoro Yematatu — 1º jogo"]
[Brancas "a4 b4 c4 c2"]
[Pretas "b5 c3 b2 a1"]

1. c2 - d4 # { "Movimento livre das peças (troca de posição)": no line joins c2 and d4. }
`);

add('tsoro2', 'Demo — steps along the lines', `
[Jogo "Tsoro Yematatu — 2º jogo"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. d3   c4
2. e3   c5
3. d2   b4
4. c3   d4 { All eight pieces are down and nobody has four in a row: now they move. }
5. e3 - e2 { In the second game a piece only steps to a neighbouring position, along a line. }
   d4 - d5
6. c3 - d4   b4 - c3
7. e2 - e3   c5 - b4
8. d4 - e4   d5 - d4
9. d2 - e2   b4 - c5
10. d3 - d2  c5 - b5
11. d2 - e1 # { The diagonal step d2 – e1 completes e1, e2, e3, e4. }
`);

add('tsoro2', 'The position of figure 8.3 — here a piece can only step', `
[Jogo "Tsoro Yematatu — 2º jogo"]
[Brancas "a4 b4 c4 c2"]
[Pretas "b5 c3 b2 a1"]

1. c2 - d2 { In the second game c2 cannot fly to d4 as in figure 8.3; it steps. }
   c3 - d4 { And Black has time to take d4 away. }
`);

add('tsoro3', 'Demo — steps and jumps', `
[Jogo "Tsoro Yematatu — 3º jogo"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. d4   d1
2. e3   e1
3. d2   c1
4. b1   a3
5. b1 - b2
   e1 - c3
   { A jump: the piece on e1 leaps the white piece on d2 and lands on c3.
     Nothing is captured — a jump only moves faster. }
6. d4 - d3
   d1 - b1 { And a jump over one of Black's own pieces, c1. }
7. d2 - c2   a3 - a2
8. d3 - d2   c3 - b4
9. e3 - e2 # { b2, c2, d2, e2. }
`);

add('tsoro3', 'Figure 8.5 — what the black pieces can do', `
[Jogo "Tsoro Yematatu — 3º jogo"]
[Brancas "a5 b4 a1 c1"]
[Pretas "b5 c3 b2 c2"]
[Vez "pretas"]

1... b5 - b3 { Over the white piece on b4. }
2. ...   c2 - a2 { Over Black's own piece on b2. }
3. ...   c3 - d3 { Or simply a step. }
`);

/* ================================================================== 9 === */

const pahTum = `
// Peças de bloqueio como na figura 9.1.
[Bloqueios "d5 b3 c2"]

1. a3   a1
2. e4   d3
3. b1   e2 { The book's record gives these three moves; the rest fills the board as in figure 9.2. }
4. a5   b4
5. b5   c4
6. c5   d4
7. e5   c3
8. a4   e3
9. a2   b2
10. d1  d2
11. e1  c1
`;

add('pahtum', 'Demo — a match that ends as figure 9.2', `
[Jogo "Pah Tum"]
${pahTum}   { The board is full. Black: five rows of 3 and one of 4 — 14 points.
     White: one row of 3 and one of 4 — 6 points. }
`);

add('pahtum', 'A single block, on the centre', `
[Jogo "Pah Tum"]
[Bloqueios "c3"]

1. b2   d4
2. b3   d3
3. b4   d2 { A row of 3 each, on the b- and d-files: 2 points apiece so far. }
4. b5   d5 { And each stretches it to a row of 4 — one row of 4, worth 4, not two rows of 3. }
`);

add('pahtum-original', 'Demo — the same match with the original scoring', `
[Jogo "Pah Tum — pontuação original"]
${pahTum}   { With 3, 10 and 25 points the same rows are worth 25 to Black
     (5 × 3 + 10) and 13 to White (3 + 10). }
`);

/* ================================================================= 10 === */

add('tictackle', 'Demo — a diagonal where no line is drawn', `
[Jogo "Tic Tackle"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. c1 - b2   e5 - d4
2. b5 - b4   a5 - b5
3. b4 - c3   b1 - c1
4. e1 - d2   c1 - c2
5. d2 - d3   c2 - c1
6. c3 - c4   c1 - d2
7. d3 - c3   d2 - e3
8. c3 - b3 { b3, c4 and d5 stand on a diagonal; a2 would make four. }   e3 - d2
9. b2 - a2 #
   { a2, b3, c4, d5. No line is drawn along this diagonal and no piece
     could ever travel it — but the alignment counts all the same. }
`);

add('tictackle', 'Figure 10.4 — the two kinds of winning row', `
[Jogo "Tic Tackle"]
[Brancas "b5 c4 d3 e1 a3"]
[Pretas "a1 b1 c1 d2 d4"]

1. e1 - e2 # { b5, c4, d3, e2: a diagonal with no line. Black's a1, b1, c1 needed only d1. }
`);

add('tictackle', 'Book, p. 153 — as printed (cannot be played)', `
[Jogo "Tic Tackle"]

// O segundo lance das brancas move a peça preta de e5; o terceiro das pretas repete-o.
1. a1 - b2   a5 - b4
2. e5 - d4   d1 - d2
3. c1 - c2   e5 - d4
`, 2);

/* ================================================================= 11 === */

add('amazonas', 'Book, p. 157 — and how it could go on', `
[Jogo "Amazonas"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. c1 - a1 - d4
   { The piece goes from c1 to a1; then, from a1, a block is thrown along
     the long diagonal to d4. }
   e3 - c1 - b2
2. c5 - c2 - c3
   a3 - b3 - a3 { The block may land on the position the piece has just left. The book's record stops here. }
3. c2 - d2 - c2   b3 - b4 - b3
4. d2 - e3 - d2   c1 - d1 - b1
5. e3 - e5 - e1   b4 - c5 - a5
6. e5 - e3 - e5   c5 - b4 - b5
7. a1 - a2 - a1   b4 - c4 - a4
8. e3 - e2 - e4   c4 - c5 - b4
9. e2 - e3 - e2   d1 - c1 - d1
10. e3 - d3 - e3  c5 - d5 - c5 #
   { Neither white piece has a free neighbour left. White cannot move, and
     Black wins. }
`);

add('amazonas', 'Figure 11.4 — one move that ends the match', `
[Jogo "Amazonas"]
[Brancas "c5 a2"]
[Pretas "a3 b1"]
[Bloqueios "a5 b5 d5 b4 c4 c3 e3 b2 c2 a1"]
[Vez "pretas"]

1... b1 - d1 - d4 # { The block on d4 takes away the last free neighbour of the piece on c5. }
`);

add('amazonas', 'Starting on the corners', `
[Jogo "Amazonas"]
[Brancas "a1 e5"]
[Pretas "a5 e1"]

// "Os jogadores podem combinar em quais posições como, por exemplo, nos cantos."
1. a1 - c3 - c1   a5 - a2 - b2
2. e5 - e2 - d2   e1 - d1 - e1 { Hemmed in already, Black throws its block back where it came from. }
`);

add('amazonas-livre', 'Demo — the pieces enter one at a time', `
[Jogo "Amazonas — 2 peças, entram por colocação"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. b4   d2 { Each player in turn puts a piece anywhere on the board. }
2. d4   b2 { Once all four are down, the moves begin. }
3. d4 - c3 - d3   d2 - e3 - c5
4. c3 - d2 - c1   e3 - d4 - c3
5. d2 - e3 - e5   b2 - d2 - e2
6. b4 - b2 - b4   d4 - e4 - d4
7. b2 - a2 - c2   d2 - e1 - d2
8. a2 - b2 - a2   e1 - d1 - e1
9. b2 - b1 - a1 # { Both black pieces are walled in on the right. }
`);

add('amazonas-1', 'Demo — one piece each', `
[Jogo "Amazonas — 1 peça"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. d4   b4
2. d4 - d2 - b2   b4 - c3 - d3
3. d2 - e3 - c5   c3 - d2 - b4
4. e3 - d4 - c4   d2 - c3 - d2
5. d4 - e3 - d4   c3 - a3 - a1
6. e3 - e1 - e3   a3 - c3 - c1
7. e1 - e2 - e1   c3 - a3 - b3 #
   { With a single piece each the board closes quickly: the white piece
     on e2 has blocks on e1, e3 and d2. }
`);

/* ================================================================= 12 === */

add('coiote', 'Demo — the coyote eats six hens', `
[Jogo "Coiote e Galinhas"]
[Jogador 1 "pretas — coiote"]
[Jogador 2 "brancas — galinhas"]

1. c3 - b2 { The coyote moves first. }   c4 - c3
2. b2 - c1   c3 - d2
3. c1 - b2   b4 - c3
4. b2 - c2   e3 - e2
5. c2 - c4 (x c3)
   { The first hen: the coyote jumps c3 and lands on the free c4. }
   b5 - b4
6. c4 - c3   e2 - e1
7. c3 - b2   b4 - c3
8. b2 - c2   d2 - c1
9. c2 - c4 (x c3)   a3 - b4
10. c4 - c3  c1 - d2
11. c3 - b2  b4 - a3
12. b2 - c3  c5 - b4
13. c3 - b2  d2 - c3
14. b2 - b3  a5 - b5
15. b3 - d3 (x c3)   e4 - e3
16. d3 - c3  a4 - a5
17. c3 - c4  e3 - e4
18. c4 - a4 - a2 (x b4 a3)
   { Two in one turn: over b4 to a4, then down the edge over a3. }
   d4 - c3
19. a2 - b2  e5 - d4
20. b2 - c1  c3 - b4
21. c1 - b2  b4 - c3
22. b2 - a3  e4 - e5
23. a3 - b2  e1 - d2
24. b2 - c2  d4 - c4
25. c2 - e2 (x d2) # { The sixth hen — half the flock — and the coyote has won. }
`);

add('coiote', 'Figure 12.4 — two hens in one turn', `
[Jogo "Coiote e Galinhas"]
[Coiote "c3"]
[Galinhas "c5 e5 a4 b4 c4 e4 d2 b1 e1"]

1. c3 - a5 - a3 (x b4 a4) { Along the diagonal over b4, then down the edge over a4. }
`);

add('coiote', 'Figure 12.3 — the coyote of the book is not quite trapped', `
[Jogo "Coiote e Galinhas"]
[Coiote "b1"]
[Galinhas "c5 d5 a4 e4 c3 a2 a1 c1"]
[Vez "galinhas"]

1... a2 - b2
   { The book calls this "coiote bloqueado": it cannot step anywhere. But
     d1 and b3 are free, so by the capture rule it can still jump… }
2. b1 - d1 (x c1) { …over c1, for instance. }
`);

add('coiote', 'The coyote really trapped', `
[Jogo "Coiote e Galinhas"]
[Coiote "b1"]
[Galinhas "c5 d5 a4 e4 b3 a2 a1 c1 d1"]
[Vez "galinhas"]

1... a2 - b2 #
   { Hens on a1, b2 and c1 — and hens behind b2 and c1 as well, so that no
     jump has anywhere to land. The hens win. }
`);

/* ================================================================= 13 === */

add('yote', 'Demo — a complete match', `
[Jogo "Yoté"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. a5 { Every turn is a choice: place a piece, step with one, or capture. }   d4
2. e2   b2
3. a3   c1
4. a5 - b5 { A step instead of a placement. }   e1
5. e3   d4 - d5
6. a3 - a4   c3
7. c5   d5 - d4
8. d2   c3 - b3
9. d2 - d1   c1 - c2
10. d1 - c1  b2 - c3
11. e5  a1
12. a5  d3
13. c5 - d5  d4 - e4
14. b1  d1
15. b5 - c5  d4
16. b5  d2
17. c5 - b4  a1 - a2
18. e3 - c5 (x d4 e1)
   { The first capture. e3 jumps d4 and lands on c5 — and a capture earns
     the removal of one more enemy piece, here e1. }
   a1
19. e5 - e3 (x e4 a2)   d2 - e1
20. b4 - d2 (x c3 e1)   b3 - a3
21. d2 - d4 (x d3 a3)   e1 { Black's twelfth and last piece. }
22. c1 - c3 (x c2 a1)   e1 - d2
23. e2 - c2 (x d2 d1) # { Two more, and Black has nothing left on the board or in hand. }
`);

add('yote', 'Figure 13.4 — a capture and the extra piece', `
[Jogo "Yoté"]
[Brancas "c5 d5 a4 b4 c2"]
[Pretas "d4 c3 b2 c1 e1"]

1. b4 - d2 (x c3 c1) { c3 is the piece jumped; c1 is the extra piece White chooses to remove. }
`);

/* ================================================================= 14 === */

add('halma', 'Demo — a complete match', `
[Jogo "Halma"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. a1 - c3 { A jump over White's own piece on b2. Nothing is captured in Halma: a jump only saves time. }
   d5 - d3 - b3
   { Two jumps in one turn: over Black's own d4, then over the white piece
     that has just landed on c3. }
2. a2 - c2 - c4   e4 - e2
3. c4 - e4 { Over d4 and into Black's corner. }   e3 - e1
4. b1 - d1   b3 - b1
5. a3 - b3   c5 - b4
6. c1 - a3 - c5 { Turning the corner on a3. }   e1 - c1 - a1
7. d1 - e1   e5 - e3
8. b3 - d3 - d5   e3 - d2
9. e1 - e3 - e5   e2 - c2 - a2
10. c3 - d3  d4 - c4
11. b2 - c3  d2 - c1
12. c3 - e3  c1 - b2
13. d3 - d4 #
   { c5, d5, e5, d4, e4, e3: Black's starting corner is full, and White
     wins. Black had four of the six positions on the other side. }
`);

add('halma', 'Figure 14.4 — three jumps in a row', `
[Jogo "Halma"]
[Brancas "d5 b4 d4 e4 d2 b1"]
[Pretas "e5 a4 c4 b3 a2 b2"]
[Vez "pretas"]

1... e5 - e3 - c1 - a1 { Over e4, over d2, over b1 — changing direction twice. }
`);

add('halma', 'Figure 14.3 — the corner is filled', `
[Jogo "Halma"]
[Brancas "c5 d5 b4 d4 e4 d2"]
[Pretas "e5 a3 a2 a1 b1 c1"]

1. d2 - e3 #
   { Black's corner is full — five white pieces and Black's own on e5.
     Any piece counts, which is why nobody can win by staying at home. }
`);

/* ================================================================= 15 === */

add('quadra', 'Demo — won by capturing two pairs', `
[Jogo "Quadra"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. c3   a1
2. d4   b1
3. b2   e5
4. d3   c1
5. d1   d2 { Black's d2 cuts the white d-file in two. }
6. d5   e3
7. b3 { b2 and b3 now stand between Black's b1 and the free b4… }
   b4 (x b3 b2) { …and Black takes the pair. }
8. b2
   b3 (x c3 d3) #
   { b3 – c3 – d3 – e3: a second pair bracketed, and two pairs win the
     match — no row of four needed. }
`);

add('quadra', 'Figure 15.2 — capturing a pair', `
[Jogo "Quadra"]
[Brancas "e5 a4 d4 c2 b1 e1"]
[Pretas "b5 c4 c3 b2 d2 a1"]

1. b4 (x c3 d2)
   { b4 and e1 bracket exactly two black pieces on the long diagonal. The
     single piece on c4, between b4 and d4, is not taken: "nem mais, nem
     menos". }
`);

add('quadra', 'Figure 15.3 — four in a row', `
[Jogo "Quadra"]
[Brancas "e5 a4 c4 d4 c2 b1 e1"]
[Pretas "b5 c5 e4 a3 c3 b2 a1"]

1. b4 #
`);

add('quadra', 'Figure 15.4 — two pairs with one piece', `
[Jogo "Quadra"]
[Brancas "e5 a4 d4 d3 c2 b1 e1"]
[Pretas "b5 c4 b3 c3 b2 d2 a1"]

1. b4 (x b2 b3) (x c3 d2) # { Down the b-file and along the diagonal at once: two captures, and the match. }
`);

/* ================================================================= 16 === */

add('seega', 'Demo — a complete match', `
[Jogo "Seega"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Colocação: duas peças por vez, nunca na posição central.
1. b1 b2   d1 c2
2. c1 d5   a4 b4
3. e2 b5   a3 a5
4. c4 e4   e1 b3
5. a2 d2   d4 c5
6. d3 e3   a1 e5 { The last pair. Whoever places it also makes the first move. }
// Movimentação.
7... b3 - c3 (x b2 d2 c4)
   { The centre is the only free position, so the first move goes there —
     and captures three ways at once: b2 against a1, d2 against e1, c4
     against c5. }
8. e2 - d2   e1 - e2 (x d2)
9. a2 - b2   a1 - a2 (x b2)
10. c1 - d2  d1 - e1 (x d2)
11. d3 - d2  c3 - b3
12. d2 - d3 (x d4) { White's one capture: d4 caught between d3 and d5. }
   a2 - a1
13. b1 - c1  c2 - b2
14. c1 - d2  b4 - c3 (x d2)
15. d3 - d4  c3 - d2
16. d4 - c3  d2 - d3 (x c3)
17. e3 - d2  d3 - c3 (x d2)
18. b5 - b4  c3 - c4 (x b4)
19. e4 - d4  b2 - c3 (x d4) # { White is down to a single piece. }
`);

add('seega', 'Figure 16.4 — one piece in custody', `
[Jogo "Seega"]
[Brancas "a4 d4 d3 b1 e1"]
[Pretas "b5 c4 b3 c3 b2 d2"]

1. a4 - b4 (x c4)
   { c4 is caught between b4 and d4. The pairs b3–b2 and c3–d2 also stand
     between two white pieces, but only a single piece can be taken. }
`);

add('seega', 'Figure 16.5 — three captures in one move', `
[Jogo "Seega"]
[Brancas "a4 d4 d3 b2 d2"]
[Pretas "b5 c4 b3 c3 e3 c2"]

1. a4 - b4 (x b3 c3 c4) { Down the file, down the diagonal and along the rank. }
`);

add('seega', 'Figure 16.6 — stepping between two enemies is safe', `
[Jogo "Seega"]
[Brancas "a4 d4 d3 b1"]
[Pretas "b5 b3 c3 b2"]

1. a4 - b4 { b4 sits between b5 and b3 and is not captured: only the player who moves captures. }
`);

/* ================================================================= 17 === */

add('baghchal', 'Demo — twenty goats cage the tigers', `
[Jogo "Bagh Chal"]
[Jogador 1 "brancas — cabras"]
[Jogador 2 "pretas — tigres"]

1. c1 { A goat enters; then a tiger moves. The goats stay where they are put until all twenty are in. }
   a5 - b4
2. d1   e5 - d4
3. c5   e1 - d2
4. e3   a1 - b2
5. e2   d4 - e5
6. b5   e5 - d4
7. e5   d2 - c3
8. d5   b4 - a4
9. b1   a4 - a3
10. a5  d4 - c4
11. e4  c4 - d4
12. a1  d4 - d3
13. a2  a3 - b4
14. a3  b2 - c2
15. b2  c2 - d2
16. d4  c3 - c4
17. c2  d2 - e1
18. b3  b4 - a4
19. c3  a4 - b4
20. d2 { The twentieth goat. Not one has been eaten, and from now on the goats move. }
   b4 - a4
21. b5 - b4 #
   { The first goat to move closes the last gap. None of the four tigers
     can step or jump: the goats win. }
`);

add('baghchal', 'Figure 17.3 — a tiger eats three goats', `
[Jogo "Bagh Chal"]
[Tigres "c5 e5 d4 a2"]
[Cabras "a5 b5 a4 e4 b3 c3 b2 c2 d2 b1"]
[Vez "tigres"]

1... e5 - e3 - c1 - a1 (x e4 d2 b1)
`);

add('baghchal', 'Figure 17.4 — the last goat shuts the cage', `
[Jogo "Bagh Chal"]
[Tigres "a5 d5 e5 d4"]
[Cabras "b5 c5 a4 b4 c4 e4 a3 c3 d3 e3 b2"]

1. d2 # { "Tigres presos": every jump a tiger could make lands on another goat. }
`);

/* ================================================================= 18 === */

add('dara', 'Demo — a complete match', `
[Jogo "Dara"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

// Colocação: nunca três em linha.
1. a4   e4
2. a3   e5
3. b4   d4
4. b3   d5 { Pairs everywhere: a row of three is not allowed while placing. }
5. e2   b2
6. e3   a2
7. d2   a1
8. d3   c1
9. b1   d1
   { White still holds a piece but cannot place it anywhere without making
     a row of three. So White opens the movement phase, and the piece each
     player still holds is discarded. }
// Movimentação.
10. d3 - c3 (x b2)
   { a3, b3, c3 — and b4, c3, d2 on the diagonal as well. Two rows at once,
     but a move removes one piece only: White picks b2. }
   d4 - c5 (x b3)
11. c3 - c4 (x c5)   e4 - d4
12. c4 - c3 (x e5) { Back to c3: b4, c3, d2 line up again. A row that was broken counts anew when it is remade. }
   d4 - c5
13. b4 - b3 (x c1)   d1 - c1
14. c3 - b2 (x c5)   d5 - e5
15. d2 - c3 (x a1)   e5 - d5
16. e3 - d4 (x a2) # { Black is left with two pieces and can no longer make a row. }
`);

add('dara', 'Figure 18.3 — a row of three removes a piece', `
[Jogo "Dara"]
[Brancas "b5 c4 d4 a2 b2 d2 b1"]
[Pretas "b3 d3 c2 e2 c1"]

1. b5 - b4 (x d3) { b4, c4, d4. The piece taken is White's choice — here d3. }
`);

add('dara', 'Figure 18.4 — two rows, still one piece', `
[Jogo "Dara"]
[Brancas "b5 c4 d4 c3 b2 d2 b1"]
[Pretas "b3 d3 c2 e2 c1"]

1. b5 - b4 (x d3) { b4–c4–d4 and b4–c3–d2 at once: "somente uma peça adversária é retirada". }
`);

/* ================================================================= 19 === */

add('fanorona', 'Demo — a complete match', `
[Jogo "Fanorona"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. c2 - c3 (x c4 c5)
   { An approach: the piece arrives next to c4 and takes it — together
     with c5, which stands right behind it on the line of the move. }
   b4 - c5 (x a3)
   { A withdrawal: b4 was touching a3 and steps directly away from it. }
2. a2 - a3 (x a4 a5)   c5 - b4 (x a3)
3. c3 - c4             b4 - c3 (x d2 e1)
4. e2 - e1 (x e3 e4 e5)
   { A withdrawal that empties the file: e3, e4 and e5 form an unbroken row. }
   c3 - d2 (x e1)
5. c4 - b4 (x d4)      d2 - e3 (x c1)
6. d3 - d4 (x d5)      e3 - e2
7. d1 - c1             e2 - e1
8. c1 - d1 (x e1)      b3 - c3
9. d4 - e5 (x c3)      b5 - c5
10. e5 - d5 (x c5) # { The last black piece. }
`);

add('fanorona', 'Figure 19.3 — capture by approach', `
[Jogo "Fanorona"]
[Pretas "a1 b2 c5 e3 d2 e2"]
[Brancas "a5 d5 e5 b4 c4 d4 e4 a3 d3"]
[Vez "pretas"]

1... b2 - c3 (x d4 e5) { The step ends next to d4; d4 and e5 behind it are both taken. }
2. ...   a1 - a2 (x a3)
`);

add('fanorona', 'Figure 19.4 — capture by withdrawal', `
[Jogo "Fanorona"]
[Pretas "a4 e3 b2 d2 e2"]
[Brancas "a5 c5 d5 e5 b4 c4 d4 e4 a3 d3"]
[Vez "pretas"]

1... d2 - d1 (x d3 d4 d5) { d2 steps away from d3 and takes the whole row. }
2. ...   b2 - c1 (x a3) { Away from a3 along the diagonal. }
`);

add('fanorona', 'Figure 19.5 — approach or withdrawal: the player chooses', `
[Jogo "Fanorona"]
[Vez "pretas"]

// Da posição inicial. O livro anota "b3 – c3 (x a3 ou d3)".
1... b3 - c3 (x d3)
   { The same step withdraws from a3 and approaches d3. Only one capture
     is made; here Black chooses the approach. Change the list to (x a3)
     to see the other. }
`);

/* ================================================================= 20 === */

add('kono4', 'Demo — a complete match', `
[Jogo "Four Field Kono"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. a2 - x a4
   { The capture peculiar to this game: a2 jumps over its own piece on a3
     and lands on the black piece on a4, which is removed. }
   d4 - x d2 { Black does the same over d3. }
2. b2 - x b4   e3 - x c1
3. a4 - x c4   d3 - x d1
4. a1 - x c1   d5 - d4
5. b4 - x d4   e4 - e3
6. e1 - x e3   c5 - d5
7. b1 - x d1   d2 - d3
8. d1 - e1 { No capture is available, so a piece simply steps. }   a5 - a4
9. c2 - b2     b5 - a5
10. a3 - a2    d3 - c3
11. d4 - e4    e5 - d4
12. b2 - c2    c3 - d2
13. c4 - c5    d2 - d1
14. a2 - b2    d4 - d3
15. e4 - d4    a5 - b5
16. c5 - c4    d5 - e5
17. e3 - e4    b5 - a5
18. e1 - d2    d1 - e1
19. b2 - c3    a4 - b4
20. c3 - x e5  b4 - c5
21. d2 - c3    e1 - d2
22. b3 - x d3  c5 - d5
23. d4 - x d2  a5 - a4
24. c1 - b2    a4 - a5
25. c4 - d4    d5 - c5
26. d3 - e3    c5 - d5
27. d2 - d3    a5 - b5
28. d3 - x d5 # { Black is left with a single piece. }
`);

add('kono4', 'Figure 20.4 — jumping one’s own piece to capture', `
[Jogo "Four Field Kono"]
[Brancas "b5 e5 a4 c4 d4 e4 a3 b3"]
[Pretas "d3 e3 b2 c2 d2 c1 e1"]

1. e5 - x e3 { Over White's own e4. }
   c1 - x a3 { Along the diagonal, over Black's own b2. }
2. ...
   d2 - x d4 { Over d3. }
`);

/* ================================================================= 21 === */

add('tigres', 'Demo — the cows block both tigers', `
[Jogo "Tigres e Vacas"]
[Jogador 1 "pretas — tigres"]
[Jogador 2 "brancas — vacas"]

1. d3 - d2 { The tigers move first. }   d4 - d3
2. b3 - b2     b4 - b3
3. b2 - a1     a3 - b2
   { Right beside the tiger on a1 the cow is safe from it — but the other
     tiger stands two positions away, with an empty c2 in between. }
4. d2 - x b2   c3 - c2
   { The capture: the tiger leaps the empty c2 and lands on the cow. }
5. b2 - c3     c2 - b2
6. c3 - x e5   c5 - d4
7. a1 - b1     d3 - d2
8. b1 - c1     c4 - c5
9. c1 - c2     c5 - b4
10. c2 - c1    b3 - a3
11. c1 - b1    a3 - a2
12. b1 - c1    a4 - a3
13. c1 - d1    b5 - c5
14. d1 - c1    b4 - b3
15. c1 - c2    b3 - c3
16. c2 - c1    c3 - d3
17. c1 - b1    d2 - c1
18. b1 - a1    c1 - b1 #
   { One tiger is shut in on a1 by a2, b1 and b2, the other on e5 by d5,
     e4 and d4. With a cow right next to it on every line, a tiger has
     nothing to leap over. }
`);

add('tigres', 'Demo — the tigers eat six cows', `
[Jogo "Tigres e Vacas"]

1. b3 - b2     b4 - b3
2. b2 - c1     a3 - b2
3. c1 - x c3   b5 - b4
4. d3 - d2     e3 - d3
5. d2 - x b2   a4 - a3
6. c3 - d2     d4 - c3
7. b2 - c1     a3 - a2
8. c1 - x c3   d5 - d4
9. c3 - c2     c4 - c3
10. c2 - x a2  b3 - a3
11. a2 - a1    a3 - b2
12. d2 - x b2  b4 - b3
13. b2 - a3    a5 - b4
14. a1 - x c3 # { The sixth cow. }
`);

add('tigres', 'Figure 21.5 — a tiger needs room to capture', `
[Jogo "Tigres e Vacas"]
[Tigres "a4 e1"]
[Vacas "a5 d5 c4 c3 e3 a2 b2 d1"]
[Capturadas "0 0"]

1. a4 - x c4 { Over the empty b4. The cow on a5, right beside the tiger, cannot be touched. }
   ...
2. e1 - x e3 { Over the empty e2. }
`);

add('tigres', 'Figure 21.3 — both tigers blocked', `
[Jogo "Tigres e Vacas"]
[Tigres "e2 a1"]
[Vacas "e5 c3 e3 a2 b2 d3 b1 e1"]
[Vez "vacas"]

1... d3 - d2 # { "Tigre imobilizado", twice over. }
`);

/* ================================================================= 22 === */

add('szkwa', 'Demo — one move that takes twelve', `
[Jogo "Sz’kwa"]
[Jogador 1 "brancas"]
[Jogador 2 "pretas"]

1. d4   d1
2. a2   e5
3. a4   c4
4. c1   d2
5. c5   e1
6. b5   b2
7. b4   c3
8. d3   a3
9. d5   a1 (x a2) { a2 has lost its last free neighbour — a1 — and is captured. }
10. e4 (x e5) { The same on the other side: e5 between d5, d4 and e4. }
   e3
11. a5  b3
12. e5  b1
13. c2  e2
14. a2 (x a1 b1 d1 e1 b2 d2 e2 a3 b3 c3 e3 c4)
   { The move the match was heading for. Twelve black pieces had grown
     into one group whose only free neighbour was a2 — and White fills it. }
   d1
15. b1  b2
16. c3  d2
17. e2  b3
18. a1  a3
19. e3  c4
20. e1 (x d1 d2)
   d2 { The twentieth piece of each player: the match is over. White captured 15, Black 1. }
`);

add('szkwa', 'Figure 22.3 — a piece and a group enclosed', `
[Jogo "Sz’kwa"]
[Pretas "b5 c5 d5 b4 e4 b3 d3 e3 b2 d2"]
[Brancas "a5 e5 c4 d4 c3 a2 e2 b1"]
[Vez "pretas"]

1... a4 (x a5) { "Peça branca capturada." }
2. ...   c2 (x c3 c4 d4 e5) { The group of four has no free neighbour left — e5 is joined to it by the diagonal. }
`);

add('szkwa', 'Figure 22.4 — sealing in your own pieces is safe', `
[Jogo "Sz’kwa"]
[Pretas "b5 c5 d5 a4 b4 e4 b3 d3 e3 b2 c2 d2"]
[Brancas "e5 c4 d4 a2 e2 b1"]

1. a5 { A white piece with no free neighbour — but White put it there, so it stays: "peça branca protegida". }
   a3
2. c3 { The white group closes its own last gap, and is just as safe. }
`);

add('szkwa', 'Figure 22.5 — the last free position', `
[Jogo "Sz’kwa"]
[Brancas "a5 e5 d4 a3 c3 a2 d2 e2 b1 e1"]
[Pretas "b5 c5 d5 a4 b4 e4 b3 d3 e3 b2 c2 a1 c1 d1"]

1. c4 (x b5 c5 d5 a4 b4 b3 b2 c2 a1 c1 d1)
   { "Preparar o último lance": the piece on the last free position takes
     a group of eleven. The three black pieces that do not touch c4 stay. }
`);

/* ------------------------------------------------------------------------ */

/** The examples of one entry of the Game selector; the first is its demo. */
export function samplesFor(variantId) {
  return SAMPLES[variantId] || [];
}

const squeeze = (text) => String(text).replace(/\s+/g, ' ').trim();
let known = null;

/** Is `text` one of the examples, untouched? */
export function isSample(text) {
  if (!known) {
    known = new Set();
    for (const id in SAMPLES) for (const s of SAMPLES[id]) known.add(squeeze(s.text));
  }
  return known.has(squeeze(text));
}
