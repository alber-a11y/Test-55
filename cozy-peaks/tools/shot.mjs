// Screenshot helper: node tools/shot.mjs <url> <out.png> [width] [height]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, outFile, w = '1600', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForTimeout(+(process.env.WAIT ?? 1500));
await page.screenshot({ path: outFile, fullPage: process.env.FULL === '1' });
if (errors.length) console.log('ERRORS:', errors.join('\n'));
await browser.close();
