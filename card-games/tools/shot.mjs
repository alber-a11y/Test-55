// Usage: node tools/shot.mjs <url> <out.png> [WxH] [waitMs] [script.js]
// Takes a screenshot of the game; optional script runs in the page after load (window.__game available with ?debug).
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, out, size = '540x1100', wait = '2500', script] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(Number(wait));
if (script) {
  const code = fs.readFileSync(script, 'utf8');
  await page.evaluate(code);
  await page.waitForTimeout(Number(process.env.AFTER || 1500));
}
await page.screenshot({ path: out });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
