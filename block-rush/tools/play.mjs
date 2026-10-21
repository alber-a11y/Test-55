// Plays real games through the UI with mouse/touch drags: node tools/play.mjs [outDir]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'shots';
mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch();
const errors = [];

async function closeAd(page) {
  for (let i = 0; i < 40; i++) {
    const b = page.locator('.stub-ad .stub-ad-close');
    if ((await b.count()) === 0) return;
    if (await b.isVisible()) {
      await b.click();
      await page.waitForTimeout(150);
      return;
    }
    await page.waitForTimeout(150);
  }
}

/** Find the best move and return screen coordinates for the drag. */
async function bestMove(page, touch) {
  return page.evaluate((touch) => {
    const br = window.__br;
    const scr = br.currentScreen();
    const s = scr.session;
    const v = scr.view;
    const L = v.L;
    const r = v.canvas.getBoundingClientRect();
    let best = null;
    s.slots.forEach((sl, i) => {
      if (!sl) return;
      const p = br.bestPlacement(s.board, sl.shape, s.withCols);
      if (p && (!best || p.score > best.score)) best = { i, p, sh: sl.shape };
    });
    if (!best) return null;
    const slot = L.slots[best.i];
    const c = L.cell;
    const lift = touch ? c * 1.4 + (best.sh.h * c) / 2 : 0;
    return {
      from: { x: r.left + slot.x + slot.w / 2, y: r.top + slot.y + slot.h / 2 },
      to: { x: r.left + L.bx + best.p.x * c + (best.sh.w * c) / 2, y: r.top + L.by + best.p.y * c + (best.sh.h * c) / 2 + lift },
    };
  }, touch);
}

async function drag(page, m) {
  await page.mouse.move(m.from.x, m.from.y);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) await page.mouse.move(m.from.x + ((m.to.x - m.from.x) * k) / 6, m.from.y + ((m.to.y - m.from.y) * k) / 6);
  await page.waitForTimeout(30);
  await page.mouse.up();
}

const state = (page) => page.evaluate(() => {
  const s = window.__br.currentScreen().session;
  return { state: s.state, score: s.score, moves: s.moves, gems: s.gemsLeft, time: Math.round(s.timeLeft) };
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?fastads&debug&lang=ru');
await page.waitForTimeout(600);
await closeAd(page);
await page.locator('.menu-main .btn').first().click();
await page.waitForTimeout(400);
await closeAd(page);
await page.locator('.start-modal .btn').first().click();
await page.waitForTimeout(400);

let shotMid = false;
for (let i = 0; i < 60; i++) {
  const st = await state(page);
  if (st.state !== 'playing') break;
  const m = await bestMove(page, false);
  if (!m) break;
  const before = st.score;
  await drag(page, m);
  await page.waitForTimeout(90);
  const after = await state(page);
  if (!shotMid && after.score - before > 100) {
    shotMid = true;
    await page.screenshot({ path: `${out}/play-clear.png` });
  }
  await page.waitForTimeout(150);
}
console.log('level 1 result', await state(page));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/play-win.png` });
// Next level
await page.locator('.win-modal .btn-green').click();
await page.waitForTimeout(600);
await closeAd(page);
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/play-l2-start.png` });
await page.locator('.start-modal .btn').first().click();
await page.waitForTimeout(400);
// Use a bomb on the middle of the board
const target = await page.evaluate(() => {
  const v = window.__br.currentScreen().view;
  const r = v.canvas.getBoundingClientRect();
  return { x: r.left + v.L.bx + v.L.bw / 2, y: r.top + v.L.by + v.L.bh * 0.7 };
});
await page.locator('.booster').first().click();
await page.waitForTimeout(200);
await page.mouse.move(target.x, target.y);
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/play-bomb-aim.png` });
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(160);
await page.screenshot({ path: `${out}/play-bomb.png` });
console.log('after bomb', await state(page), await page.evaluate(() => window.__br.save.boosters.bomb));
// Pause menu
await page.locator('.hud-pause').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/play-pause.png` });
await page.locator('.modal .btn-blue').click(); // restart → maybe ad
await page.waitForTimeout(400);
await closeAd(page);
await page.waitForTimeout(400);
await page.locator('.start-modal .btn').first().click();
// let the time run out quickly
await page.evaluate(() => (window.__br.currentScreen().session.timeLeft = 0.5));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/play-lose.png` });
await page.locator('.lose-modal .btn-green').click(); // revive via rewarded stub
await page.waitForTimeout(1600);
await closeAd(page);
console.log('after revive', await state(page));

// Classic mode on a phone with touch-style lift? (mouse events, so no lift)
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push('classic: ' + e.message));
await p2.goto(url + '?fastads&debug&lang=ru');
await p2.waitForTimeout(600);
await closeAd(p2);
await p2.locator('.menu-main .btn').nth(1).click();
await p2.waitForTimeout(500);
await closeAd(p2);
for (let i = 0; i < 14; i++) {
  const m = await bestMove(p2, false);
  if (!m) break;
  await drag(p2, m);
  await p2.waitForTimeout(120);
}
await p2.waitForTimeout(80);
await p2.screenshot({ path: `${out}/classic.png` });
console.log('classic', await state(p2));
await p2.evaluate(() => {
  const s = window.__br.currentScreen().session;
  for (let i = 0; i < s.board.cells.length; i++) s.board.cells[i] = i % 3 === 0 ? -1 : 2;
  s.slots = s.slots.map((x) => x && { ...x, shape: { ...x.shape } });
});
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
