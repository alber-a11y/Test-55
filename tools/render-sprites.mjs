// Renders every 3D character into public/sprites (webp sheets + portraits + manifest.json).
// Usage: npm run sprites            (all)
//        npm run sprites -- hero_rocky_0 boss_golem   (only these keys)
// Needs a Chromium for Playwright: `npx playwright install chromium` (once).
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../public/sprites');
const only = process.argv.slice(2);

/** Cell heights (px) per kind and portrait heights. */
const CELL = { hero: 132, enemy: 124, boss: 240, turret: 110 };
const kindOf = (k) => (k.startsWith('hero_') ? 'hero' : k.startsWith('enemy_') ? 'enemy' : k.startsWith('boss_') ? 'boss' : 'turret');

mkdirSync(OUT, { recursive: true });
const manifestPath = resolve(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) && only.length ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { sheets: {}, portraits: [] };

const server = await createServer({ root: resolve(here, 'sprite-studio'), logLevel: 'error', server: { port: 5181, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.studio, null, { timeout: 120000 });

const keys = (await page.evaluate(() => window.studio.keys())).filter((k) => !only.length || only.includes(k));
const save = (name, dataUrl) => writeFileSync(resolve(OUT, `${name}.webp`), Buffer.from(dataUrl.split(',')[1], 'base64'));
const t0 = Date.now();
for (const [i, key] of keys.entries()) {
  const kind = kindOf(key);
  const sheet = await page.evaluate(([k, h]) => window.studio.renderSheet(k, { cellH: h }), [key, CELL[kind]]);
  save(key, sheet.url);
  delete sheet.url;
  manifest.sheets[key] = sheet;
  // Menu portraits: heroBig_<skin> and bossBig_<id>.
  let portrait = null;
  if (kind === 'hero') portrait = key.replace('hero_', 'heroBig_');
  if (kind === 'boss') portrait = key.replace('boss_', 'bossBig_');
  if (portrait) {
    save(portrait, await page.evaluate(([k, h]) => window.studio.renderPortrait(k, { outH: h }), [key, kind === 'boss' ? 300 : 330]));
    if (!manifest.portraits.includes(portrait)) manifest.portraits.push(portrait);
  }
  console.log(`[${i + 1}/${keys.length}] ${key}  ${sheet.cellW}x${sheet.cellH}  (${Math.round((Date.now() - t0) / 1000)}s)`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
await browser.close();
await server.close();
