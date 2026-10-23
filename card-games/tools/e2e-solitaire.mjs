// End-to-end checks of the solitaire build in a real browser (stub platform).
import { chromium } from 'playwright';

const URL = process.argv[2] ?? 'http://localhost:5180/?debug&lang=ru';
const OUT = process.argv[3] ?? '/tmp/e2e';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack || e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const sleep = (ms) => page.waitForTimeout(ms);
const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
};

await page.goto(URL);
await sleep(3000);
// Game → page coordinates.
const toPage = async (x, y) =>
  page.evaluate(([x, y]) => {
    const c = document.querySelector('#game canvas');
    const r = c.getBoundingClientRect();
    const g = window.__game;
    return [r.left + (x / g.scale.width) * r.width, r.top + (y / g.scale.height) * r.height];
  }, [x, y]);
const active = () => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const start = (key, data) => page.evaluate(([k, d]) => window.__game.scene.getScenes(true)[0].scene.start(k, d), [key, data]);

await page.evaluate(() => Object.assign(window.__save.data.tutorial, { kl: true, tp1: true, ice: true, lock: true, gold: true, bomb: true }));

// ---- Klondike: tap and drag with the real mouse
await start('Classic', { mode: 'klondike', seed: 12345, newGame: true });
await sleep(1200);
check('klondike scene', (await active()).includes('Classic'));
let info = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Classic');
  const g = s.gm;
  // Find a tableau→tableau move (or waste→tab) for a drag test.
  for (const src of g.piles.filter((p) => p.kind === 'tab' || p.kind === 'waste')) {
    for (let i = 0; i < src.cards.length; i++) {
      if (!g.canPick(src.id, i)) continue;
      for (const dst of g.piles.filter((p) => p.kind === 'tab')) {
        if (g.canMove({ from: src.id, index: i, to: dst.id })) {
          const v = s.views.get(src.cards[i].id);
          const top = dst.cards[dst.cards.length - 1];
          const tv = top ? s.views.get(top.id) : null;
          const L = s.layout.get(dst.id);
          return { from: [v.x, v.y - v.ch * 0.4], to: tv ? [tv.x, tv.y + tv.ch * 0.1] : [L.x, L.y], moves: g.moves };
        }
      }
    }
  }
  return { moves: g.moves };
});
if (info.from) {
  const [fx, fy] = await toPage(...info.from);
  const [tx, ty] = await toPage(...info.to);
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(fx + ((tx - fx) * k) / 10, fy + ((ty - fy) * k) / 10);
  await page.mouse.up();
  await sleep(600);
  const m2 = await page.evaluate(() => window.__game.scene.getScene('Classic').gm.moves);
  check('klondike drag move', m2 > info.moves, `${info.moves}->${m2}`);
} else check('klondike drag move', false, 'no move found');
// Stock click
const stockPos = await page.evaluate(() => {
  const L = window.__game.scene.getScene('Classic').layout.get('stock');
  return [L.x, L.y];
});
const before = await page.evaluate(() => window.__game.scene.getScene('Classic').gm.pile('waste').cards.length);
await page.mouse.click(...(await toPage(...stockPos)));
await sleep(400);
const after = await page.evaluate(() => window.__game.scene.getScene('Classic').gm.pile('waste').cards.length);
check('klondike stock click', after !== before, `${before}->${after}`);
await page.screenshot({ path: `${OUT}_klondike.png` });

// ---- Orientation change mid-game keeps the deal
const movesBefore = await page.evaluate(() => window.__game.scene.getScene('Classic').gm.moves);
await page.setViewportSize({ width: 1280, height: 720 });
await sleep(1500);
const movesAfter = await page.evaluate(() => window.__game.scene.getScene('Classic').gm.moves);
check('resize keeps state', movesAfter === movesBefore, `${movesBefore}/${movesAfter}`);
await page.screenshot({ path: `${OUT}_klondike_land.png` });
await page.setViewportSize({ width: 540, height: 1100 });
await sleep(1200);

