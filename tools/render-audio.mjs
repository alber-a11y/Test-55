// Exports the built-in synth music and sound effects to public/audio/*.mp3.
// The game loads these files at runtime — replace any of them with your own .mp3 (same name).
// Usage: npm run audio            (all)
//        npm run audio -- music   (only music)   |   npm run audio -- sfx
// Note: running this overwrites files in public/audio — back up your own tracks first.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// lamejs' CommonJS entry is broken (MPEGMode is not defined); its single-file bundle works.
const sandbox = {};
vm.runInNewContext(readFileSync(resolve(here, '../node_modules/lamejs/lame.all.js'), 'utf8') + '\nthis.lamejs = lamejs;', sandbox);
const lamejs = sandbox.lamejs;
const OUT = resolve(here, '../public/audio');
const what = process.argv[2] ?? 'all';
/** Music slots and how many loop repetitions to put in each file. */
const MUSIC = { menu: 2, battle: 2, boss: 4 };

function encodeMp3(pcmBase64, sampleRate, kbps) {
  const buf = Buffer.from(pcmBase64, 'base64');
  const samples = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  const enc = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const out = enc.encodeBuffer(samples.subarray(i, i + 1152));
    if (out.length) chunks.push(Buffer.from(out));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

mkdirSync(OUT, { recursive: true });
const server = await createServer({ root: resolve(here, 'audio-studio'), logLevel: 'error', server: { port: 5182, strictPort: false } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.audioStudio, null, { timeout: 120000 });

if (what === 'all' || what === 'music') {
  for (const [name, loops] of Object.entries(MUSIC)) {
    const r = await page.evaluate(([n, l]) => window.audioStudio.renderMusic(n, l), [name, loops]);
    const mp3 = encodeMp3(r.pcm, r.sampleRate, 48);
    writeFileSync(resolve(OUT, `music_${name}.mp3`), mp3);
    console.log(`music_${name}.mp3  ${(mp3.length / 1024).toFixed(0)} KB`);
  }
}
if (what === 'all' || what === 'sfx') {
  const names = await page.evaluate(() => window.audioStudio.sfxNames());
  for (const name of names) {
    const r = await page.evaluate((n) => window.audioStudio.renderSfx(n), name);
    const mp3 = encodeMp3(r.pcm, r.sampleRate, 64);
    writeFileSync(resolve(OUT, `sfx_${name}.mp3`), mp3);
  }
  console.log(`${names.length} sfx files`);
}
await browser.close();
await server.close();
