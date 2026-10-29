// End-to-end checks of «Тысяча Экспресс» in a real browser (stub platform).
// Usage: node tools/e2e-thousand.mjs [url] [outDir] [--shots] [--shots-only] [--port|--land]
// Plays a route station, a blitz match, an etude and the daily deal (the player's side driven by the AI),
// and with --shots captures every screen in portrait and landscape.
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5184/?debug&lang=ru';
const OUT = process.argv[3] ?? '/tmp/e2e-thousand';
const SHOTS_ONLY = process.argv.includes('--shots-only');
const SHOTS = SHOTS_ONLY || process.argv.includes('--shots');
const ORIENT = process.argv.includes('--land') ? ['l'] : process.argv.includes('--port') ? ['p'] : ['p', 'l'];
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const sleep = (ms) => page.waitForTimeout(ms);
const results = [];
const check = (name, ok, extra = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`;
  results.push(line);
  console.log(line);
};
const waitScene = (key, ms = 60000) => page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), key, { timeout: ms, polling: 300 }).then(() => true, () => false);
const start = (key, data) => page.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);

await page.goto(URL);
await sleep(3000);
await page.evaluate(() => {
  window.__save.data.tutorial = { intro: true, bid: true, play: true, discard: true, contract: true, etude: true, t_basics: true, t_tricks: true };
  window.__save.data.coins = 5000;
  window.__adConfig.minGamesFinished = 1e9;
});

/** Drives the Game scene to its end: the player's moves come from the AI, summaries are clicked through. */
const playOut = (maxMs = 240000) =>
  page.evaluate(async (maxMs) => {
    const ai = await import('/src/logic/ai.ts');
    const pz = await import('/src/logic/puzzles.ts');
    const { Rng } = await import('/@fs/home/user/Test-55/card-games/shared/core/rng.ts');
    const rng = new Rng(7);
    const t0 = performance.now();
    const log = [];
    while (performance.now() - t0 < maxMs) {
      await new Promise((r) => setTimeout(r, 150));
      const g = window.__game;
      if (!g.scene.isActive('Game')) return { done: true, log, scene: g.scene.getScenes(true).map((s) => s.scene.key).join(',') };
      const s = g.scene.getScene('Game');
      if (!s.st) continue;
      s.time.timeScale = 25;
      s.tweens.timeScale = 25;
      if (s.ended) continue;
      if (s.summaryModal) {
        const res = s.outcome();
        log.push(`deal ${s.m.dealNo}: ${s.m.scores.join('/')}`);
        if (res) s.finish(res.won, res.place);
        else {
          s.summaryModal.close();
          s.nextDeal(false);
        }
        continue;
      }
      const d = s.deal;
      if (!s.looping || s.busy || d.phase === 'done' || d.turn !== 0) continue;
      if (d.phase === 'play' && s.d.mode === 'etude') {
        s.playCard(pz.bestCard(d, 0).id);
        continue;
      }
      const acts = ai.decide(d, 0, ai.PROFILES.master, rng);
      if (d.phase === 'discard') {
        s.clearPanel();
        s.giveSel = [null, null, null];
        s.applyAll(acts);
      } else if (d.phase === 'play') s.playCard(acts[0].card);
      else s.act(acts[0]);
    }
    return { done: false, log };
  }, maxMs);

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

if (!SHOTS_ONLY) {
// 1. Route station 1
await start('Game', await page.evaluate(async () => {
  const r = await import('/src/data/route.ts');
  const c = r.levelCfg(0, 'ru');
  return { mode: 'career', rules: c.rules, opponents: c.opponents, world: c.world, level: 0, boosters: [] };
}));
await waitScene('Game');
await sleep(2500);
await shot('game_station1');
let r = await playOut();
check('station 1 finished', r.done, r.log.join(' | '));
check('result screen', await waitScene('Result'));
await sleep(1500);
await shot('result_station1');
const rec = await page.evaluate(() => ({ next: window.__save.data.route.next, deals: window.__save.data.totals.deals }));
check('deals recorded', rec.deals > 0, JSON.stringify(rec));

// 2. Blitz match to 500
await start('Game', await page.evaluate(async () => {
  const q = await import('/src/data/quick.ts');
  const th = await import('/src/logic/thousand.ts');
  return { mode: 'blitz', rules: { ...th.DEFAULT_RULES, target: 500 }, opponents: q.randomOpponents(2, 99, 'ru'), world: 3, seed: 99 };
}));
await waitScene('Game');
r = await playOut(400000);
check('blitz finished', r.done, `${r.log.length} deals; last ${r.log[r.log.length - 1]}`);
await waitScene('Result');

// 3. Etude 1
await start('Game', await page.evaluate(async () => {
  const th = await import('/src/logic/thousand.ts');
  const f = await import('/src/art/faces.ts');
  const a = await import('/src/logic/ai.ts');
  return { mode: 'etude', rules: { ...th.DEFAULT_RULES }, opponents: [1, 2].map((k) => ({ name: 'D' + k, face: f.faceFromSeed(k), ai: a.PROFILES.king, trait: 'calm', boss: false })), world: 2, etude: 1 };
}));
await waitScene('Game');
await sleep(2000);
await shot('game_etude');
r = await playOut();
check('etude finished', r.done);
await waitScene('Result');
const solved = await page.evaluate(() => window.__save.data.etudes.solved);
check('etude solved with perfect play', solved >= 1, `solved=${solved}`);

// 4. Daily deal (3 deals)
await start('Daily', {});
await waitScene('Daily');
await sleep(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Daily');
  // Same start as the PLAY button.
  s.children.list.filter((o) => o.onClick && o.label?.text === 'ИГРАТЬ').forEach((b) => b.emit('pointerup', { x: 0, y: 0 }));
});
const dailyStarted = await waitScene('Game', 20000);
check('daily started', dailyStarted);
if (dailyStarted) {
  r = await playOut();
  check('daily finished after 3 deals', r.done && r.log.length === 3, `${r.log.length} deals`);
  await waitScene('Result');
  const dd = await page.evaluate(() => Object.keys(window.__save.data.dailyDeal).length);
  check('daily score saved', dd === 1);
}

}

// 5. Every screen in both orientations
if (SHOTS) {
  const screens = [
    ['Menu', {}],
    ['Map', {}],
    ['LevelIntro', { idx: 7 }],
    ['LevelIntro', { idx: 19 }],
    ['Modes', {}],
    ['QuickSetup', { mode: 'quick' }],
    ['Cup', {}],
    ['Daily', {}],
    ['Etudes', {}],
    ['Shop', { tab: 'back' }],
    ['Shop', { tab: 'face' }],
    ['Shop', { tab: 'table' }],
    ['Shop', { tab: 'boosters' }],
    ['Quests', {}],
    ['Achievements', {}],
    ['Wheel', {}],
    ['DailyBonus', {}],
    ['Profile', {}],
    ['Leaderboard', {}],
    ['Rules', {}],
    ['Settings', {}],
    ['Rivals', {}],
    ['LevelUp', { next: { key: 'Menu', data: {} } }],
    ['RankUp', { next: { key: 'Menu', data: {} } }],
  ];
  for (const [w, h, tag] of [
    [540, 1100, 'p'],
    [1280, 720, 'l'],
  ].filter((o) => ORIENT.includes(o[2]))) {
    await page.setViewportSize({ width: w, height: h });
    await sleep(1500);
    for (const [key, data] of screens) {
      await start(key, data);
      await waitScene(key);
      await sleep(1400);
      await shot(`${tag}_${key}${data.tab ? '_' + data.tab : ''}${data.idx !== undefined ? '_' + data.idx : ''}`);
    }
    // A game in the play phase
    await start('Game', await page.evaluate(async () => {
      const q = await import('/src/data/quick.ts');
      const th = await import('/src/logic/thousand.ts');
      return { mode: 'quick', rules: { ...th.DEFAULT_RULES }, opponents: q.randomOpponents(3, 5, 'ru'), world: 5, seed: 5 };
    }));
    await waitScene('Game');
    await sleep(1500);
    await shot(`${tag}_Game_bid`);
  }
}

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
process.exit(results.some((x) => x.startsWith('FAIL')) || errors.length ? 1 : 0);
