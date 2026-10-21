import { audio } from '../audio/audio';
import { pauseHub } from '../core/pause';
import { ICONS } from './icons';

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; html?: string; text?: string; style?: string; onClick?: (e: MouseEvent) => void; [k: string]: unknown } = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k === 'onClick')
      el.addEventListener('click', (e) => {
        audio.unlock();
        (v as (e: MouseEvent) => void)(e as MouseEvent);
      });
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export interface BtnOpts {
  variant?: 'primary' | 'green' | 'pink' | 'ghost' | 'blue' | 'gold';
  icon?: string;
  /** Rewarded-ad button: shows the TV badge. */
  ad?: boolean;
  small?: boolean;
  sub?: string;
  disabled?: boolean;
  class?: string;
}

export function btn(label: string, onClick: () => void, o: BtnOpts = {}): HTMLButtonElement {
  const b = h(
    'button',
    {
      class: `btn btn-${o.variant ?? 'primary'}${o.small ? ' btn-small' : ''}${o.class ? ' ' + o.class : ''}`,
      onClick: () => {
        if (b.disabled) return;
        audio.play('click');
        onClick();
      },
    },
    [
      o.ad ? h('span', { class: 'ad-badge', html: ICONS.ad }) : null,
      o.icon ? h('span', { class: 'btn-icon', html: o.icon }) : null,
      h('span', { class: 'btn-label' }, [label, o.sub ? h('small', { text: o.sub }) : null]),
    ],
  );
  if (o.disabled) b.disabled = true;
  return b;
}

export function iconBtn(icon: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return h('button', {
    class: `icon-btn ${cls}`,
    html: icon,
    onClick: () => {
      audio.play('click');
      onClick();
    },
  });
}

// ---------- modals ----------

let openCount = 0;
const modalListeners: (() => void)[] = [];
export function onModalChange(f: () => void): void {
  modalListeners.push(f);
}
export function modalOpen(): boolean {
  return openCount > 0;
}

export interface ModalHandle {
  close(): void;
  card: HTMLElement;
}

export function openModal(
  content: Child[],
  o: { title?: string; onClose?: () => void; closable?: boolean; class?: string } = {},
): ModalHandle {
  const root = document.getElementById('app')!;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.classList.add('out');
    window.setTimeout(() => overlay.remove(), 180);
    openCount--;
    pauseHub.set('modal', openCount > 0);
    modalListeners.forEach((f) => f());
    o.onClose?.();
  };
  const card = h('div', { class: `modal-card ${o.class ?? ''}` }, [
    o.closable ? iconBtn(ICONS.close, close, 'modal-x') : null,
    o.title ? h('div', { class: 'modal-title', text: o.title }) : null,
    ...content,
  ]);
  const overlay = h('div', { class: 'modal' }, [card]);
  root.appendChild(overlay);
  openCount++;
  pauseHub.set('modal', true);
  modalListeners.forEach((f) => f());
  return { close, card };
}

export function closeAllModals(): void {
  document.querySelectorAll('.modal .modal-x').forEach((b) => (b as HTMLElement).click());
}

// ---------- toast ----------

export function toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
  let box = document.querySelector('.toasts') as HTMLElement | null;
  if (!box) {
    box = h('div', { class: 'toasts' });
    document.body.appendChild(box);
  }
  const el = h('div', { class: `toast toast-${kind}`, text });
  box.appendChild(el);
  window.setTimeout(() => el.classList.add('out'), 1800);
  window.setTimeout(() => el.remove(), 2200);
}
