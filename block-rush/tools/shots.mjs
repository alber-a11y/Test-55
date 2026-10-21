// Screenshot smoke test: node tools/shots.mjs [outDir]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'shots';
mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const errors = [];

async function closeAd(page) {
  for (let i = 0; i < 30; i++) {
    const b = page.locator('.stub-ad .stub-ad-close');
    if ((await b.count()) === 0) return;
    if (await b.isVisible()) {
      await b.click();
      await page.waitForTimeout(150);
      return;
    }
    await page.waitForTimeout(200);
  }
}

async function run(name, ctxOpts, extra = '') {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + '?fastads&debug' + extra);
  await page.waitForTimeout(700);
  await closeAd(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-1-menu.png` });
  await page.locator('.menu-main .btn').first().click();
  await page.waitForTimeout(500);
  await closeAd(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-2-start.png` });
  await page.locator('.start-modal .btn').first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-3-game.png` });
  // Drag the first tray piece to the hinted best spot via the hint booster.
  const res = await page.evaluate(() => {
    const scr = window.__br.currentScreen();
    const s = scr.session;
    return { slots: s.slots.map((x) => !!x).length, state: s.state };
  });
  console.log(name, res);
  await ctx.close();
}

await run('phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await run('desktop', { viewport: { width: 1280, height: 720 } });
await run('phone-en', { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }, '&lang=en');
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
