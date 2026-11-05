import { audio } from '../audio/audio';
import { icon, type IconName } from '../art/icons';
import { formatNum, t } from '../core/i18n';
import { pauseHub } from '../core/pause';
import type { Price } from '../meta/shop';
import { h, svgEl } from './dom';
import { stage } from './stage';

export type BtnVariant = 'green' | 'purple' | 'cream' | 'blue' | 'red' | 'gold';

export interface BtnOpts {
  variant?: BtnVariant;
  icon?: IconName;
  /** Star or coin price shown on the right. */
  cost?: { kind: 'star' | 'coin'; n: number };
  /** Rewarded marker (▶ icon). */
  ad?: boolean;
  small?: boolean;
  big?: boolean;
  cls?: string;
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void;
}

export function button(label: string, o: BtnOpts = {}): HTMLButtonElement {
  const b = h('button', { class: `btn btn-${o.variant ?? 'green'} ${o.small ? 'btn-sm' : ''} ${o.big ? 'btn-big' : ''} ${o.cls ?? ''}` });
  if (o.ad) b.append(svgEl(icon('ad'), 'btn-ico'));
  else if (o.icon) b.append(svgEl(icon(o.icon), 'btn-ico'));
  if (label) b.append(h('span', { class: 'btn-label', text: label }));
  if (o.cost) b.append(h('span', { class: 'btn-cost' }, svgEl(icon(o.cost.kind === 'star' ? 'star' : 'coin'), 'btn-cost-ico'), h('span', { text: formatNum(o.cost.n) })));
  if (o.disabled) b.disabled = true;
  b.addEventListener('click', (e) => {
    if (b.disabled) return;
    audio.play('click');
    o.onClick?.(e);
  });
  return b;
}

/** Button for a shop price: coins, rewarded views (with progress) or free. */
export function priceButton(price: Price, progress: number, onClick: () => void, extra: Partial<BtnOpts> = {}): HTMLButtonElement {
  if ('coins' in price) return button('', { variant: 'gold', cost: { kind: 'coin', n: price.coins }, small: true, onClick, ...extra });
  if ('ads' in price) {
    const label = price.ads > 1 ? t('adProgress', { a: progress, b: price.ads }) : t('watchAd');
    return button(label, { variant: 'purple', ad: true, small: true, onClick, ...extra });
  }
  return button(t('adFree'), { variant: 'green', small: true, onClick, ...extra });
}

export function iconEl(name: IconName, cls = ''): HTMLElement {
  return svgEl(icon(name), `ico-wrap ${cls}`);
}

/** Plum ribbon title like "Level 142" on the reference panels. */
export function ribbon(text: string, cls = ''): HTMLElement {
  return h('div', { class: `ribbon ${cls}` }, h('span', { text }));
}

export function panel(cls = '', ...children: (Node | string)[]): HTMLElement {
  return h('div', { class: `panel ${cls}` }, ...children);
}

/* ---------- modals ---------- */

let modalDepth = 0;

export interface Modal {
  el: HTMLElement;
  body: HTMLElement;
  close: () => void;
  closed: Promise<void>;
}

export function modal(opts: { title?: string; cls?: string; closable?: boolean; onClose?: () => void; pause?: boolean } = {}): Modal {
  const root = document.getElementById('modals')!;
  const body = h('div', { class: 'modal-body' });
  const card = h('div', { class: `modal panel ${opts.cls ?? ''}` });
  if (opts.title) card.append(ribbon(opts.title, 'modal-ribbon'));
  card.append(body);
  const back = h('div', { class: 'modal-back' }, card);
  let resolve!: () => void;
  const closed = new Promise<void>((r) => (resolve = r));
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    back.classList.add('out');
    modalDepth--;
    if (opts.pause) pauseHub.set('modal', modalDepth > 0);
    setTimeout(() => back.remove(), 180);
    opts.onClose?.();
    resolve();
  };
  if (opts.closable !== false) {
    const x = h('button', { class: 'modal-x', 'aria-label': t('close'), onclick: () => (audio.play('click'), close()) }, iconEl('close'));
    card.append(x);
    back.addEventListener('click', (e) => e.target === back && close());
  }
  root.append(back);
  modalDepth++;
  if (opts.pause) pauseHub.set('modal', true);
  audio.play('pop');
  return { el: card, body, close, closed };
}

export function anyModalOpen(): boolean {
  return modalDepth > 0;
}

export function closeAllModals(): void {
  document.querySelectorAll('#modals .modal-x').forEach((b) => (b as HTMLButtonElement).click());
}

/* ---------- toasts & effects ---------- */

export function toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
  const root = document.getElementById('toasts')!;
  const el = h('div', { class: `toast toast-${kind}`, text });
  root.append(el);
  setTimeout(() => el.classList.add('out'), 2200);
  setTimeout(() => el.remove(), 2600);
}

/** Float text that rises and fades at a stage position. */
export function floatText(text: string, x: number, y: number, cls = ''): void {
  const el = h('div', { class: `float-text ${cls}`, text, style: `left:${x}px;top:${y}px` });
  document.getElementById('fx')!.append(el);
  setTimeout(() => el.remove(), 1300);
}

/** Icons flying from a point to a HUD target (coins, stars). */
export function flyIcons(name: IconName, from: { x: number; y: number }, targetSel: string, count = 6): void {
  const target = document.querySelector(targetSel);
  if (!target) return;
  const to = stage.rect(target);
  const fx = document.getElementById('fx')!;
  for (let i = 0; i < count; i++) {
    const el = svgEl(icon(name), 'fly-ico');
    el.style.left = `${from.x}px`;
    el.style.top = `${from.y}px`;
    fx.append(el);
    const dx = to.x + to.w / 2 - from.x;
    const dy = to.y + to.h / 2 - from.y;
    const jx = (Math.random() - 0.5) * 120;
    const jy = (Math.random() - 0.5) * 80;
    el.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${jx}px), calc(-50% + ${jy}px)) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 1 },
      ],
      { duration: 800 + i * 60, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'forwards' },
    ).onfinish = () => {
      el.remove();
      if (i === 0) {
        target.classList.remove('bump');
        void (target as HTMLElement).offsetWidth;
        target.classList.add('bump');
      }
    };
  }
}

export function confetti(n = 60): void {
  const fx = document.getElementById('fx')!;
  const colors = ['#ff6b6b', '#ffd23f', '#5ec7ff', '#7ee08a', '#b892e8', '#ff8fd0'];
  for (let i = 0; i < n; i++) {
    const el = h('div', { class: 'confetti', style: `left:${Math.random() * stage.w}px;background:${colors[i % colors.length]}` });
    fx.append(el);
    el.animate(
      [
        { transform: `translateY(-40px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 200}px, ${stage.h + 60}px) rotate(${Math.random() * 720}deg)`, opacity: 0.9 },
      ],
      { duration: 1600 + Math.random() * 1400, delay: Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
    ).onfinish = () => el.remove();
  }
}

/** Tick a number element up to a value. */
export function countUp(el: HTMLElement, to: number, ms = 700): void {
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = String(to);
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = formatNum(Math.round(from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
