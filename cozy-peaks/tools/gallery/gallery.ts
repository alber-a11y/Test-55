import '@fontsource/nunito/900.css';
import { cardBack, cardFace, wildFace, BACK_IDS } from '../../src/art/cards';
import { heroPortrait } from '../../src/art/heroes';
import { ICONS } from '../../src/art/icons';
import { itemThumb, roomSvg } from '../../src/art/rooms';
import { HEROES } from '../../src/meta/heroes';
import { ROOMS } from '../../src/meta/rooms';

const q = new URLSearchParams(location.search);
const what = q.get('w') ?? 'cards';
const out = document.getElementById('out')!;
const row = (html: string) => (out.innerHTML += `<div class="row">${html}</div>`);
if (what === 'cards') {
  for (let s = 0; s < 4; s++) row(Array.from({ length: 13 }, (_, i) => `<div class="card">${cardFace({ r: i + 1, s: s as 0 })}</div>`).join(''));
  row(BACK_IDS.map((b) => `<div class="card">${cardBack(b)}</div>`).join('') + `<div class="card">${wildFace()}</div>`);
  row(HEROES.flatMap((h) => ['happy', 'wow', 'think'].map((m) => `<div class="hero">${heroPortrait(h, m as 'happy')}</div>`)).join(''));
  row(Object.values(ICONS).map((i) => `<div class="ico">${i}</div>`).join(''));
}
if (what === 'rooms') {
  const room = ROOMS.find((r) => r.id === (q.get('r') ?? 'garden'))!;
  const stage = +(q.get('s') ?? 0);
  const v = +(q.get('v') ?? 0);
  const tasks: Record<string, number> = {};
  if (q.get('done')) room.tasks.forEach((t) => (tasks[t.id] = v));
  row(`<div class="room">${roomSvg(room.id, { tasks, bonus: q.get('done') ? room.bonus.map((b) => b.id) : [], stage })}</div>`);
}
if (what === 'thumbs') {
  for (const room of ROOMS) row(room.tasks.flatMap((t) => [-1, 0, 1, 2, 3].map((v) => `<div class="th">${itemThumb(room.id, t.id, v)}</div>`)).join(''));
}
document.title = 'ready';
