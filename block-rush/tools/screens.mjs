// Screenshots of every menu window: node tools/screens.mjs [outDir]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'shots';
mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.resolve('dist/index.html')).href;
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url + '?fastads&debug&lang=ru');
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('.stub-ad')?.remove());
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const closeModal = async () => {
  await page.locator('.modal .modal-x').last().click();
  await page.waitForTimeout(250);
};
await page.locator('.menu-tile').nth(1).click();
await page.waitForTimeout(400);
await shot('s-shop');
await closeModal();
await page.locator('.menu-tile').nth(2).click();
await page.waitForTimeout(300);
await page.locator('.modal .btn-green').click();
await page.waitForTimeout(600);
await shot('s-daily');
await page.locator('.modal .btn-green').click();
await page.waitForTimeout(300);
await page.locator('.menu-tile').nth(3).click();
await page.waitForTimeout(300);
await shot('s-wheel');
await page.locator('.modal .btn-green').click();
await page.waitForTimeout(4600);
await shot('s-wheel-done');
await closeModal();
await page.locator('.topbar .top-btn').click();
await page.waitForTimeout(300);
await shot('s-settings');
await closeModal();
await page.evaluate(() => { window.__br.save.level = 14; window.__br.save.stars = { 1: 3, 2: 2, 3: 1, 4: 3, 5: 3, 6: 2, 7: 3, 8: 1, 9: 2, 10: 3, 11: 3, 12: 2, 13: 1 }; });
await page.locator('.menu-tile').nth(0).click();
await page.waitForTimeout(600);
await shot('s-map');
for (const lv of [3, 5, 7, 12]) {
  await page.evaluate((lv) => window.__br.nav.level(lv), lv);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.stub-ad')?.remove());
  await page.locator('.start-modal .btn').first().click();
  await page.waitForTimeout(500);
  await shot(`s-level${lv}`);
}
await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
