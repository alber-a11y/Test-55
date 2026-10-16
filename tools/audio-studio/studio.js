// Renders the built-in synth music and sound effects to PCM so tools/render-audio.mjs can encode MP3s.
import { MusicPlayer } from '../../src/audio/music.ts';
import { renderLayers, SFX } from '../../src/audio/synth.ts';

const SR = 44100;

function toInt16Base64(data, gain = 1) {
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(data[i] * gain * 32767)));
  const bytes = new Uint8Array(out.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function normGain(data, target = 0.9) {
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  return peak > 0 ? target / peak : 1;
}

/** Render `loops` repetitions; the release tail is folded back onto the start so the file loops seamlessly. */
async function renderMusic(name, loops) {
  const loopLen = MusicPlayer.loopSeconds(name) * loops;
  const tail = 2;
  const ctx = new OfflineAudioContext(1, Math.ceil((loopLen + tail) * SR), SR);
  const player = new MusicPlayer(ctx, ctx.destination);
  player.scheduleLoops(name, loops);
  const buf = await ctx.startRendering();
  const all = buf.getChannelData(0);
  const n = Math.round(loopLen * SR);
  const out = all.slice(0, n);
  for (let i = n; i < all.length; i++) out[i - n] += all[i];
  return { sampleRate: SR, pcm: toInt16Base64(out, normGain(out, 0.85)) };
}

function renderSfx(name) {
  const ctx = new OfflineAudioContext(1, SR, SR);
  const data = renderLayers(ctx, SFX[name]).getChannelData(0);
  return { sampleRate: SR, pcm: toInt16Base64(data, Math.min(1.6, normGain(data, 0.9))) };
}

window.audioStudio = {
  sfxNames: () => Object.keys(SFX),
  renderMusic,
  renderSfx,
};
document.title = 'ready';
