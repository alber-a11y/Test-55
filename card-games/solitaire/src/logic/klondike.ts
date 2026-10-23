import { makeDeck, type Suit } from '@shared/cards/card';
import { Rng } from '@shared/core/rng';
import { History, isRedSuit, type Hint, type MoveRef, type Pile, type PileGame, type SCard } from './piles';

export interface KlondikeSave {
  mode: 'klondike';
  seed: number;
  draw: 1 | 3;
  piles: Pile[];
  score: number;
  moves: number;
  passes: number;
  time: number;
}

export class Klondike implements PileGame {
  readonly mode = 'klondike';
  piles: Pile[] = [];
  score = 0;
  moves = 0;
  passes = 0;
  /** Elapsed play time (ms), maintained by the scene. */
  time = 0;
  private hist = new History();

  constructor(readonly seed: number, readonly drawCount: 1 | 3, save?: KlondikeSave) {
    if (save) {
      this.piles = save.piles;
      this.score = save.score;
      this.moves = save.moves;
      this.passes = save.passes;
      this.time = save.time;
      return;
    }
    const deck = new Rng(seed).shuffle(makeDeck(1)).map((c): SCard => ({ ...c, up: false }));
    const mk = (id: string, kind: Pile['kind'], index: number): Pile => ({ id, kind, index, cards: [] });
    this.piles.push(mk('stock', 'stock', 0), mk('waste', 'waste', 0));
    for (let i = 0; i < 4; i++) this.piles.push(mk(`f${i}`, 'found', i));
    for (let i = 0; i < 7; i++) this.piles.push(mk(`t${i}`, 'tab', i));
    for (let i = 0; i < 7; i++)
      for (let j = i; j < 7; j++) {
        const c = deck.pop()!;
        c.up = j === i;
        this.pile(`t${j}`).cards.push(c);
      }
    this.pile('stock').cards = deck;
  }

  static restore(s: KlondikeSave): Klondike {
    return new Klondike(s.seed, s.draw, s);
  }

  serialize(): KlondikeSave {
    return { mode: 'klondike', seed: this.seed, draw: this.drawCount, piles: this.piles, score: this.score, moves: this.moves, passes: this.passes, time: this.time };
  }

  pile(id: string): Pile {
    return this.piles.find((p) => p.id === id)!;
  }

  get tabs(): Pile[] {
    return this.piles.filter((p) => p.kind === 'tab');
  }
  get founds(): Pile[] {
    return this.piles.filter((p) => p.kind === 'found');
  }

  canPick(id: string, index: number): boolean {
    const p = this.pile(id);
    if (index < 0 || index >= p.cards.length) return false;
    if (p.kind === 'waste' || p.kind === 'found') return index === p.cards.length - 1;
    if (p.kind === 'tab') return p.cards[index].up;
    return false;
  }

  private fitsFound(c: SCard, f: Pile): boolean {
    const top = f.cards[f.cards.length - 1];
    return top ? top.suit === c.suit && top.rank === c.rank - 1 : c.rank === 1;
  }

  private fitsTab(c: SCard, t: Pile): boolean {
    const top = t.cards[t.cards.length - 1];
    if (!top) return c.rank === 13;
    return top.up && isRedSuit(top.suit) !== isRedSuit(c.suit) && top.rank === c.rank + 1;
  }

  canMove(m: MoveRef): boolean {
    if (m.from === m.to || !this.canPick(m.from, m.index)) return false;
    const src = this.pile(m.from);
    const dst = this.pile(m.to);
    const c = src.cards[m.index];
    if (dst.kind === 'found') return m.index === src.cards.length - 1 && this.fitsFound(c, dst);
    if (dst.kind === 'tab') return this.fitsTab(c, dst);
    return false;
  }

  move(m: MoveRef): boolean {
    if (!this.canMove(m)) return false;
    this.hist.push(this.piles, this.score, this.moves, this.passes);
    const src = this.pile(m.from);
    const dst = this.pile(m.to);
    const moved = src.cards.splice(m.index);
    dst.cards.push(...moved);
    if (dst.kind === 'found') this.score += 10;
    else if (src.kind === 'waste') this.score += 5;
    if (src.kind === 'found') this.score = Math.max(0, this.score - 15);
    const top = src.cards[src.cards.length - 1];
    if (src.kind === 'tab' && top && !top.up) {
      top.up = true;
      this.score += 5;
    }
    this.moves++;
    return true;
  }

