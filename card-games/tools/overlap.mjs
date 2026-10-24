// Finds overlapping texts / buttons on every screen. Usage: node tools/overlap.mjs <url> <scenes.json> [WxH,...]
import { chromium } from 'playwright';
import fs from 'node:fs';

const [url, scenesFile, sizesArg = '540x1100,390x844,1280x720,1024x768'] = process.argv.slice(2);
const scenes = JSON.parse(fs.readFileSync(scenesFile, 'utf8'));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-webgl'] });
let total = 0;
for (const size of sizesArg.split(',')) {
  const [w, h] = size.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log(`[${size}] ERR`, e.message));
  await page.goto(url);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    Object.assign(window.__save.data.tutorial, { tp1: true, ice: true, lock: true, gold: true, bomb: true, kl: true, attack: true, transfer: true, cheat: true, menu: true });
  });
  for (const [key, data, pre] of scenes) {
    await page.evaluate(([k, d, pre]) => {
      if (pre) new Function(pre)();
      window.__game.scene.getScenes(true)[0].scene.start(k, d);
    }, [key, data, pre ?? null]);
    await page.waitForTimeout(1200);
    const issues = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      const items = [];
      const isButton = (o) => o.type === 'Container' && typeof o.onClick === 'function';
      const visible = (o) => {
        for (let p = o; p; p = p.parentContainer) if (!p.visible || p.alpha < 0.05) return false;
        return true;
      };
      const walk = (o, inButton) => {
        if (!o.visible) return;
        if (isButton(o)) {
          if (visible(o) && o.input?.enabled !== false) items.push({ kind: 'btn', name: o.label?.text ?? o.icon?.texture?.key ?? 'btn', b: o.getBounds() });
          return; // own label/icon belong to the button
        }
        if (o.type === 'Text' && !inButton && visible(o) && o.text.trim()) items.push({ kind: 'txt', name: o.text.slice(0, 30).replace(/\n/g, ' '), b: o.getBounds() });
        if (o.list) for (const c of o.list) walk(c, inButton);
      };
      for (const o of s.children.list) walk(o, false);
      const W = s.scale.width;
      const H = s.scale.height;
      const out = [];
      for (const it of items) {
        const b = it.b;
        if (b.right > W + 4 || b.left < -4 || b.bottom > H + 4 || b.top < -4) {
          // Inside a masked scroller the content may legitimately extend off screen.
          if (b.top > H || b.bottom < 0) continue;
          if (it.kind === 'btn' || b.left < -4 || b.right > W + 4) out.push(`OFFSCREEN ${it.kind} "${it.name}"`);
        }
      }
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].b;
          const c = items[j].b;
          const ix = Math.min(a.right, c.right) - Math.max(a.left, c.left);
          const iy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ix <= 2 || iy <= 2) continue;
          const area = ix * iy;
          const small = Math.min(a.width * a.height, c.width * c.height);
          if (area / small > 0.12) out.push(`OVERLAP ${items[i].kind} "${items[i].name}" × ${items[j].kind} "${items[j].name}" (${Math.round((area / small) * 100)}%)`);
        }
      return out;
    });
    if (issues.length) {
      total += issues.length;
      console.log(`[${size}] ${key}`);
      for (const i of [...new Set(issues)]) console.log('   ', i);
    }
  }
  await page.close();
}
console.log('TOTAL', total);
await browser.close();
