/**
 * board.js — rendering and animation.
 *
 * The static artwork (25 nodes, 5 horizontals, 5 verticals, 2 long diagonals,
 * 4 short diagonals, coordinate labels) is one SVG built once; a game may add
 * a few marks of its own to it (destinations, starting sides). The pieces are
 * DOM elements in an overlay, moved with `transform` only, so the browser can
 * keep them on the compositor. At most 25 exist.
 *
 * The view knows nothing about rules. A ply arrives as an `fx` record —
 * pieces that travel, pieces that appear, pieces that leave — and is played
 * forwards or backwards from that alone.
 */

import { CELLS, LINES, FILES, colOf, rowOf, toSquare } from './coords.js';
import { ownerOf, isKing, BLOCK } from './rules.js';

const NS = 'http://www.w3.org/2000/svg';
const PAD = 13;        // viewBox units from the edge to the first node
const STEP = 18.5;     // viewBox units between nodes
const PIECE = 0.118;   // diameter of a piece, as a fraction of the board's side
const HAS_WAAPI = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

const vx = (index) => PAD + colOf(index) * STEP;
const vy = (index) => PAD + (4 - rowOf(index)) * STEP;   // rank 1 at the bottom

/** Where node `index` sits on the board, as fractions of its side. */
export const nodeAt = (index) => ({ x: vx(index) / 100, y: vy(index) / 100 });

function svgEl(name, attrs, text) {
  const el = document.createElementNS(NS, name);
  for (const key in attrs) el.setAttribute(key, attrs[key]);
  if (text !== undefined) el.textContent = text;
  return el;
}