  get canDraw(): boolean {
    return this.pile('stock').cards.length > 0 || this.pile('waste').cards.length > 0;
  }

  draw(): boolean {
    const st = this.pile('stock');
    const wa = this.pile('waste');
    if (!st.cards.length && !wa.cards.length) return false;
    this.hist.push(this.piles, this.score, this.moves, this.passes);
    if (st.cards.length) {
      for (let k = 0; k < this.drawCount && st.cards.length; k++) {
        const c = st.cards.pop()!;
        c.up = true;
        wa.cards.push(c);
      }
    } else {
      st.cards = wa.cards.reverse().map((c) => ({ ...c, up: false }));
      wa.cards = [];
      this.passes++;
      this.score = Math.max(0, this.score - (this.drawCount === 1 ? 100 : 20));
    }
    this.moves++;
    return true;
  }

  get canUndo(): boolean {
    return this.hist.size > 0;
  }

  undo(): boolean {
    const s = this.hist.pop();
    if (!s) return false;
    this.piles = s.piles;
    this.score = s.score;
    this.moves = s.moves;
    this.passes = s.extra as number;
    return true;
  }

  autoTarget(id: string, index: number): string | null {
    if (!this.canPick(id, index)) return null;
    const src = this.pile(id);
    const c = src.cards[index];
    if (index === src.cards.length - 1) for (const f of this.founds) if (this.canMove({ from: id, index, to: f.id })) return f.id;
    let empty: string | null = null;
    for (const t of this.tabs) {
      if (!this.canMove({ from: id, index, to: t.id })) continue;
      if (t.cards.length) return t.id;
      // King already at the bottom of a column: moving it to another empty column is pointless.
      if (!(src.kind === 'tab' && index === 0)) empty ??= t.id;
    }
    if (empty && c.rank === 13) return empty;
    return null;
  }

  get won(): boolean {
    return this.founds.every((f) => f.cards.length === 13);
  }

  get canAutoComplete(): boolean {
    if (this.won) return false;
    if (this.pile('stock').cards.length || this.pile('waste').cards.length > 1) return false;
    return this.tabs.every((t) => t.cards.every((c) => c.up));
  }

  autoStep(): MoveRef | null {
    const sources = [this.pile('waste'), ...this.tabs];
    let best: MoveRef | null = null;
    let bestRank = 99;
    for (const s of sources) {
      if (!s.cards.length) continue;
      const i = s.cards.length - 1;
      for (const f of this.founds) {
        if (this.canMove({ from: s.id, index: i, to: f.id }) && s.cards[i].rank < bestRank) {
          best = { from: s.id, index: i, to: f.id };
          bestRank = s.cards[i].rank;
        }
      }
    }
    return best;
  }

  get stuck(): boolean {
    if (this.won) return false;
    return solveKlondike(this, 4000).result === 'unsolvable';
  }

  hint(): Hint {
    const r = solveKlondike(this, 12_000);
    if (r.first) return r.first;
    // Heuristic fallback.
    const fm = this.autoStep();
    if (fm) return { t: 'move', m: fm };
    for (const t of this.tabs) {
      const i = t.cards.findIndex((c) => c.up);
      if (i > 0) for (const d of this.tabs) if (this.canMove({ from: t.id, index: i, to: d.id })) return { t: 'move', m: { from: t.id, index: i, to: d.id } };
    }
    const w = this.pile('waste');
    if (w.cards.length) {
      const to = this.autoTarget('waste', w.cards.length - 1);
      if (to) return { t: 'move', m: { from: 'waste', index: w.cards.length - 1, to } };
    }
    return this.canDraw ? { t: 'draw' } : null;
  }
}

/* ------------------------------------------------------------------ */
/* Solver                                                              */
/* ------------------------------------------------------------------ */

interface KS {
  down: number[][];
  up: number[][];
  found: number[]; // top rank per suit
  stock: number[]; // top = last
  waste: number[]; // top = last
}

type KMove =
  | { k: 'tf'; t: number }
  /** Play talon card: after `draws` stock clicks, the waste top goes to foundation (t = -1) or tableau t. */
  | { k: 'talon'; draws: number; t: number }
  | { k: 'tt'; s: number; i: number; t: number };

/**
 * Depth-first Klondike solver. Talon cards reachable by drawing are played directly
 * (draw sequences collapse into one move), safe foundation moves are forced, whole-run
 * tableau moves only when they reveal something. Sound but incomplete: "solved" is real.
 */
