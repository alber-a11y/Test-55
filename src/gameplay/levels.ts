import { biomeForLevel } from '../data/biomes';
import { BOSS_IDS, ENEMIES, type BossId } from '../data/enemies';
import type { BiomeDef } from '../data/types';
import { Rng } from '../core/rng';

export const enum T {
  Floor = 0,
  Wall = 1,
  Crate = 2,
  Bush = 3,
  Water = 4,
  Barrel = 5,
}

export type ModId = 'meteors' | 'poison' | 'shrooms' | 'fog' | 'frenzy' | 'supercharge';
export const MODS: ModId[] = ['meteors', 'poison', 'shrooms', 'fog', 'frenzy', 'supercharge'];

export interface Difficulty {
  hp: number;
  dmg: number;
  aimErr: number;
  fireRate: number;
  speed: number;
}

export interface LevelConfig {
  n: number;
  biome: BiomeDef;
  w: number;
  h: number;
  tiles: T[];
  player: { c: number; r: number };
  spawns: { c: number; r: number }[];
  bossSpawn: { c: number; r: number };
  waves: string[][];
  boss: BossId;
  bossTier: number;
  mods: ModId[];
  diff: Difficulty;
  parTime: number;
}

/* Hand-made arenas for the first 10 levels (smooth learning curve). */
const HAND: string[][] = [
  [
    '........................',
    '...E.........E.......E..',
    '........................',
    '.....gg..........gg.....',
    '.....gg...####...gg.....',
    '..........#..#..........',
    '....cc..............cc..',
    '....cc....g..g......cc..',
    '..........gggg..........',
    '.....###........###.....',
    '........................',
    '..gg......cccc......gg..',
    '..gg................gg..',
    '...........P............',
    '........................',
  ],
  [
    '........................',
    '..E........E........E...',
    '........................',
    '...####..........####...',
    '...#................#...',
    '......ggg....ggg........',
    '..c...ggg....ggg....c...',
    '..c.................c...',
    '.........~~~~~~.........',
    '.........~~~~~~.........',
    '...gg..............gg...',
    '...gg....##..##....gg...',
    '.........#....#.........',
    '...........P............',
    '........................',
  ],
  [
    '..E..................E..',
    '...........E............',
    '....cccc........cccc....',
    '........................',
    '.g....#####..#####....g.',
    '.g....................g.',
    '.g........gggg........g.',
    '..........gggg..........',
    '...##..............##...',
    '...##.....b..b.....##...',
    '........................',
    '.....ggg........ggg.....',
    '.....ggg..####..ggg.....',
    '...........P............',
    '........................',
  ],
  [
    '...E........E........E..',
    '........................',
    '..~~~...gggggggg...~~~..',
    '..~~~..............~~~..',
    '........##....##........',
    '...cc...#......#...cc...',
    '...cc..............cc...',
    '.........gg..gg.........',
    '.........gg..gg.........',
    '...##..............##...',
    '...##....cccccc....##...',
    '........................',
    '..gggg............gggg..',
    '..gggg.....P......gggg..',
    '........................',
  ],
  [
    '..E.........E.........E.',
    '........................',
    '...#...#...#...#...#....',
    '........................',
    '..ggggg..........ggggg..',
    '..ggggg...cccc...ggggg..',
    '..........c..c..........',
    '.......#..........#.....',
    '.......#...gg.....#.....',
    '.......#...gg.....#.....',
    '...b..............b.....',
    '...b....~~~~~~~~..b.....',
    '........................',
    '...........P............',
    '........................',
  ],
  [
    '...E.......E.......E....',
    '........................',
    '.####..............####.',
    '.#....................#.',
    '.#...gg...cccc...gg...#.',
    '.....gg..........gg.....',
    '........##....##........',
    '...c....#......#....c...',
    '...c................c...',
    '.......gggg..gggg.......',
    '.......gggg..gggg.......',
    '..##................##..',
    '..##.....b....b.....##..',
    '...........P............',
    '........................',
  ],
  [
    '.E..........E.........E.',
    '........................',
    '....~~~..........~~~....',
    '....~~~...####...~~~....',
    '..........#..#..........',
    '..gg..................gg',
    '..gg...cc......cc.....gg',
    '..gg...cc......cc.....gg',
    '........................',
    '.....####......####.....',
    '........g......g........',
    '.......ggg....ggg.......',
    '........................',
    '...........P............',
    '........................',
  ],
  [
    '...E..........E......E..',
    '........................',
    '..cc..cc..cc..cc..cc....',
    '........................',
    '....######....######....',
    '........................',
    '.ggg......gggg......ggg.',
    '.ggg......gggg......ggg.',
    '........................',
    '...##~~~........~~~##...',
    '...##~~~........~~~##...',
    '........................',
    '....gg....b..b....gg....',
    '....gg.....P......gg....',
    '........................',
  ],
  [
    '..E.........E.........E.',
    '........................',
    '.....#....gggg....#.....',
    '.....#....gggg....#.....',
    '..cc.#............#.cc..',
    '..cc................cc..',
    '........##....##........',
    '..ggg...#......#...ggg..',
    '..ggg..............ggg..',
    '.........cc..cc.........',
    '...###...........###....',
    '.....................b..',
    '..b.....gggggg..........',
    '...........P............',
    '........................',
  ],
  [
    '.E.........E..........E.',
    '........................',
    '...gggg..........gggg...',
    '...gggg..#....#..gggg...',
    '.........#....#.........',
    '..###....#cccc#....###..',
    '........................',
    '.....~~~~......~~~~.....',
    '.....~~~~......~~~~.....',
    '........................',
    '..cc....###..###....cc..',
    '..cc................cc..',
    '.......gg......gg.......',
    '.......gg..P...gg.......',
    '........................',
  ],
];

