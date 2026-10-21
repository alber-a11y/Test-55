// Touch drag-and-drop check through real touch events (CDP): node tools/touch.mjs outDir
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const url = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + '?fastads&debug&lang=ru');
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('.stub-ad')?.remove());
await page.evaluate(() => window.__br.nav.level(4));
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('.stub-ad')?.remove());
await page.locator('.start-modal .btn').first().tap();
await page.waitForTimeout(400);
const cdp = await ctx.newCDPSession(page);
for (let n = 0; n < 6; n++) {
  const m = await page.evaluate(() => {
    const br = window.__br, scr = br.currentScreen(), s = scr.session, v = scr.view, L = v.L;
    const r = v.canvas.getBoundingClientRect();
    let best = null;
    s.slots.forEach((sl, i) => { if (!sl) return; const p = br.bestPlacement(s.board, sl.shape, false); if (p && (!best || p.score > best.score)) best = { i, p, sh: sl.shape }; });
    const slot = L.slots[best.i], c = L.cell, lift = c * 1.4 + (best.sh.h * c) / 2;
    return { from: { x: r.left + slot.x + slot.w / 2, y: r.top + slot.y + slot.h / 2 },
      to: { x: r.left + L.bx + best.p.x * c + (best.sh.w * c) / 2, y: r.top + L.by + best.p.y * c + (best.sh.h * c) / 2 + lift }, moves: s.moves };
  });
  const tp = (p) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(m.from) });
  for (let k = 1; k <= 8; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp({ x: m.from.x + (m.to.x - m.from.x) * k / 8, y: m.from.y + (m.to.y - m.from.y) * k / 8 }) });
    await page.waitForTimeout(16);
  }
  if (n === 2) await page.screenshot({ path: process.argv[2] + '/touch-drag.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
  console.log('moves before', m.moves, 'after', await page.evaluate(() => { const s = window.__br.currentScreen().session; return s.moves + ' ' + s.state + ' gems ' + s.gemsLeft; }));
}
await browser.close();
console.log(errors.length ? errors : 'no errors');
