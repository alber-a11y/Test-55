// End-to-end checks of the Durak build in a real browser (stub platform).
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5182/?debug&lang=ru';
const OUT = process.argv[3] ?? '/tmp/e2e-durak';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const sleep = (ms) => page.waitForTimeout(ms);
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
const waitScene = (key, ms = 90000) => page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), key, { timeout: ms, polling: 500 }).then(() => true, () => false);
const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const start = (key, data) => page.evaluate(([k, d]) => { window.__game.scene.getScenes(true)[0].scene.start(k, d); }, [key, data]);

await page.goto(URL);
await sleep(3000);
await page.evaluate(() => {
  window.__save.data.tutorial = { attack: true, transfer: true, cheat: true };
  window.__save.data.coins = 5000;
  // Fullscreen ads are covered by the solitaire e2e (same shared code); keep this run deterministic.
  window.__adConfig.minGamesFinished = 1e9;
});

/** Plays the current Game scene to the end, the human side driven by the AI. */
const playOut = (mode) =>
  page.evaluate(async (mode) => {
    const ai = await import('/src/logic/ai.ts');
    const pz = await import('/src/logic/puzzles.ts');
    const { Rng } = await import('/@fs' + '/home/user/Test-55/card-games/shared/core/rng.ts');
    const s = window.__game.scene.getScene('Game');
    const rng = new Rng(5);
    let steps = 0;
    while (!s.g.over && !s.ended && steps++ < 2000) {
      s.botTimer?.remove();
      const mine = s.myActions();
      if (mine.length) {
        let a = mode === 'puzzle' ? pz.bestMove(s.g, 0) : ai.decide(s.g, 0, ai.PROFILES.amateur, rng);
        if (mode === 'cheat' && steps % 7 === 0 && s.g.table.length && s.g.phase !== 'defend') {
          const c = s.g.players[0].hand.find((x) => !s.g.tableRanks.has(x.rank));
          if (c) {
            s.doCheat({ t: 'attack', p: 0, card: c.id });
            continue;
          }
        }
        if (mode === 'cheat' && steps % 11 === 0 && s.g.table.length) s.onCatch();
        if (!a) a = mine[0];
        s.act(a);
      } else {
        const g = s.g;
        let who = g.phase === 'defend' ? g.defender : g.actor;
        if (who === 0 || !g.legal(who).length) {
          g.autoResolve();
          who = g.players.findIndex((_, i) => i !== 0 && g.legal(i).length > 0);
        }
        if (who > 0) s.botMove(who);
        else if (!g.over) s.afterAction();
      }
      if (steps % 25 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (s.g.over && !s.ended) s.onOver();
    return { over: s.g.over, loser: s.g.loser, steps };
  }, mode);

// ---- Career table 0 through the intro screen
await start('TableIntro', { idx: 0 });
await sleep(1000);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('TableIntro');
  const find = (o) => (o.list ? o.list.map(find).find(Boolean) : null) || (o.label && /НАЧАТЬ/.test(o.label.text) ? o : null);
  for (const o of s.children.list) {
    const b = find(o);
    if (b) return b.emit('pointerup', { x: 0, y: 0 });
  }
});
await sleep(1500);
check('career game started', (await active()).includes('Game'), await active());
await page.screenshot({ path: `${OUT}_table.png` });
let r = await playOut('normal');
check('career deal finished', r.over, JSON.stringify(r));
check('career → Result', await waitScene('Result'), await active());
await sleep(1500);
await page.screenshot({ path: `${OUT}_result.png` });

// ---- Quick game: 3 players, transfer
await page.evaluate(() => Object.assign(window.__save.data.settings.quick, { players: 3, transfer: true, cheat: false, deck: 36, level: 2 }));
await start('QuickSetup', {});
await sleep(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('QuickSetup');
  const b = s.children.list.find((o) => o.label && /НАЧАТЬ/.test(o.label.text));
  b.emit('pointerup', { x: 0, y: 0 });
});
await sleep(1500);
r = await playOut('normal');
check('quick 3p transfer finished', r.over, JSON.stringify(r));
check('quick → Result', await waitScene('Result'));

