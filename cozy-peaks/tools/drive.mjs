// Scripted play-through with screenshots (dev QA): node tools/drive.mjs <scenario> [width] [height]
// Needs the dev server running (npm run dev -- --port 5190) or URL=... set.
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const [scenario = 'flow', w = '1600', h = '900'] = process.argv.slice(2);
const base = process.env.URL ?? 'http://localhost:5190/';
const out = process.env.OUT ?? '.';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: +h } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
const tag = +w < +h ? 'p' : 'l';
const shot = (name) => page.screenshot({ path: `${out}/${scenario}-${name}-${tag}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const click = async (sel, i = 0) => {
  const els = await page.$$(sel);
  if (!els[i]) throw new Error('no element: ' + sel);
  await els[i].click();
};
const state = () =>
  page.evaluate(() => (document.querySelector('.m-win') ? 'win' : document.querySelector('.m-fail') ? 'fail' : document.querySelector('.m-failed') ? 'failed' : 'go'));

/** Play the current level greedily: any face-up card that is accepted, else the stock. */
async function playLevel(maxSteps = 160, midShot = '') {
  let rescues = 0;
  for (let k = 0; k < maxSteps; k++) {
    const st = await state();
    if (st === 'fail' && rescues < 4) {
      // Out of cards: take the rewarded "+5" first, then pay with coins.
      rescues++;
      if (process.env.SHOT_FAIL && rescues === 1) await shot('fail');
      const sel = (await page.$('.m-fail .btn-purple')) ? '.m-fail .btn-purple' : '.m-fail .btn-gold';
      await click(sel);
      await sleep(1800);
      continue;
    }
    if (st !== 'go') break;
    const moved = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.cards-layer .card.tcard:not(.down)')];
      for (const c of cards) {
        c.classList.remove('shake');
        c.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        if (!c.classList.contains('shake')) return true;
      }
      return false;
    });
    if (!moved) await page.evaluate(() => document.querySelector('.stock-pile')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await sleep(90);
    if (midShot && k === 12) await shot(midShot);
  }
  await sleep(1600);
}

await page.goto(base + '?reset&lang=' + (process.env.LANG_Q ?? 'ru') + '&ads=fast&debug&cfg.adCooldownSec=5');
await sleep(1200);

if (scenario === 'flow') {
  await click('.hero-card .btn', +(process.env.HERO ?? 0));
  await sleep(1500);
  await shot('home');
  await click('.play-btn');
  await sleep(1500);
  await shot('pre');
  await click('.m-pre .btn-big');
  await sleep(900);
  await shot('level');
  await playLevel(160, 'mid');
  await shot('end');
  const st = await state();
  console.log('level 1 result:', st);
  if (st === 'win') {
    await page.evaluate(() => document.querySelector('.m-chest .btn')?.click());
    await sleep(300);
    // Decorate if the button is there, else go next.
    const hasDecor = await page.$('.m-win .btn-green .btn-cost');
    if (hasDecor) {
      await page.evaluate(() => document.querySelector('.m-win .btn-green .btn-cost')?.closest('button')?.click());
      await sleep(1500);
      await shot('room');
      await page.evaluate(() => document.querySelector('.decor-strip .btn')?.click());
      await sleep(1500);
      await shot('room-done');
    }
  }
}

if (scenario === 'shop') {
  await click('.hero-card .btn', 4);
  await sleep(1200);
  await page.evaluate(() => (window).__go('shop', {}));
  await sleep(800);
  await shot('boosters');
  for (const tab of [1, 2, 3]) {
    await click('.shop-tab', tab);
    await sleep(400);
    await shot('tab' + tab);
  }
  // Rewarded flow: first rewarded item.
  await click('.shop-tab', 3);
  await sleep(300);
  await page.evaluate(() => document.querySelector('.shop-item .btn-purple')?.click());
  await sleep(1800);
  await shot('after-ad');
}

if (scenario === 'room') {
  await click('.hero-card .btn', 2);
  await sleep(1200);
  await page.evaluate(() => {
    const s = (window).__save;
    s.data.stars = 40;
    s.commit();
  });
  await page.evaluate(() => (window).__go('room', { room: 'garden' }));
  await sleep(900);
  await shot('garden');
  await page.evaluate(() => document.querySelector('.decor-strip .btn')?.click());
  await sleep(1200);
  await shot('garden-done');
  await page.evaluate(() => (window).__go('rooms', {}));
  await sleep(800);
  await shot('rooms');
}

console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
