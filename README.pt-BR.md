# 21 Jogos — Visualizador de partidas

*[Read in English](README.md)*

Feito por **Augusto Mattei Grohmann** · 25 de novembro de 2026 · desenvolvido
com Gemini e Claude.

Um visualizador, sem dependências, de partidas registradas dos **21 jogos** de
*Divirta-se com 21 Jogos Lógicos no Mesmo Tabuleiro* (vol. 2), de Renato Perez
Ribas — todos jogados no tabuleiro do Alquerque.

Cole uma partida e acompanhe-a lance a lance: veja as peças deslizarem,
saltarem, entrarem e saírem do tabuleiro, e leia o comentário de cada jogada.
Ou marque **Play on the board** e jogue uma partida com o mouse, com o registro
se escrevendo sozinho. HTML5 + CSS3 + módulos ES6 puros; sem framework, sem
etapa de build, sem servidor de aplicação.

A interface da página está em inglês; os nomes de botões e menus aparecem
abaixo como estão na tela.

## Como executar

Os navegadores bloqueiam módulos ES abertos via `file://`, então é preciso
servir a pasta: abra um terminal dentro dela, rode um dos comandos abaixo e
abra <http://localhost:8000>.

| Você tem | Windows | macOS / Linux |
| --- | --- | --- |
| Node.js | `npm start` | `npm start` |
| Python 3 | `python -m http.server 8000` (ou `py -m http.server 8000`) | `python3 -m http.server 8000` |

`npm start` executa `tools/serve.mjs`, um pequeno servidor sem dependências;
para usar outra porta, `npm start -- 8080`. No Windows, `python3` costuma abrir
a Microsoft Store em vez do Python, por isso o comando lá é `python` ou `py`.
Para parar o servidor, tecle `Ctrl+C` no terminal.

`http://localhost:8000/#seega` abre um jogo diretamente (qualquer id da tabela
abaixo). A página lembra o jogo, o registro e a velocidade entre as visitas.

## Os jogos

O seletor **Game** lista os jogos na ordem do livro, que é a ordem crescente de
complexidade. Os jogos que o livro apresenta de várias formas têm uma entrada
para cada forma — 29 no total. O número de cada entrada (`Ch. 2`…`Ch. 22`) é o
capítulo do livro; o capítulo 1 apresenta o tabuleiro.

| Cap. | Jogo | Tipo | Ids no seletor | Como se vence |
| --- | --- | --- | --- | --- |
| 2 | Jogo-da-Velha 4 | posicionamento | `velha4` | quatro em linha sobre uma linha desenhada |
| 3 | Five Field Kono | deslocamento | `fivefield` | ocupar o lado de partida do adversário; ou bloqueá-lo |
| 4 | Rastros | bloqueio | `rastros` | a peça comum chega ao seu destino; ou o adversário não consegue movê-la |
| 5 | Alquerque (Fetaix) | captura | `alquerque` `promocao` `fetaix` | capturar todas as peças adversárias |
| 6 | Raposa e Cachorros | caça | `raposa` `raposa-fox` | os cachorros prendem a raposa; a raposa chega à fileira 1 |
| 7 | Tonkin | alinhamento | `tonkin` | preencher uma linha inteira do tabuleiro |
| 8 | Tsoro Yematatu | alinhamento | `tsoro1` `tsoro2` `tsoro3` | as quatro peças em linha |
| 9 | Pah Tum | posicionamento | `pahtum` `pahtum-original` | mais pontos por fileiras de 3, 4 e 5 |
| 10 | Tic Tackle | alinhamento | `tictackle` | quatro em linha — com ou sem linha desenhada |
| 11 | Amazonas | bloqueio | `amazonas` `amazonas-livre` `amazonas-1` | o adversário não consegue mover |
| 12 | Coiote e Galinhas | caça | `coiote` | o coiote come 6 galinhas; as galinhas prendem o coiote |
| 13 | Yoté | captura | `yote` | capturar todas as peças adversárias |
| 14 | Halma | deslocamento | `halma` | ocupar o canto de partida do adversário |
| 15 | Quadra | posicionamento | `quadra` | quatro em linha, ou capturar dois pares |
| 16 | Seega | captura | `seega` | deixar o adversário com uma peça |
| 17 | Bagh Chal | caça | `baghchal` | os tigres comem 5 cabras; as cabras prendem todos os tigres |
| 18 | Dara | alinhamento | `dara` | deixar o adversário com duas peças |
| 19 | Fanorona | captura | `fanorona` | capturar todas as peças adversárias |
| 20 | Four Field Kono | captura | `kono4` | deixar o adversário com uma peça |
| 21 | Tigres e Vacas | caça | `tigres` | os tigres comem 6 vacas; as vacas bloqueiam os dois tigres |
| 22 | Sz’kwa | posicionamento | `szkwa` | mais peças capturadas |