export function solveKlondike(game: Klondike, nodeLimit = 60_000): { result: 'solved' | 'unsolvable' | 'unknown'; first: Hint; nodes: number } {
  const suitOf: Suit[] = [];
  const rankOf: number[] = [];
  for (const p of game.piles) for (const c of p.cards) {
    suitOf[c.id] = c.suit;
    rankOf[c.id] = c.rank;
  }
  const red = (id: number) => isRedSuit(suitOf[id]);
  const st: KS = {
    down: game.tabs.map((t) => t.cards.filter((c) => !c.up).map((c) => c.id)),
    up: game.tabs.map((t) => t.cards.filter((c) => c.up).map((c) => c.id)),
    found: [0, 0, 0, 0],
    stock: game.pile('stock').cards.map((c) => c.id),
    waste: game.pile('waste').cards.map((c) => c.id),
  };
  for (const f of game.founds) for (const c of f.cards) st.found[c.suit] = Math.max(st.found[c.suit], c.rank);
  const draw = game.drawCount;
  const seen = new Set<string>();
  let nodes = 0;
  let first: KMove | null = null;
  let aborted = false;

  const key = (s: KS) => {
    const cols = s.down.map((d, i) => d.length + ':' + s.up[i].join(',')).sort().join('/');
    return cols + '|' + s.found.join(',') + '|' + s.stock.join(',') + '|' + s.waste.join(',');
  };
  const fitsTab = (id: number, t: number, s: KS) => {
    const u = s.up[t];
    if (!u.length) return s.down[t].length === 0 && rankOf[id] === 13;
    const top = u[u.length - 1];
    return red(top) !== red(id) && rankOf[top] === rankOf[id] + 1;
  };
  const fitsFound = (id: number, s: KS) => s.found[suitOf[id]] === rankOf[id] - 1;
  /** A foundation move nothing could ever need back. */
  const safeFound = (id: number, s: KS) => {
    if (!fitsFound(id, s)) return false;
    const r = rankOf[id];
    if (r <= 2) return true;
    const opp = red(id) ? [0, 3] : [1, 2];
    return s.found[opp[0]] >= r - 1 && s.found[opp[1]] >= r - 1;
  };

  const clone = (s: KS): KS => ({ down: s.down.map((d) => d.slice()), up: s.up.map((u) => u.slice()), found: s.found.slice(), stock: s.stock.slice(), waste: s.waste.slice() });
  const reveal = (n: KS, t: number) => {
    if (!n.up[t].length && n.down[t].length) n.up[t].push(n.down[t].pop()!);
  };
  const drawOnce = (n: KS) => {
    if (n.stock.length) for (let k = 0; k < draw && n.stock.length; k++) n.waste.push(n.stock.pop()!);
    else {
      n.stock = n.waste.reverse();
      n.waste = [];
    }
  };

  /** Talon tops reachable by drawing (one full cycle and a bit), with the draw count needed. */
  const talonTops = (s: KS): { draws: number; id: number }[] => {
    const out: { draws: number; id: number }[] = [];
    const seenIds = new Set<number>();
    const n: KS = { down: s.down, up: s.up, found: s.found, stock: s.stock.slice(), waste: s.waste.slice() };
    const total = n.stock.length + n.waste.length;
    if (!total) return out;
    const maxDraws = Math.ceil(total / draw) * 2 + 2;
    for (let d = 0; d <= maxDraws; d++) {
      const top = n.waste[n.waste.length - 1];
      if (top !== undefined && !seenIds.has(top)) {
        seenIds.add(top);
        out.push({ draws: d, id: top });
      }
      drawOnce(n);
    }
    return out;
  };

  /** Apply forced safe foundation moves in place. */
  const autoSafe = (n: KS) => {
    let moved = true;
    while (moved) {
      moved = false;
      for (let t = 0; t < 7; t++) {
        const u = n.up[t];
        if (u.length && safeFound(u[u.length - 1], n)) {
          const id = u.pop()!;
          n.found[suitOf[id]] = rankOf[id];
          reveal(n, t);
          moved = true;
        }
      }
      const w = n.waste[n.waste.length - 1];
      if (w !== undefined && safeFound(w, n)) {
        n.waste.pop();
        n.found[suitOf[w]] = rankOf[w];
        moved = true;
      }
    }
  };

  const gen = (s: KS): KMove[] => {
    const out: KMove[] = [];
    for (let t = 0; t < 7; t++) {
      const u = s.up[t];
      if (u.length && fitsFound(u[u.length - 1], s)) out.push({ k: 'tf', t });
    }
    for (let t = 0; t < 7; t++) {
      const u = s.up[t];
      if (!u.length) continue;
      for (let d = 0; d < 7; d++) {
        if (d === t) continue;
        if (fitsTab(u[0], d, s) && (s.down[t].length > 0 || (s.up[d].length > 0 && rankOf[u[0]] !== 13))) out.push({ k: 'tt', s: t, i: 0, t: d });
        for (let i = 1; i < u.length; i++) if (fitsTab(u[i], d, s) && fitsFound(u[i - 1], s)) out.push({ k: 'tt', s: t, i, t: d });
      }
    }
    for (const { draws, id } of talonTops(s)) {
      if (fitsFound(id, s)) out.push({ k: 'talon', draws, t: -1 });
      for (let t = 0; t < 7; t++) if (fitsTab(id, t, s)) out.push({ k: 'talon', draws, t });
    }
    return out;
  };

  const apply = (s: KS, m: KMove): KS => {
    const n = clone(s);
    switch (m.k) {
      case 'tf': {
        const id = n.up[m.t].pop()!;
        n.found[suitOf[id]] = rankOf[id];
        reveal(n, m.t);
        break;
      }
      case 'talon': {
        for (let d = 0; d < m.draws; d++) drawOnce(n);
        const id = n.waste.pop()!;
        if (m.t < 0) n.found[suitOf[id]] = rankOf[id];
        else n.up[m.t].push(id);
        break;
      }
      case 'tt': {
        const run = n.up[m.s].splice(m.i);
        n.up[m.t].push(...run);
        reveal(n, m.s);
        break;
      }
    }
    autoSafe(n);
    return n;
  };

  const done = (s: KS) => s.found.every((f) => f === 13) || (s.down.every((d) => d.length === 0) && s.stock.length + s.waste.length <= 1);

  const dfs = (s: KS, depth: number): boolean => {
    if (done(s)) return true;
    if (++nodes > nodeLimit) {
      aborted = true;
      return false;
    }
    const k = key(s);
    if (seen.has(k)) return false;
    seen.add(k);
    for (const m of gen(s)) {
      if (dfs(apply(s, m), depth + 1)) {
        if (depth === 0) first = m;
        return true;
      }
      if (aborted) return false;
    }
    return false;
  };

  // The root keeps forced moves visible so the first hint is a real, playable move.
  const rootDone = done(st);
  const ok = rootDone || dfs(st, 0);
  const toHint = (m: KMove | null): Hint => {
    if (!m) return null;
    switch (m.k) {
      case 'talon': {
        if (m.draws > 0) return { t: 'draw' };
        const wi = game.pile('waste').cards.length - 1;
        const to = m.t < 0 ? game.founds.find((f) => game.canMove({ from: 'waste', index: wi, to: f.id }))?.id : `t${m.t}`;
        return to ? { t: 'move', m: { from: 'waste', index: wi, to } } : null;
      }
      case 'tf': {
        const p = game.pile(`t${m.t}`);
        const to = game.founds.find((f) => game.canMove({ from: p.id, index: p.cards.length - 1, to: f.id }));
        return to ? { t: 'move', m: { from: p.id, index: p.cards.length - 1, to: to.id } } : null;
      }
      case 'tt': {
        const p = game.pile(`t${m.s}`);
        const firstUp = p.cards.findIndex((c) => c.up);
        return { t: 'move', m: { from: p.id, index: firstUp + m.i, to: `t${m.t}` } };
      }
    }
  };
  // When forced safe moves exist at the root, hint them first.
  let hint: Hint = null;
  if (ok) {
    const safe = game.autoStep();
    if (safe) {
      const c = game.pile(safe.from).cards[safe.index];
      const tmp = clone(st);
      if (safeFound(c.id, tmp)) hint = { t: 'move', m: safe };
    }
    hint ??= toHint(first);
  }
  return { result: ok ? 'solved' : aborted ? 'unknown' : 'unsolvable', first: hint, nodes };
}

/** Find a deal (starting at `seed`) that the solver proves winnable. */
export function findSolvableKlondike(seed: number, draw: 1 | 3, tries = 30, budget = 15_000): number {
  for (let k = 0; k < tries; k++) {
    const s = (seed + k * 7919) >>> 0;
    if (solveKlondike(new Klondike(s, draw), budget).result === 'solved') return s;
  }
  return seed;
}