const CHAR: Record<string, T> = { '.': T.Floor, '#': T.Wall, c: T.Crate, g: T.Bush, '~': T.Water, b: T.Barrel, P: T.Floor, E: T.Floor };

export const isBlocking = (t: T) => t === T.Wall || t === T.Crate || t === T.Barrel || t === T.Water;

function parseHand(rows: string[]) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const tiles: T[] = new Array(w * h).fill(T.Floor);
  let player = { c: Math.floor(w / 2), r: h - 2 };
  const spawns: { c: number; r: number }[] = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < w; c++) {
      const ch = row[c] ?? '.';
      tiles[r * w + c] = CHAR[ch] ?? T.Floor;
      if (ch === 'P') player = { c, r };
      if (ch === 'E') spawns.push({ c, r });
    }
  });
  return { w, h, tiles, player, spawns };
}

/** Flood fill reachability over walkable tiles. */
function reachable(tiles: T[], w: number, h: number, from: { c: number; r: number }): Uint8Array {
  const seen = new Uint8Array(w * h);
  const q = [from.r * w + from.c];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!;
    const c = i % w;
    const r = (i / w) | 0;
    const nb = [
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
      [c, r - 1],
    ];
    for (const [nc, nr] of nb) {
      if (nc < 0 || nr < 0 || nc >= w || nr >= h) continue;
      const j = nr * w + nc;
      if (seen[j] || isBlocking(tiles[j])) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/** Procedural symmetric arena (mirrored left/right) for levels 11+. */
function generate(n: number, rng: Rng) {
  const w = Math.min(30, 24 + Math.floor(rng.next() * 3) * 2 + (n > 25 ? 2 : 0));
  const h = Math.min(19, 15 + rng.int(0, 2) + (n > 30 ? 1 : 0));
  const player = { c: Math.floor(w / 2) - 1, r: h - 2 };
  const spawns = [
    { c: 2, r: 1 },
    { c: Math.floor(w / 2), r: 1 },
    { c: w - 3, r: 1 },
  ];
  if (h >= 17) spawns.push({ c: 1, r: Math.floor(h / 2) - 2 }, { c: w - 2, r: Math.floor(h / 2) - 2 });

  for (let attempt = 0; attempt < 30; attempt++) {
    const tiles: T[] = new Array(w * h).fill(T.Floor);
    const set = (c: number, r: number, t: T) => {
      if (c < 0 || r < 0 || c >= w || r >= h) return;
      tiles[r * w + c] = t;
      const mc = w - 1 - c;
      tiles[r * w + mc] = t;
    };
    const half = Math.floor(w / 2);
    const stamps = 7 + Math.min(6, Math.floor(n / 8)) + rng.int(0, 3);
    for (let s = 0; s < stamps; s++) {
      const kind = rng.pick(['wallI', 'wallL', 'crates', 'bush', 'bush', 'water', 'barrels', 'pillars', 'wallU'] as const);
      const c0 = rng.int(1, half - 2);
      const r0 = rng.int(2, h - 4);
      switch (kind) {
        case 'wallI': {
          const len = rng.int(2, 5);
          const vertical = rng.chance(0.5);
          for (let i = 0; i < len; i++) set(vertical ? c0 : c0 + i, vertical ? r0 + i : r0, T.Wall);
          break;
        }
        case 'wallL': {
          const len = rng.int(2, 4);
          for (let i = 0; i < len; i++) set(c0 + i, r0, T.Wall);
          for (let i = 1; i < len; i++) set(c0, r0 + i, T.Wall);
          break;
        }
        case 'wallU': {
          for (let i = 0; i < 4; i++) set(c0 + i, r0 + 2, T.Wall);
          set(c0, r0 + 1, T.Wall);
          set(c0 + 3, r0 + 1, T.Wall);
          set(c0 + 1, r0 + 1, T.Bush);
          set(c0 + 2, r0 + 1, T.Bush);
          break;
        }
        case 'crates': {
          const cw = rng.int(1, 3);
          const ch = rng.int(1, 2);
          for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) set(c0 + i, r0 + j, T.Crate);
          break;
        }
        case 'bush': {
          const bw = rng.int(2, 4);
          const bh = rng.int(2, 3);
          for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) if (rng.chance(0.85)) set(c0 + i, r0 + j, T.Bush);
          break;
        }
        case 'water': {
          const ww = rng.int(2, 4);
          const wh = rng.int(1, 2);
          for (let i = 0; i < ww; i++) for (let j = 0; j < wh; j++) set(c0 + i, r0 + j, T.Water);
          break;
        }
        case 'barrels':
          set(c0, r0, T.Barrel);
          if (rng.chance(0.5)) set(c0 + 1, r0, T.Barrel);
          break;
        case 'pillars':
          set(c0, r0, T.Wall);
          set(c0 + 2, r0 + 2, T.Wall);
          break;
      }
    }
    // Keep spawn areas clear.
    const clear = (p: { c: number; r: number }, rad: number) => {
      for (let dc = -rad; dc <= rad; dc++)
        for (let dr = -rad; dr <= rad; dr++) {
          const c = p.c + dc;
          const r = p.r + dr;
          if (c >= 0 && r >= 0 && c < w && r < h) tiles[r * w + c] = T.Floor;
        }
    };
    clear(player, 2);
    spawns.forEach((s) => clear(s, 1));
    clear({ c: Math.floor(w / 2), r: 3 }, 2);

    const seen = reachable(tiles, w, h, player);
    let walk = 0;
    let reach = 0;
    tiles.forEach((t, i) => {
      if (!isBlocking(t)) {
        walk++;
        if (seen[i]) reach++;
      }
    });
    if (spawns.every((s) => seen[s.r * w + s.c]) && reach / walk > 0.97) {
      // Fill unreachable pockets so nothing spawns there.
      tiles.forEach((t, i) => {
        if (!isBlocking(t) && !seen[i]) tiles[i] = T.Wall;
      });
      return { w, h, tiles, player, spawns };
    }
  }
  // Fallback: open arena with a few bushes.
  return parseHand(HAND[n % HAND.length]);
}