Cada jogo traz o mesmo que o visualizador sempre ofereceu para o Alquerque: a
posição inicial, as regras (em **Rules**, na página), a notação, uma linha de
estado e um placar próprios, avisos para cada regra que um registro desrespeita,
e exemplos — uma partida de demonstração comentada, além das figuras e
registros do próprio livro, em **Example**. As demonstrações são partidas
completas, exceto as três etapas do Alquerque, que são aberturas: como observa
o livro, um Alquerque bem jogado acaba num final em que os dois lados
costumam combinar o empate.

## Como usar

**Carregar.** Cole um registro e clique em *Load match*. Um cabeçalho
`[Jogo "Seega"]` seleciona o jogo sozinho. Trocar o seletor reproduz o que está
na caixa sob as novas regras — é assim que se comparam, num mesmo registro, as
três etapas do Alquerque ou os três jogos do Tsoro Yematatu. (Um exemplo não
editado dá lugar a um exemplo do jogo recém-selecionado.)

**Navegar.** Primeiro / Anterior / Reproduzir-Pausar / Próximo / Último, uma
barra de linha do tempo, um controle de velocidade (de 2,0 s a 0,2 s por lance)
e uma lista de lances clicável. Teclado: `←` `→` `Home` `End` `Espaço`; `↑` `↓`
quando a lista de lances tem o foco. *Play* no fim de um registro recomeça a
partida.

Cada lance da lista traz marcadores — ⚠ regra desrespeitada, ℹ nota, 💬
comentário, ■ resultado — que mostram o seu texto ao passar o mouse. No
tabuleiro, o último lance fica marcado: de onde a peça saiu e para onde foi,
peças que entraram e peças capturadas.

**Ler.** O placar nomeia os dois lados como o capítulo os chama (Tigres /
Cabras, Raposa / Cachorros…), sublinha o lado que joga e mostra o que importa
em cada jogo: peças na mão, capturas frente ao número necessário, pontos,
quanto do lado oposto já foi ocupado. Abaixo do tabuleiro fica o estado da
partida: de quem é a vez, a fase e o resultado com o seu motivo. A linha
vencedora, as fileiras que pontuaram e o lado ocupado são desenhados no
tabuleiro.

