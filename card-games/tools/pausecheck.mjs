import { chromium } from 'playwright';
const [url, scene, data] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 540, height: 1100 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url);
await page.waitForTimeout(3000);
await page.evaluate(([k, d]) => {
  Object.assign(window.__save.data.tutorial, { tp1: true, ice: true, lock: true, gold: true, bomb: true, kl: true, attack: true, transfer: true, cheat: true });
  window.__game.scene.getScenes(true)[0].scene.start(k, JSON.parse(d));
}, [scene, data]);
await page.waitForTimeout(2500);
const pos = await page.evaluate(() => {
  const c = document.querySelector('#game canvas').getBoundingClientRect();
  const g = window.__game;
  return [c.left + (75 / g.scale.width) * c.width, c.top + (75 / g.scale.height) * c.height];
});
await page.mouse.click(pos[0], pos[1]);
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const modal = s.children.list.filter((o) => o.depth >= 2500 && o.type === 'Container');
  return { scene: s.scene.key, modals: modal.map((m) => m.alpha) };
});
console.log(JSON.stringify(r));
await page.screenshot({ path: process.env.OUT || '/tmp/pause.png' });
await browser.close();
