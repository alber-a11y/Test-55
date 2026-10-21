import { audio } from '../audio/audio';
import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { fxRng } from '../core/rng';
import { persist, save } from '../core/save';
import { todayKey } from '../core/util';
import { boosterName } from '../game/boosters';
import { watchAd } from './app';
import { btn, h, openModal, toast } from './dom';
import { boosterIcon, ICONS } from './icons';
import { grantPrize, type Prize } from './daily';

const SECTORS: { prize: Prize; color: string; weight: number }[] = [
  { prize: { coins: 30, boosters: [] }, color: '#ff4f86', weight: 18 },
  { prize: { coins: 0, boosters: ['bomb'] }, color: '#ffae2b', weight: 12 },
  { prize: { coins: 60, boosters: [] }, color: '#2fd796', weight: 14 },
  { prize: { coins: 0, boosters: ['rowRocket'] }, color: '#3f9dff', weight: 12 },
  { prize: { coins: 120, boosters: [] }, color: '#b26bff', weight: 8 },
  { prize: { coins: 0, boosters: ['magic'] }, color: '#ff7440', weight: 10 },
  { prize: { coins: 0, boosters: ['time', 'hammer'] }, color: '#27dcdc', weight: 10 },
  { prize: { coins: 300, boosters: [] }, color: '#f2dc3a', weight: 3 },
];

function prizeLabel(p: Prize): string {
  const parts: string[] = [];
  if (p.coins) parts.push(`${p.coins} ${t('over.coins').toLowerCase()}`);
  for (const b of p.boosters) parts.push(t(boosterName(b)));
  return parts.join(' + ');
}

export function openWheel(): void {
  const today = todayKey();
  if (save.daily.wheelAdDate !== today) {
    save.daily.wheelAdDate = today;
    save.daily.wheelAdUsed = 0;
  }
  const n = SECTORS.length;
  const seg = 360 / n;
  const gradient = SECTORS.map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const disc = h('div', { class: 'wheel-disc', style: `background:conic-gradient(${gradient})` });
  SECTORS.forEach((s, i) => {
    const icon = s.prize.coins ? ICONS.coin : boosterIcon(s.prize.boosters[0]);
    disc.appendChild(
      h('div', { class: 'wheel-label', style: `transform:rotate(${i * seg + seg / 2}deg)` }, [
        h('span', { html: icon }),
        s.prize.coins ? h('b', { text: String(s.prize.coins) }) : s.prize.boosters.length > 1 ? h('b', { text: '×2' }) : null,
      ]),
    );
  });
  let angle = 0;
  let spinning = false;
  const info = h('p', { class: 'modal-hint' });
  const buttons = h('div', { class: 'modal-buttons' });
  const render = () => {
    buttons.innerHTML = '';
    const free = save.daily.wheelFree !== today;
    const left = CONFIG.economy.wheelAdSpinsPerDay - save.daily.wheelAdUsed;
    info.textContent = free ? '' : left > 0 ? t('wheel.left', { n: left }) : t('wheel.none');
    if (free) buttons.appendChild(btn(t('wheel.free'), () => spin('free'), { variant: 'green' }));
    else if (left > 0)
      buttons.appendChild(
        btn(
          t('wheel.ad'),
          async () => {
            if (spinning) return;
            if (await watchAd('wheel')) {
              save.daily.wheelAdUsed++;
              spin('ad');
            }
          },
          { variant: 'gold', ad: true },
        ),
      );
  };
  const spin = (kind: 'free' | 'ad') => {
    if (spinning) return;
    spinning = true;
    if (kind === 'free') save.daily.wheelFree = today;
    persist(true);
    const idx = SECTORS.indexOf(fxRng.weighted(SECTORS, (s) => s.weight));
    // Pointer is at the top; sector i spans [i*seg, (i+1)*seg] clockwise from the top.
    const target = 360 - (idx * seg + seg / 2) + fxRng.range(-seg * 0.3, seg * 0.3);
    angle += 360 * 5 + ((target - (angle % 360) + 360) % 360);
    disc.style.transform = `rotate(${angle}deg)`;
    buttons.innerHTML = '';
    let ticks = 0;
    const iv = window.setInterval(() => {
      if (ticks++ < 30) audio.play('spin');
    }, 110);
    window.setTimeout(() => {
      clearInterval(iv);
      spinning = false;
      const prize = SECTORS[idx].prize;
      grantPrize(prize);
      audio.play('win');
      toast(t('wheel.win', { prize: prizeLabel(prize) }), 'good');
      render();
    }, 4200);
  };
  render();
  openModal([h('div', { class: 'wheel' }, [disc, h('div', { class: 'wheel-pointer' }), h('div', { class: 'wheel-hub' })]), info, buttons], {
    title: t('wheel.title'),
    closable: true,
    class: 'wheel-modal',
  });
}