**Jogar.** Marque *Play on the board*. As peças que podem se mover ficam
circuladas; clique numa e depois no destino. Posições livres mostram um ponto;
peças que podem ser capturadas, um anel vermelho. Uma sequência de saltos é
clicada pouso a pouso (clique de novo no último pouso para parar antes); um
par de colocações no Seega são dois cliques; no Amazonas, o terceiro clique é
onde cai o bloqueio; quando uma captura deixa uma escolha — a peça extra no
Yoté, a vítima no Dara, aproximação ou afastamento no Fanorona — mais um clique
a define. Uma linha de dica abaixo do tabuleiro diz para que serve o próximo
clique ("Tigres: click where it goes — or click the piece again to stop
here"). `Esc` cancela uma jogada pela metade. Só jogadas legais podem ser
clicadas. Cada jogada é escrita no fim do registro na notação do livro, com `#`
quando for o caso. *Undo move* remove a última jogada do registro; *New match*
o esvazia, coloca o cabeçalho `[Jogo "…"]` do jogo e marca *Play on the board*
sozinho.

## Notação

Comum a todos os jogos:

| Forma | Significado |
| --- | --- |
| `c3` | uma peça colocada em c3 |
| `c3 – b4`, `c3-b4`, `c3→b4`, `c3b4` | movimento |
| `a1 – c1 – e3 – c5` | um caminho de qualquer tamanho |
| `a4 – b4 (x c4)` | movimento com captura |
| `b3 x b1` | movimento escrito com o símbolo de captura |
| `b3 – b4 #` | a jogada que encerra a partida |
| `...` | uma jogada omitida no registro (ainda consome a vez) |
| `{ … }`, `; …`, `// …` | comentários (as chaves podem ocupar várias linhas) |

Números de jogada (`1.`, `12...`), resultados e qualquer outro texto solto são
ignorados. Um registro que começa em `11.` mantém essa numeração na lista de
lances.

O que cada capítulo acrescenta:

| Jogo | Forma | Significado |
| --- | --- | --- |
| Rastros | `c3` ou `e1 – e2` | para onde a peça vai — a origem é opcional |
| Alquerque | `e3 – e5 – c3 (x e4 d4)` | captura múltipla — escreva o caminho inteiro |
| Fetaix | `b3 – b5 (x b4) [Mullah]` | promoção (`=Mullah` também funciona) |
| Amazonas | `c1 – a1 – d4` | a peça vai de c1 a a1 e depois lança um bloqueio de a1 a d4 |
| Yoté | `b4 – d2 (x c3 c1)` | c3 é saltada, c1 é a peça extra removida |
| Quadra | `b4 (x b2 b3) (x c3 d2)` | uma colocação que captura dois pares |
| Seega | `b4 c5` | um par de peças colocado numa só vez |
| Seega | `pass` | a vez de um jogador que não pode mover (`...` também funciona) |
| Fanorona | `b3 – c3 (x a3)` | a lista diz qual captura foi escolhida |
| Four Field Kono, Tigres e Vacas | `e5 – x e3` | uma captura que pousa sobre a vítima |
| Sz’kwa | `c2 (x c3 c4 d4 e5)` | uma colocação que captura um grupo |

**As listas de captura são opcionais sempre que as regras decidem a captura**
— saltos, custódia, cerco, pares entre peças: `e3 – e5 – c3` sozinho é jogado
corretamente. Quando há uma lista escrita e ela não confere com o tabuleiro, a
jogada recebe um aviso e são removidas as peças que as regras capturam. Onde a
captura é escolha do jogador (os três casos acima), a lista decide, e a falta
dela gera um aviso.

### Começando de qualquer posição

Cabeçalhos montam um diagrama em vez da posição inicial:

```
[Jogo "Bagh Chal"]
[Tigres "c5 e5 d4 a2"]
[Cabras "a5 b5 a4 e4 b3 c3 b2 c2 d2 b1"]
[Vez "tigres"]

1... e5 - e3 - c1 - a1 (x e4 d2 b1)
```

| Cabeçalho | Significado |
| --- | --- |
| `[Jogo "…"]` (ou `Game`, `Regras`, `Rules`) | o jogo — um nome ou um id da tabela acima |
| `[Brancas "a1 b2"]` `[Pretas "d4 e5"]` | as peças; `White` / `Black` e os nomes próprios de cada jogo também funcionam (`Tigres`, `Cabras`, `Raposa`, `Coiote`, `Vacas`…) |
| `[Bloqueios "d5 b3 c2"]` | peças de bloqueio (Pah Tum, Amazonas, Rastros) |
| `[Peça "c3"]` | a peça única do Rastros |
| `a5=M` dentro de uma lista, ou `[Mullah "a5"]` | peças promovidas |
| `[Vez "pretas"]` | quem joga — uma cor, um papel, ou `1` / `2` |
| `[Reserva "8 7"]` | peças ainda fora do tabuleiro, brancas e depois pretas |
| `[Capturadas "2 0"]` | peças já capturadas, pela cor da peça |

Qualquer cabeçalho que coloque uma peça torna a posição personalizada: o
tabuleiro passa a ter exatamente o que os cabeçalhos listam. Peças na mão e
capturas são deduzidas do que está no tabuleiro, salvo indicação. Outros
cabeçalhos (`[Jogador 1 "brancas"]`) são ignorados.

## Visualizador, não árbitro

Uma jogada que desrespeita uma regra ainda é executada como escrita e marcada
com ⚠ na lista de lances e no comentário — um histórico com erro de digitação
segue até o fim em vez de parar. Cada jogo aponta as suas próprias regras:
nenhuma peça na origem, destino ocupado, passo fora das linhas desenhadas,
movimento de mais de uma posição, cachorro recuando, cabra movendo-se cedo
demais, fileira de três durante a colocação no Dara, o centro durante a
colocação no Tonkin e no Seega, salto sobre o vazio, bloqueio lançado por cima
de uma peça, lista de captura que não confere com o tabuleiro, `#` numa jogada
que não vence, jogada depois do fim da partida… O que passar pelas verificações
de cada jogo ainda é comparado com a lista estrita de jogadas legais, de modo
que nenhuma jogada ilegal passa sem aviso.

Duas situações são apenas *mencionadas* (ℹ), nunca marcadas como erro:

- **Uma captura obrigatória que não foi feita** (Alquerque, Fetaix, Fanorona,
  Four Field Kono). O livro permite que o adversário a dispense — "se um dos
  jogadores não viu uma possibilidade de captura e o outro jogador não quer
  avisá-lo ele está no seu direito, e o jogo continua" — então esse registro é
  legal. A nota indica qual captura estava disponível.
- **Um lado que fica sem jogada quando o livro não diz o que acontece.**

## Regras, como foram implementadas

A página mostra as regras de cada jogo. Estes são os pontos em que o livro
pediu uma leitura atenta, ou não diz nada:

- **Linhas.** Tudo segue as linhas desenhadas; só há diagonais nos pontos em
  que coluna + fileira é par. A única exceção é o alinhamento vencedor do Tic
  Tackle, que vale em qualquer diagonal ("mesmo onde não há linha").
- **Five Field Kono, Halma.** Um lado "ocupado" conta peças de qualquer cor, e
  só é avaliado depois que cada jogador moveu (p. 120) — os dois lados começam
  cheios. Voltar a ocupar o próprio lado entrega a partida ao adversário.
- **Rastros.** O jogador 1 vai para e5 e o jogador 2 para a1, como diz o texto
  (a figura numera os cantos ao contrário, e o tabuleiro os mostra como a
  figura). Uma peça levada ao destino do *adversário* dá a vitória ao
  adversário, como no jogo original; o livro não trata do caso.
- **Alquerque.** As peças saltadas saem ao fim da jogada, então bloqueiam e não
  podem ser saltadas duas vezes. Um Mullah anda qualquer distância e captura a
  qualquer distância antes e depois da vítima (figura 5.5). A promoção exige
  que a jogada *termine* na última fileira.
- **Raposa e Cachorros.** "Os adversários podem combinar quem realiza o
  primeiro movimento" — daí as duas entradas. Os cachorros começam na partida
  do livro.
- **Tsoro Yematatu.** As quatro peças devem estar lado a lado sobre uma linha
  desenhada, como no Jogo-da-Velha 4.
- **Pah Tum.** Cada fileira contínua conta uma vez, pelo seu comprimento total
  (uma fileira de 4 não é também duas de 3) — é isso que faz a figura 9.2 dar 14
  e 6. Os bloqueios são os da figura 9.1, salvo indicação de `[Bloqueios]`.
- **Amazonas.** O bloqueio pode cair na posição que a peça acabou de deixar
  (`a3 – b3 – a3` no registro do livro).
- **Coiote e Galinhas, Bagh Chal.** Saltos múltiplos são permitidos, como diz o
  livro, com a convenção do Alquerque para as peças saltadas. Capturar é
  opcional. "Preso" significa sem passo *e* sem salto.
- **Yoté.** Peças capturadas não voltam para a mão. Sem peça adversária para
  tirar como extra, a captura fica como está.
- **Quadra.** Só a peça colocada captura; um par colocado entre duas peças
  adversárias está a salvo, como no Seega. Tabuleiro cheio sem vencedor é
  empate.
- **Seega.** Quem colocou o último par move primeiro; um jogador bloqueado
  perde a vez. Não há captura durante a colocação.
- **Dara.** Uma fileira só conta se a peça movida fizer parte dela, e precisa
  ter exatamente três. Se um jogador não puder colocar sem formar uma fileira,
  ele passa a mover e o que restava na mão é descartado.
- **Fanorona.** Um passo por vez — o livro não descreve sequências. Uma fileira
  é capturada enquanto for contínua.
- **Sz’kwa.** Uma colocação captura os grupos adversários que ela deixa sem
  vizinho livre. Um grupo que o próprio dono fechou nunca mais é examinado, então
  fica a salvo para sempre (figura 22.4). A partida termina quando o tabuleiro
  enche ou quando o jogador da vez não tem mais peças.

### Erros de impressão do livro

Encontrados ao reproduzir cada figura e registro; `tests/book.test.js` fixa
cada um, e os exemplos trazem as versões corrigida e impressa.

| Onde | Impresso | O que a figura e as regras dão |
| --- | --- | --- |
| p. 132, figura 5.6, caso 2 | `b3 – b5 (x b2)` | a peça saltada é b4 |
| p. 132, figura 5.6, caso 3 | `e3 – e5 – c3 (x e4 d3)` | as peças saltadas são e4 e d4 |
| p. 140, Tonkin, jogada 4 | `c3` para as pretas | c2 — o centro é proibido durante a colocação, e as pretas jogam depois `c2 – c3` |
| p. 140, Tonkin, jogada 6 | `d5 – d4` | d5 – c5: d4 é peça das próprias brancas e a figura 7.4 tem a peça em c5 |
| p. 153, Tic Tackle, jogada 2 | `e5 – d4` para as brancas | e5 é uma peça preta (e as pretas fazem a mesma jogada um lance depois) |
| p. 160, figura 12.3 | "coiote bloqueado" | o coiote ainda pode saltar c1 ou b2: d1 e b3 estão livres |
| p. 126, figura 4.4 | "movimento realizado pelo jogador 1" | com 14 posições bloqueadas é a 14ª jogada, que é do jogador 2 |

## Testes

```sh
node tests/run.mjs            # 379 testes, cerca de 3 segundos
node tests/run.mjs book       # só os arquivos cujo nome contém o termo
node tests/ui.mjs             # a própria página, no Chrome headless
```

ou abra `http://localhost:8000/tests/` para rodar os mesmos arquivos no
navegador. O Node só é usado para os testes e, opcionalmente, para
`npm start`; o visualizador em si só precisa de um servidor estático.

| Arquivo | O que verifica |
| --- | --- |
| `tests/parser.test.js` | todas as formas de escrever uma jogada |
| `tests/state.test.js` | o tabuleiro, o registro dos jogos, cabeçalhos de posição, numeração, `#` |
| `tests/book.test.js` | **o livro**: cada figura que mostra uma jogada e cada registro impresso, capítulo por capítulo — e os seus erros de impressão |
| `tests/samples.test.js` | cada exemplo da página é reproduzido sem aviso |
| `tests/input.test.js` | toda jogada legal de cada jogo pode ser feita com cliques, e nada além disso |
| `tests/fuzz.test.js` | milhares de partidas aleatórias: uma partida legal nunca recebe aviso, uma jogada ilegal nunca passa, peças não são criadas nem perdidas |
| `tests/ui.mjs` | num navegador de verdade: cada demonstração carrega sem aviso, cada jogo é jogado com cliques reais do mouse e desfeito, teclado, layout em três larguras (pula a si mesmo quando não há Chrome ou Chromium instalado) |

Cada jogo é descrito duas vezes no seu módulo — `legalMoves` lista o que as
regras permitem, `play` executa o que o registro disser e indica a regra
desrespeitada — e os testes aleatórios fazem um conferir o outro.

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `index.html` | marcação |
| `css/style.css` | estilos |
| `js/coords.js` | nomes das posições e geometria do tabuleiro |
| `js/rules.js` | códigos das peças, o estado de cada lance, mecânicas comuns a vários jogos |
| `js/games/*.js` | um módulo por capítulo: posição, jogadas legais, execução, texto das regras |
| `js/parser.js` | analisador léxico: jogadas, comentários, cabeçalhos |
| `js/state.js` | registro dos jogos, cabeçalhos de posição, a linha do tempo: um estado completo por lance |
| `js/board.js` | grade em SVG + peças em DOM sobrepostas, animação, destaques |
| `js/input.js` | jogar com cliques |
| `js/app.js` | controlador e reprodução |
| `js/sample.js` | os exemplos |
| `tools/selfplay.mjs` | o pequeno motor que gerou as partidas de demonstração |
| `tools/serve.mjs` | `npm start`: serve a pasta em qualquer sistema |
| `tests/` | os testes |

Acrescentar um jogo é um arquivo em `js/games/` e uma linha em
`js/games/index.js`.

## Notas de projeto

**Navegação em O(1).** `buildTimeline()` guarda um estado completo depois de
cada lance — um `Uint8Array(25)` para o tabuleiro e alguns números (lado que
joga, peças na mão, capturas, fase, resultado). Avançar ou voltar, arrastar a
linha do tempo e clicar num lance da lista são uma única consulta a um array;
nada é reproduzido de novo.

**A visualização não conhece regras.** Cada lance traz uma pequena descrição do
que faz na tela — peças que se deslocam (com o seu caminho), peças que
aparecem, peças que saem — e o tabuleiro anima isso, para a frente ou para
trás. Um bloqueio lançado no Amazonas, um tigre pousando sobre uma vaca, um par
entrando no Seega são as mesmas três primitivas.

**Desenho leve.** A arte do tabuleiro (25 pontos, 5 horizontais, 5 verticais, 2
diagonais longas e 4 pequenas, legendas) é um único SVG construído uma vez. As
peças são no máximo 25 elementos DOM, posicionados só com `transform` e
animados pela Web Animations API — com uma alternativa em transição CSS quando
`Element.animate` não existe. Uma captura múltipla é animada trecho a trecho
pelo seu caminho real. Sem desfoques, sombras ou filtros. `prefers-reduced-motion`
é respeitado: as jogadas então mudam sem animação.

**Geometria do tabuleiro.** Só há diagonais nos pontos em que coluna + fileira é
par, o que gera as duas diagonais longas e as quatro pequenas a partir de uma
única regra. Um passo diagonal preserva essa paridade, então um Mullah
deslizando numa direção nunca "dobra a esquina" onde as diagonais pequenas se
encontram, em a3/c1/e3/c5.

## Partidas de demonstração

Onde o livro traz uma partida, a demonstração é essa partida — completa nos
capítulos 2, 6 e 7 (este com os seus dois erros de impressão corrigidos), e
levada até o fim nos capítulos 8, 9 e 11, em que o livro para depois de poucas
jogadas. As demais foram geradas por `tools/selfplay.mjs`, um minimax raso
sobre as jogadas legais de cada jogo (capturas obrigatórias respeitadas, maior
captura primeiro), depois comentadas à mão e reproduzidas no visualizador para
confirmar que não geram aviso.

```sh
node tools/selfplay.mjs fanorona --seed 11          # uma partida, no formato do livro
node tools/selfplay.mjs halma --scan 20             # um resumo de vinte
node tools/selfplay.mjs amazonas --from "1. c1 - a1 - d4  e3 - c1 - b2"
```

As duas demonstrações originais não mudaram. A do Alquerque termina em
`c1 - e3 - e5 - c3 (x d2 e4 d4)`, três peças numa só jogada. A do Fetaix promove
com `b4 - a5 [Mullah]` e depois joga `a5 - d2`, quatro pontos abaixo pela
diagonal longa.

## Desde a versão só com o Alquerque

A primeira versão cobria apenas o capítulo 5: o Alquerque nas suas três etapas
(Alquerque, Alquerque + promoção, Fetaix). Tudo o que ela fazia continua aqui;
o seletor *Rules* virou *Game*, com os mesmos três ids para as três etapas. No
caminho, algumas coisas foram corrigidas:

- o tabuleiro não ficava quadrado numa janela larga (crescia mais alto que a
  grade);
- `c3→b4`, a forma que o próprio livro apresenta na p. 112, não era lida;
- a marca da posição de destino ficava escondida sob a peça;
- *Play* ficava desabilitado no fim de um registro em vez de recomeçar;
- um `#` aparecia duas vezes na lista de lances;
- `prefers-reduced-motion` não interrompia as animações principais.

Um comportamento mudou de propósito: uma lista de captura escrita prevalecia
sobre o tabuleiro. Agora só prevalece quando a captura é escolha do jogador —
caso contrário, a própria figura 5.6 do livro removeria as peças erradas.