// ---- Cheat game with catches
await page.evaluate(() => Object.assign(window.__save.data.settings.quick, { players: 2, transfer: false, cheat: true }));
await start('QuickSetup', {});
await sleep(800);
await page.evaluate(() => window.__game.scene.getScene('QuickSetup').children.list.find((o) => o.label && /НАЧАТЬ/.test(o.label.text)).emit('pointerup', { x: 0, y: 0 }));
await sleep(1500);
r = await playOut('cheat');
check('cheat game finished', r.over, JSON.stringify(r));
await waitScene('Result');

// ---- 4 players teams
await page.evaluate(() => Object.assign(window.__save.data.settings.quick, { players: 4, teams: true, cheat: false }));
await start('QuickSetup', {});
await sleep(800);
await page.evaluate(() => window.__game.scene.getScene('QuickSetup').children.list.find((o) => o.label && /НАЧАТЬ/.test(o.label.text)).emit('pointerup', { x: 0, y: 0 }));
await sleep(1500);
await page.screenshot({ path: `${OUT}_teams.png` });
r = await playOut('normal');
check('teams game finished', r.over, JSON.stringify(r));
await waitScene('Result');

// ---- Puzzle 1 solved by perfect play
await start('Puzzles', {});
await sleep(800);
await page.evaluate(() => window.__game.scene.getScene('Puzzles').start(1));
await sleep(2500);
await page.screenshot({ path: `${OUT}_puzzle.png` });
r = await playOut('puzzle');
check('puzzle won', r.over && r.loser === 1, JSON.stringify(r));
await waitScene('Result');
const solved = await page.evaluate(() => window.__save.data.puzzles.solved);
check('puzzle recorded', solved >= 1, String(solved));

// ---- Tournament: enter, play a match, back to bracket
await start('Tournament', { fresh: true });
await sleep(800);
await page.evaluate(() => window.__game.scene.getScene('Tournament').children.list.find((o) => o.label && /НАЧАТЬ/.test(o.label.text)).emit('pointerup', { x: 0, y: 0 }));
await sleep(1200);
await page.screenshot({ path: `${OUT}_bracket.png` });
await page.evaluate(() => window.__game.scene.getScene('Tournament').children.list.find((o) => o.label && /матч/i.test(o.label.text)).emit('pointerup', { x: 0, y: 0 }));
await sleep(1500);
r = await playOut('normal');
check('tournament match finished', r.over, JSON.stringify(r));
await waitScene('Result');
await sleep(1000);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Result');
  s.claim(1, s.nextTarget());
});
await sleep(1500);
if ((await active()).match(/LevelUp|LeagueUp/)) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.children.list.find((o) => o.label && /ЗАБРАТЬ/.test(o.label.text))?.emit('pointerup', { x: 0, y: 0 });
  });
}
check('back to bracket', await waitScene('Tournament'), await active());
const tour = await page.evaluate(() => window.__save.data.tour);
check('tournament advanced', tour && tour.round === 1, JSON.stringify({ round: tour?.round, out: tour?.out }));

// ---- Orientation change in a game
await start('Game', { mode: 'quick', rules: { players: 2, deck: 36, transfer: false, teams: false, cheat: false, firstBoutFive: true }, opponents: [{ name: 'Тест', face: { skin: '#f6d7b8', hair: '#5a3a22', hairStyle: 1, hat: 0, hatColor: '#e03131', beard: 0, glasses: 0, shirt: '#3b5bdb', bg: '#fff3bf', old: false, female: false }, ai: { level: 2, aggression: 0.5, transferLove: 0.5, cheatRate: 0, attention: 0.3 }, trait: 'calm', boss: false }], loc: 2, seed: 99 });
await sleep(1500);
const before = await page.evaluate(() => window.__game.scene.getScene('Game').g.players[0].hand.map((c) => c.id).join(','));
await page.setViewportSize({ width: 1280, height: 720 });
await sleep(2000);
const after = await page.evaluate(() => window.__game.scene.getScene('Game').g.players[0].hand.map((c) => c.id).join(','));
check('resize keeps deal', before === after);
await page.screenshot({ path: `${OUT}_land.png` });
await page.setViewportSize({ width: 540, height: 1100 });
await sleep(1200);

for (const sc of ['Menu', 'Career', 'Shop', 'Quests', 'Achievements', 'Wheel', 'DailyBonus', 'Profile', 'Leaderboard', 'Rules', 'Settings', 'Trophies', 'DailyTable', 'Puzzles', 'QuickSetup', 'Menu']) {
  await start(sc, {});
  await sleep(400);
}
check('visited all screens', true);
check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(results.join('\n'));
await browser.close();
