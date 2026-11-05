import { audio } from '../audio/audio';
import { BOOSTER_ICON } from '../art/icons';
import { t, tr } from '../core/i18n';
import { bumpGoal } from '../meta/goals';
import { extraSpinsLeft, freeSpinReady, spin, WHEEL } from '../meta/wheel';
import { ads } from '../platform/AdManager';
import { h } from './dom';
import { rewardChip } from './dialogs';
import { button, confetti, modal, toast } from './widgets';

const SEG = 360 / WHEEL.length;

function wheelSvg(): string {
  const R = 200;
  let o = '';
  WHEEL.forEach((s, i) => {
    const a0 = ((i * SEG - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * SEG - 90) * Math.PI) / 180;
    const am = (((i + 0.5) * SEG - 90) * Math.PI) / 180;
    o += `<path d="M0 0 L${Math.cos(a0) * R} ${Math.sin(a0) * R} A${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} Z" fill="${s.color}" stroke="#fff" stroke-width="5"/>`;
    const tx = Math.cos(am) * R * 0.64;
    const ty = Math.sin(am) * R * 0.64;
    o += `<text x="${tx}" y="${ty}" transform="rotate(${(i + 0.5) * SEG} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-family="Nunito, Arial" font-weight="900" font-size="${s.label.ru.length > 5 ? 26 : 32}" fill="#4a2c1c">${tr(s.label)}</text>`;
  });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    o += `<circle cx="${Math.cos(a) * (R + 16)}" cy="${Math.sin(a) * (R + 16)}" r="6" fill="${i % 2 ? '#fff6c2' : '#ffd23f'}"/>`;
  }
  return `<svg viewBox="-240 -240 480 480" xmlns="http://www.w3.org/2000/svg"><circle r="${R + 30}" fill="#7a3b5e" stroke="#5a2746" stroke-width="8"/>${o}<circle r="42" fill="#7a3b5e" stroke="#fff" stroke-width="6"/></svg>`;
}

/** Daily lucky wheel: one free spin a day, a few more for rewarded ads. */
export function wheelModal(onChange?: () => void): void {
  const m = modal({ title: t('wheel'), cls: 'm-wheel' });
  const disc = h('div', { class: 'wheel-disc', html: wheelSvg() });
  const pointer = h('div', { class: 'wheel-pointer' });
  const result = h('div', { class: 'wheel-result' });
  const actions = h('div', { class: 'row-btns' });
  let angle = 0;
  let spinning = false;

  const render = () => {
    actions.replaceChildren();
    if (freeSpinReady()) actions.append(button(t('spinFree'), { big: true, onClick: () => go(false) }));
    else if (extraSpinsLeft() > 0) actions.append(button(`${t('spinMore')} · ${extraSpinsLeft()}`, { ad: true, variant: 'purple', onClick: () => go(true) }));
    else actions.append(h('div', { class: 'muted', text: t('spinTomorrow') }));
  };

  const go = async (paid: boolean) => {
    if (spinning) return;
    if (paid) {
      const ok = await ads.rewarded('wheel_spin');
      if (!ok) return toast(t('adNotReady'), 'bad');
      bumpGoal('ads');
    }
    spinning = true;
    result.replaceChildren();
    const idx = spin();
    // Bring the middle of the won segment under the pointer at the top.
    const target = 360 - (idx + 0.5) * SEG;
    angle += 360 * 6 + ((target - (angle % 360)) + 360) % 360;
    disc.style.transform = `rotate(${angle}deg)`;
    let ticks = 0;
    const tick = window.setInterval(() => {
      audio.play('click', { rate: 1.2, throttleMs: 0 });
      if (++ticks > 26) clearInterval(tick);
    }, 140);
    window.setTimeout(() => {
      clearInterval(tick);
      spinning = false;
      const p = WHEEL[idx].prize;
      audio.play('chest');
      if (p.kind === 'coins' && p.n >= 1000) confetti(60);
      const chip =
        p.kind === 'coins'
          ? rewardChip('coin', `+${p.n}`)
          : p.kind === 'booster'
            ? rewardChip(BOOSTER_ICON[p.id], `+${p.n}`, tr(WHEEL[idx].label))
            : p.kind === 'stars'
              ? rewardChip('star', `+${p.n}`)
              : rewardChip('heart', `∞ ${p.minutes}′`);
      result.replaceChildren(h('b', { text: t('youWon') }), chip);
      render();
      onChange?.();
    }, 4200);
    render();
    actions.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
  };

  m.body.append(h('div', { class: 'wheel-wrap' }, disc, pointer), result, actions);
  render();
}