export class BoardView {
  /**
   * @param {HTMLElement} root  container that already has `position: relative`
   * @param {{onPick?: (index: number) => void}} [options]
   */
  constructor(root, options) {
    this.root = root;
    this.onPick = (options && options.onPick) || null;
    this.pieces = new Map();     // square index -> HTMLElement
    this.size = 0;               // current pixel side of the board
    this.pieceSize = 0;
    this.timer = 0;
    this.marks = [];             // [{ index, kind }] — the last move
    this.hints = [];             // [{ index, kind }] — board input
    this.moving = [];            // elements lifted above the others

    this.art = this._buildSvg();
    root.appendChild(this.art);

    this.layer = document.createElement('div');
    this.layer.className = 'piece-layer';
    root.appendChild(this.layer);

    this.overlay = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', class: 'board-overlay' });
    root.appendChild(this.overlay);

    root.addEventListener('click', (e) => this._click(e));

    this._measure();
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._onResize());
      this._ro.observe(root);
    } else {
      window.addEventListener('resize', () => this._onResize());
    }
  }

  // ------------------------------------------------------------- static art
  _buildSvg() {
    const svg = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true', class: 'board-art' });

    for (const [a, b, kind] of LINES) {
      svg.appendChild(svgEl('line', {
        x1: vx(a), y1: vy(a), x2: vx(b), y2: vy(b),
        class: kind === 'diag' ? 'grid-line diag' : 'grid-line'
      }));
    }

    for (let i = 0; i < CELLS; i++) {
      svg.appendChild(svgEl('circle', { cx: vx(i), cy: vy(i), r: 1.1, class: 'node' }));
    }

    // What a game adds to the bare board goes above the nodes, below the pieces.
    this.decor = svgEl('g', { class: 'decor' });
    svg.appendChild(this.decor);
    for (let c = 0; c < 5; c++) svg.appendChild(svgEl('text', { x: PAD + c * STEP, y: 98.2, class: 'label' }, FILES[c]));
    for (let r = 0; r < 5; r++) svg.appendChild(svgEl('text', { x: 3.4, y: PAD + (4 - r) * STEP + 1.2, class: 'label' }, String(r + 1)));

    return svg;
  }

  /**
   * The marks a game adds to the bare board:
   *   { index, kind: 'zone', side }            a starting side to be reached
   *   { index, kind: 'goal', text, caption }   a destination (Rastros)
   */
  setGame(game) {
    this.root.className = 'board g-' + game.id;
    this.decor.textContent = '';
    for (const d of game.decor ? game.decor() : []) {
      const x = vx(d.index), y = vy(d.index);
      if (d.kind === 'zone') {
        this.decor.appendChild(svgEl('circle', { cx: x, cy: y, r: 7.3, class: 'zone s' + d.side }));
      } else if (d.kind === 'goal') {
        this.decor.appendChild(svgEl('circle', { cx: x, cy: y, r: 4.6, class: 'goal' }));
        this.decor.appendChild(svgEl('circle', { cx: x, cy: y, r: 2.6, class: 'goal-disc' }));
        this.decor.appendChild(svgEl('text', { x, y: y + 1.5, class: 'goal-num' }, d.text));
        // The caption sits towards the middle of the board, clear of the edge.
        const below = rowOf(d.index) >= 3;
        const anchor = colOf(d.index) >= 3 ? 'end' : 'start';
        const cx = x + (colOf(d.index) >= 3 ? -5.4 : 5.4);
        this.decor.appendChild(svgEl('text', {
          x: cx, y: y + (below ? 7.2 : -5.6), class: 'goal-cap', 'text-anchor': anchor
        }, d.caption));
      }
    }
  }

  // -------------------------------------------------------------- geometry
  _measure() {
    this.size = this.root.clientWidth || 320;
    this.pieceSize = Math.max(12, Math.round(this.size * PIECE));
    this.layer.style.setProperty('--piece-size', this.pieceSize + 'px');
  }

  _onResize() {
    const before = this.size;
    this._measure();
    if (before === this.size) return;
    for (const [idx, el] of this.pieces) el.style.transform = this._t(idx);
    this._place(this.marks, 'marker');
    this._place(this.hints, 'hint');
  }

  /** Top-left pixel position that centres a piece on node `index`. */
  _xy(index) {
    const k = this.size / 100;
    const half = this.pieceSize / 2;
    return { x: vx(index) * k - half, y: vy(index) * k - half };
  }

  _t(index) {
    const p = this._xy(index);
    return `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }

  // ------------------------------------------------------------ reconciler
  /** Make the DOM match `board` exactly, ignoring squares in `skip`. */
  sync(board, skip) {
    for (let i = 0; i < CELLS; i++) {
      if (skip && skip.has(i)) continue;
      const code = board[i];
      const el = this.pieces.get(i);

      if (!code) {
        if (el) { el.remove(); this.pieces.delete(i); }
        continue;
      }
      if (el) this._dress(el, code, i);
      else this.pieces.set(i, this._create(code, i));
    }
  }

  _create(code, index) {
    const el = document.createElement('div');
    this._dress(el, code, index);
    el.style.transform = this._t(index);
    this.layer.appendChild(el);
    return el;
  }

  _dress(el, code, index) {
    el.className = code === BLOCK ? 'piece block'
      : 'piece p' + ownerOf(code) + (isKing(code) ? ' king' : '');
    el.title = toSquare(index);
  }

  // ------------------------------------------------------------- animation
  _cancel() {
    if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
    for (const el of this.layer.querySelectorAll('.piece.leaving')) el.remove();
    for (const el of this.moving) el.style.zIndex = '';
    this.moving = [];
    if (HAS_WAAPI) {
      for (const el of this.pieces.values()) {
        if (el.getAnimations) for (const a of el.getAnimations()) a.cancel();
      }
    }
    for (const el of this.pieces.values()) { el.classList.remove('tween'); el.style.opacity = ''; }
  }

  /**
   * Show `board` immediately, cancelling anything in flight.
   * Used for jumps in the timeline (First / Last / scrubbing).
   */
  show(board) {
    this._cancel();
    this.sync(board);
  }

  /**
   * Animate one ply. `dir` is +1 (forward) or -1 (undo).
   * `target` is the board we must end on.
   */
  play(fx, target, dir, duration) {
    this._cancel();
    if (!fx || duration <= 0 || !(fx.moves.length || fx.adds.length || fx.removes.length)) {
      this.sync(target);
      return;
    }
    const skip = new Set();

    if (dir > 0) {
      for (const r of fx.removes) this._leave(r.index, duration, skip);
      for (const m of fx.moves) this._travel(m.route, m, m.t0 || 0, m.t1 == null ? 1 : m.t1, duration, skip);
      for (const a of fx.adds) this._appear(a.index, a.code, a.from, a.t0 || 0, duration, skip);
    } else {
      for (const a of fx.adds) this._leave(a.index, duration, skip, a.from, 1 - (a.t0 || 0));
      for (let n = fx.moves.length - 1; n >= 0; n--) {
        const m = fx.moves[n];
        const t0 = m.t0 || 0, t1 = m.t1 == null ? 1 : m.t1;
        this._travel(m.route.slice().reverse(), m, 1 - t1, 1 - t0, duration, skip);
      }
      for (const r of fx.removes) this._appear(r.index, r.code, undefined, 0, duration, skip);
    }

    // Everything else snaps into place, then we settle exactly.
    this.sync(target, skip);
    this.timer = setTimeout(() => {
      this.timer = 0;
      for (const el of this.layer.querySelectorAll('.piece.leaving')) el.remove();
      for (const el of this.moving) el.style.zIndex = '';
      this.moving = [];
      for (const el of this.pieces.values()) { el.classList.remove('tween'); el.style.opacity = ''; }
      this.sync(target);
    }, duration + 30);
  }

  /** The piece on `index` fades away — or flies off to `to` first. */
  _leave(index, duration, skip, to, t1) {
    skip.add(index);
    const el = this.pieces.get(index);
    if (!el) return;
    this.pieces.delete(index);
    el.classList.add('leaving');

    if (!HAS_WAAPI) {
      el.classList.add('tween');
      el.style.setProperty('--anim', duration + 'ms');
      requestAnimationFrame(() => { el.style.opacity = '0'; });
      return;
    }
    el.style.opacity = '0';
    if (to == null) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'linear', fill: 'none' });
    } else {
      const a = this._t(index), b = this._t(to);
      el.animate([
        { transform: a, opacity: 1, offset: 0, easing: 'ease-in' },
        { transform: b, opacity: 1, offset: t1 * 0.999 },
        { transform: b, opacity: 0, offset: t1 },
        { transform: b, opacity: 0, offset: 1 }
      ], { duration, fill: 'none' });
    }
  }

  /** A piece of `code` shows up on `index` — fading in, or thrown there from `from`. */
  _appear(index, code, from, t0, duration, skip) {
    skip.add(index);
    if (this.pieces.get(index)) return;
    const el = this._create(code, index);
    this.pieces.set(index, el);

    if (!HAS_WAAPI) {
      el.style.opacity = '0';
      // Two frames so the initial opacity is committed before the transition.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.classList.add('tween');
        el.style.setProperty('--anim', duration + 'ms');
        el.style.opacity = '1';
      }));
      return;
    }
    if (from == null) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'linear', fill: 'none' });
    } else {
      const a = this._t(from), b = this._t(index);
      const frames = [{ transform: a, opacity: 0, offset: 0 }];
      if (t0 > 0) frames.push({ transform: a, opacity: 0, offset: t0 * 0.999 });
      frames.push({ transform: a, opacity: 1, offset: Math.max(t0, 0.001), easing: 'ease-out' });
      frames.push({ transform: b, opacity: 1, offset: 1 });
      el.animate(frames, { duration, fill: 'none' });
    }
  }

  /** The piece on route[0] goes to the end of `route` during [t0, t1] of the ply. */
  _travel(route, move, t0, t1, duration, skip) {
    const src = route[0];
    const dst = route[route.length - 1];
    skip.add(src);
    skip.add(dst);
    if (src === dst) return;
    const el = this.pieces.get(src);
    if (!el) return;

    const clash = this.pieces.get(dst);
    if (clash && clash !== el) clash.remove();
    this.pieces.delete(src);
    this.pieces.set(dst, el);
    el.style.zIndex = '3';
    this.moving.push(el);
    this._slide(el, route, duration, move.arc, t0, t1);
  }

  /** Animate along `route` (an array of node indices), arcing over each leg. */
  _slide(el, route, duration, arc, t0, t1) {
    const target = this._t(route[route.length - 1]);
    if (!HAS_WAAPI) {
      el.classList.add('tween');
      el.style.setProperty('--anim', duration + 'ms');
      requestAnimationFrame(() => { el.style.transform = target; });
      return;
    }

    const legs = route.length - 1;
    const span = t1 - t0;
    const whole = t0 <= 0 && t1 >= 1;
    const at = (p) => `translate(${p.x}px, ${p.y}px)`;
    const frames = [];

    if (!whole && t0 > 0) frames.push({ transform: at(this._xy(route[0])), offset: 0 });
    for (let n = 0; n < legs; n++) {
      const a = this._xy(route[n]);
      const b = this._xy(route[n + 1]);
      const frame = { transform: at(a), offset: t0 + span * (n / legs) };
      if (!whole) frame.easing = 'ease-in-out';
      frames.push(frame);
      if (arc) {
        const lift = Math.hypot(b.x - a.x, b.y - a.y) * 0.3 + this.pieceSize * 0.2;
        frames.push({
          transform: `translate(${(a.x + b.x) / 2}px, ${(a.y + b.y) / 2 - lift}px) scale(1.1)`,
          offset: t0 + span * ((n + 0.5) / legs)
        });
      }
    }
    const end = this._xy(route[route.length - 1]);
    frames.push({ transform: at(end), offset: t1 });
    if (!whole && t1 < 1) frames.push({ transform: at(end), offset: 1 });

    el.style.transform = target;      // stable end state even if the animation is cut
    el.animate(frames, {
      duration,
      // A chain of jumps runs at a steady pace so each hop reads separately.
      easing: !whole || legs > 1 ? 'linear' : (arc ? 'ease-in-out' : 'ease'),
      fill: 'none'
    });
  }

  // ------------------------------------------------------------- highlights
  /**
   * Mark the squares the last ply touched: where a piece came from and went
   * to, where pieces appeared, and where pieces were taken.
   */
  highlight(fx) {
    const marks = [];
    const seen = new Set();
    const add = (index, kind) => {
      if (index == null || index < 0 || seen.has(kind + index)) return;
      seen.add(kind + index);
      marks.push({ index, kind });
    };
    if (fx) {
      for (const r of fx.removes) if (!r.clash) add(r.index, 'hit');
      for (const m of fx.moves) { add(m.route[0], 'from'); add(m.route[m.route.length - 1], 'to'); }
      for (const a of fx.adds) add(a.index, a.code === BLOCK ? 'drop' : 'to');
    }
    this.marks = marks;
    this._place(marks, 'marker');
  }

  /**
   * Board input: which squares can be clicked next.
   *   kind 'pick'  a piece that may be chosen     'sel'   the piece chosen
   *        'to'    a free node to go to           'take'  a piece to be taken
   *        'stop'  the node to click again to end a chain of jumps
   */
  setHints(hints) {
    this.hints = hints || [];
    this.root.classList.toggle('input', this.hints.length > 0 || !!this.inputOn);
    this._place(this.hints, 'hint');
  }

  setInput(on) {
    this.inputOn = !!on;
    this.root.classList.toggle('input', this.inputOn);
  }

  _place(list, cls) {
    for (const el of this.layer.querySelectorAll('.' + cls)) el.remove();
    for (const item of list) {
      const el = document.createElement('div');
      el.className = cls + ' ' + item.kind;
      el.style.transform = this._t(item.index);
      this.layer.appendChild(el);
    }
  }

  /**
   * Lines and rings drawn above the pieces — the row that won, the rows that
   * scored, the side that was filled.
   *   { kind: 'line', cells, side? }   { kind: 'ring', index, side? }
   */
  setOverlay(items) {
    this.overlay.textContent = '';
    for (const it of items || []) {
      const cls = it.side ? ' s' + it.side : '';
      if (it.kind === 'line') {
        const a = it.cells[0], b = it.cells[it.cells.length - 1];
        this.overlay.appendChild(svgEl('line', { x1: vx(a), y1: vy(a), x2: vx(b), y2: vy(b), class: 'win-line' + cls }));
      } else {
        this.overlay.appendChild(svgEl('circle', { cx: vx(it.index), cy: vy(it.index), r: 7.3, class: 'win-ring' + cls }));
      }
    }
  }

  // ------------------------------------------------------------------ input
  /** The node nearest to a click, if the click is reasonably on it. */
  _click(e) {
    if (!this.onPick) return;
    const rect = this.root.getBoundingClientRect();
    if (!rect.width) return;
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    const col = Math.round((x - PAD) / STEP);
    const row = 4 - Math.round((y - PAD) / STEP);
    if (col < 0 || col > 4 || row < 0 || row > 4) return;
    const index = col + row * 5;
    if (Math.hypot(x - vx(index), y - vy(index)) > STEP * 0.48) return;
    this.onPick(index);
  }
}
