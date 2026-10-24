import { chromium } from 'playwright';
const [url, scene, data, gameKey, stateExpr] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 540, height: 1100 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url);
await page.waitForTimeout(3000);
await page.evaluate(([k, d]) => {
  Object.assign(window.__save.data.tutorial, { tp1: true, ice: true, lock: true, gold: true, bomb: true, kl: true, attack: true, transfer: true, cheat: true });
  window.__adConfig.minGamesFinished = 1e9;
  window.__game.scene.getScenes(true)[0].scene.start(k, JSON.parse(d));
}, [scene, data]);
await page.waitForTimeout(2500);
const before = await page.evaluate(new Function('return (' + stateExpr + ')(window.__game.scene.getScene("' + gameKey + '"))'));
await page.evaluate((k) => window.__game.scene.getScene(k).openPause(), gameKey);
await page.waitForTimeout(800);
await page.screenshot({ path: process.env.OUT });
// Press "Магазин" in the pause menu.
await page.evaluate((k) => {
  const s = window.__game.scene.getScene(k);
  const find = (o) => (o.label && o.label.text === 'Магазин' ? o : o.list ? o.list.map(find).find(Boolean) : null);
  for (const o of s.children.list) {
    const b = find(o);
    if (b) return b.emit('pointerup', { x: 0, y: 0 });
  }
}, gameKey);
await page.waitForFunction(() => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'Shop'), null, { timeout: 60000 });
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Shop');
  s.children.list.find((o) => o.icon && o.icon.texture.key === 'i_back').emit('pointerup', { x: 0, y: 0 });
});
await page.waitForFunction((k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k), gameKey, { timeout: 60000 });
await page.waitForTimeout(1000);
const after = await page.evaluate(new Function('return (' + stateExpr + ')(window.__game.scene.getScene("' + gameKey + '"))'));
console.log(gameKey, 'state kept:', before === after, before, after);
await browser.close();