// ---- Klondike win via solver-driven play → Result
await start('Classic', { mode: 'klondike', seed: 1, newGame: true });
await sleep(1200);
await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Classic');
  for (let k = 0; k < 400 && !s.gm.won; k++) {
    if (s.gm.canAutoComplete) {
      let m;
      while ((m = s.gm.autoStep())) s.gm.move(m);
      break;
    }
    const h = s.gm.hint();
    if (!h) break;
    if (h.t === 'draw') s.gm.draw();
    else s.gm.move(h.m);
    if (k % 20 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  s.sync(false);
  if (s.gm.won) s.onWin();
});
await sleep(6000);
check('klondike win → Result', (await active()).includes('Result'), await active());
await page.screenshot({ path: `${OUT}_result.png` });

// ---- Rewarded: TriPeaks hint offer → ad → reward
await start('TriPeaks', { mode: 'adventure', level: 5 });
await sleep(1200);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('TriPeaks');
  s.st.freeHint = 0;
  window.__save.data.boosters.hint = 0;
  s.onHint();
});
await sleep(500);
// Click the green "free" button of the offer modal.
const freeBtn = await page.evaluate(() => {
  const s = window.__game.scene.getScene('TriPeaks');
  const find = (o) => {
    if (o.list) for (const c of o.list) {
      const r = find(c);
      if (r) return r;
    }
    if (o.label && o.label.text === 'БЕСПЛАТНО') {
      const m = o.getWorldTransformMatrix();
      return [m.tx, m.ty];
    }
    return null;
  };
  for (const o of s.children.list) {
    const r = find(o);
    if (r) return r;
  }
  return null;
});
check('offer modal shown', !!freeBtn);
const rewardedBefore = await page.evaluate(() => window.__ads.stats.rewarded);
if (freeBtn) {
  await page.mouse.click(...(await toPage(...freeBtn)));
  await sleep(800);
  await page.screenshot({ path: `${OUT}_ad.png` });
  await page.evaluate(() => window.__stubAdSkip && window.__stubAdSkip());
  await sleep(700);
}
const st = await page.evaluate(() => [window.__ads.stats.rewarded, window.__game.scene.getScene('TriPeaks').st.freeHint]);
check('rewarded granted', st[0] === rewardedBefore + 1 && st[1] >= 1, JSON.stringify(st));

// ---- TriPeaks real click on a playable card
const tp = await page.evaluate(() => {
  const s = window.__game.scene.getScene('TriPeaks');
  const p = s.gm.playable()[0];
  if (p === undefined) return null;
  const pos = s.slotPos(p);
  return { pos: [pos.x, pos.y], moves: s.gm.moves };
});
if (tp) {
  await page.mouse.click(...(await toPage(...tp.pos)));
  await sleep(500);
  const m = await page.evaluate(() => window.__game.scene.getScene('TriPeaks').gm.moves);
  check('tripeaks click play', m === tp.moves + 1, `${tp.moves}->${m}`);
}

// ---- Interstitial at a transition (rules relaxed for the test)
await page.evaluate(() => {
  Object.assign(window.__adConfig, { sessionGraceMs: 0, interstitialCooldownMs: 0, afterRewardedGraceMs: 0, minGamesFinished: 0 });
  window.__ads.inGameplay = false;
});
await start('Shop', {});
await sleep(800);
const iBefore = await page.evaluate(() => window.__ads.stats.interstitials);
await page.evaluate(() => { void window.__game.scene.getScene('Shop').go('Menu', {}, 'shop_back'); });
await sleep(900);
await page.evaluate(() => window.__stubAdSkip && window.__stubAdSkip());
await page.waitForTimeout(3500);
// Interstitial stub closes only via its button after the timer.
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Закрыть|Close/.test(x.textContent));
  b && b.click();
});
await sleep(800);
const iAfter = await page.evaluate(() => window.__ads.stats.interstitials);
check('interstitial on transition', iAfter === iBefore + 1, `${iBefore}->${iAfter}`);
check('menu after ad', (await active()).includes('Menu'), await active());

// ---- Visit every screen
for (const sc of ['Map', 'LevelIntro', 'Shop', 'Settings', 'Collection', 'Quests', 'Achievements', 'Wheel', 'DailyBonus', 'Profile', 'Leaderboard', 'Rules', 'Daily', 'ModeSetup', 'Menu']) {
  await start(sc, sc === 'LevelIntro' ? { level: 3 } : sc === 'ModeSetup' ? { mode: 'spider' } : {});
  await sleep(500);
}
check('visited all screens', true);
check('no page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
console.log(results.join('\n'));
await browser.close();