export function difficulty(n: number): Difficulty {
  const k = Math.pow(n - 1, 0.92);
  return {
    hp: 0.8 + 0.045 * k,
    dmg: 0.7 + 0.025 * k,
    aimErr: Math.max(0.08, 0.32 - n * 0.01),
    fireRate: Math.max(0.62, 1 - n * 0.012),
    speed: 1 + Math.min(0.18, n * 0.006),
  };
}

export function buildLevel(n: number): LevelConfig {
  const rng = new Rng(n * 7919 + 13);
  const biome = biomeForLevel(n);
  const map = n <= HAND.length ? parseHand(HAND[n - 1]) : generate(n, rng);

  const waveCount = 2 + (n >= 4 ? 1 : 0) + (n >= 30 ? 1 : 0);
  const pool = ENEMIES.filter((e) => e.minLevel <= n);
  const waves: string[][] = [];
  for (let w = 0; w < waveCount; w++) {
    const count = Math.min(n < 30 ? 5 : 6, 2 + Math.floor((n - 1) / 8) + (w >= 1 ? 1 : 0));
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      // Newest unlocked enemy types appear a bit more often.
      const e = rng.chance(0.35) ? pool[pool.length - 1 - rng.int(0, Math.min(2, pool.length - 1))] : rng.pick(pool);
      list.push(e.id);
    }
    waves.push(list);
  }

  const mods: ModId[] = [];
  if (n >= 6) {
    const avail = MODS.filter((m) => m !== 'fog' || n >= 10);
    const cnt = n < 12 ? (rng.chance(0.75) ? 1 : 0) : rng.chance(0.5) ? 2 : 1;
    rng.shuffle([...avail])
      .slice(0, cnt)
      .forEach((m) => mods.push(m));
  }

  const boss = BOSS_IDS[(n - 1) % BOSS_IDS.length];
  const bossTier = Math.floor((n - 1) / BOSS_IDS.length);

  return {
    n,
    biome,
    w: map.w,
    h: map.h,
    tiles: map.tiles,
    player: map.player,
    spawns: map.spawns.length ? map.spawns : [{ c: 2, r: 1 }],
    bossSpawn: { c: Math.floor(map.w / 2), r: 3 },
    waves,
    boss,
    bossTier,
    mods,
    diff: difficulty(n),
    parTime: 40 + waveCount * 25 + 55,
  };
}
