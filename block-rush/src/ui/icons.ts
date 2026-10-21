import type { BoosterId } from '../game/boosters';

const svg = (body: string, vb = 32) => `<svg viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  coin: svg(
    '<circle cx="16" cy="17" r="12" fill="#c7861a"/><circle cx="16" cy="15" r="12" fill="#ffc93c"/><circle cx="16" cy="15" r="8.5" fill="#ffdf73" stroke="#e8a21f" stroke-width="1.6"/><path d="M13 10.5h6v2.2h-3.6v1.6H19v2.2h-3.6V20H13z" fill="#d88f12"/>',
  ),
  gem: svg(
    '<path d="M9 5h14l6 8-13 15L3 13z" fill="#6ee8ff"/><path d="M9 5h14l6 8H3z" fill="#b8f6ff"/><path d="M3 13h26L16 28z" fill="#5b8cff"/><path d="M16 28l-5-15h10z" fill="#9b6bff"/><path d="M11 13l5-8 5 8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>',
  ),
  star: svg('<path d="M16 3l4 8.3 9 1.3-6.5 6.3 1.6 9L16 23.6 7.9 28l1.6-9L3 12.6l9-1.3z" fill="#ffd23f" stroke="#e59400" stroke-width="1.5" stroke-linejoin="round"/>'),
  starEmpty: svg('<path d="M16 3l4 8.3 9 1.3-6.5 6.3 1.6 9L16 23.6 7.9 28l1.6-9L3 12.6l9-1.3z" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-linejoin="round"/>'),
  ad: svg(
    '<rect x="3" y="7" width="26" height="18" rx="4" fill="#fff"/><path d="M13 11.5v9l8-4.5z" fill="#ff4f86"/><path d="M11 3l5 4 5-4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  ),
  pause: svg('<rect x="8" y="6" width="6" height="20" rx="2" fill="currentColor"/><rect x="18" y="6" width="6" height="20" rx="2" fill="currentColor"/>'),
  play: svg('<path d="M10 6l16 10-16 10z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  gear: svg(
    '<path d="M16 4l2.4 3.2 3.9-.9.6 4 3.6 1.9-1.6 3.7 1.6 3.7-3.6 1.9-.6 4-3.9-.9L16 28l-2.4-3.2-3.9.9-.6-4-3.6-1.9 1.6-3.7-1.6-3.7 3.6-1.9.6-4 3.9.9z" fill="currentColor"/><circle cx="16" cy="16" r="4.5" fill="#2b1960"/>',
  ),
  home: svg('<path d="M4 15L16 5l12 10v12H19v-8h-6v8H4z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  retry: svg('<path d="M24.5 12A9.5 9.5 0 1 0 25 19" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M27 5v8.5h-8.5z" fill="currentColor"/>'),
  close: svg('<path d="M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
  back: svg('<path d="M20 6L10 16l10 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'),
  music: svg('<path d="M12 23V7l14-3v16" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="8.5" cy="23.5" r="4.5" fill="currentColor"/><circle cx="22.5" cy="20.5" r="4.5" fill="currentColor"/>'),
  sound: svg('<path d="M4 12h6l7-6v20l-7-6H4z" fill="currentColor"/><path d="M21 11a7 7 0 0 1 0 10M24.5 7.5a12 12 0 0 1 0 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  shop: svg(
    '<path d="M5 12h22l-2 15H7z" fill="#ff7a59"/><path d="M5 12h22l-1 4H6z" fill="#ffb199"/><path d="M11 12V9a5 5 0 0 1 10 0v3" fill="none" stroke="#fff" stroke-width="2.6"/>',
  ),
  chest: svg(
    '<rect x="4" y="13" width="24" height="14" rx="2.5" fill="#b8642e"/><path d="M4 13a12 7 0 0 1 24 0z" fill="#d9843f"/><rect x="4" y="12" width="24" height="3.5" fill="#ffc93c"/><rect x="14" y="11" width="4" height="7" rx="1" fill="#ffe27a" stroke="#b07a12"/><rect x="14.5" y="15" width="3" height="12" fill="#ffc93c"/>',
  ),
  wheel: svg(
    '<circle cx="16" cy="16" r="13" fill="#fff"/><path d="M16 16V3a13 13 0 0 1 11.3 6.5z" fill="#ff4f86"/><path d="M16 16l11.3-6.5a13 13 0 0 1 0 13z" fill="#ffae2b"/><path d="M16 16l11.3 6.5A13 13 0 0 1 16 29z" fill="#2fd796"/><path d="M16 16v13a13 13 0 0 1-11.3-6.5z" fill="#3f9dff"/><path d="M16 16L4.7 22.5a13 13 0 0 1 0-13z" fill="#b26bff"/><path d="M16 16L4.7 9.5A13 13 0 0 1 16 3z" fill="#27dcdc"/><circle cx="16" cy="16" r="3" fill="#2b1960"/>',
  ),
  map: svg(
    '<path d="M3 7l8-3 10 3 8-3v21l-8 3-10-3-8 3z" fill="#5fd38d"/><path d="M11 4v21M21 7v21" stroke="#2f9c5c" stroke-width="1.6"/><path d="M8 18c3-5 7 1 10-4s5-2 7-4" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2.5 2.5"/>',
  ),
  lock: svg('<rect x="7" y="14" width="18" height="13" rx="3" fill="currentColor"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="3"/>'),
  clock: svg('<circle cx="16" cy="17" r="11" fill="#fff"/><circle cx="16" cy="17" r="8.5" fill="#3f9dff"/><path d="M16 11v6l4 3" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/><rect x="13" y="3" width="6" height="3" rx="1" fill="#fff"/>'),
  trophy: svg('<path d="M9 5h14v6a7 7 0 0 1-14 0z" fill="#ffc93c"/><path d="M9 7H4a5 5 0 0 0 5 6M23 7h5a5 5 0 0 1-5 6" fill="none" stroke="#ffc93c" stroke-width="2.4"/><rect x="14" y="17" width="4" height="5" fill="#e59400"/><rect x="9" y="22" width="14" height="5" rx="1.5" fill="#e59400"/>'),
  globe: svg('<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M4 16h24M16 4c-6 7-6 17 0 24M16 4c6 7 6 17 0 24" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
  vibro: svg('<rect x="10" y="4" width="12" height="24" rx="3" fill="currentColor"/><path d="M5 11v10M27 11v10M2 14v4M30 14v4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
};

const B: Record<BoosterId, string> = {
  hammer: svg(
    '<rect x="14.5" y="12" width="4" height="17" rx="2" transform="rotate(-38 16 20)" fill="#c98a4b"/><g transform="rotate(-38 16 11)"><rect x="6" y="6" width="20" height="9" rx="2.5" fill="#9aa7bf"/><rect x="6" y="6" width="20" height="3.5" rx="1.7" fill="#d6deeb"/></g>',
  ),
  bomb: svg(
    '<circle cx="14" cy="19" r="10" fill="#38305c"/><circle cx="10.5" cy="15.5" r="3" fill="#7b70b8"/><rect x="17" y="6" width="6" height="5" rx="1" transform="rotate(40 20 8)" fill="#7b70b8"/><path d="M22 6c2-3 4-3 6-1" stroke="#c98a4b" stroke-width="2" fill="none"/><path d="M28 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#ffd23f"/>',
  ),
  mega: svg(
    '<circle cx="15" cy="18" r="11" fill="#ff4f6a"/><circle cx="11" cy="14" r="3.4" fill="#ffa3b1"/><path d="M8 18h14M15 11v14" stroke="#fff" stroke-width="2.2" stroke-opacity=".6"/><path d="M23 7c2-3 4-3 6-1" stroke="#c98a4b" stroke-width="2" fill="none"/><path d="M28 1l1.2 3.3 3.3 1.2-3.3 1.2L28 10l-1.2-3.3-3.3-1.2 3.3-1.2z" fill="#ffd23f"/>',
  ),
  rowRocket: svg(
    '<path d="M6 16l5-5h12l5 5-5 5H11z" fill="#ff7a40"/><path d="M11 11h12l5 5H6z" fill="#ffae2b"/><circle cx="20" cy="16" r="2.6" fill="#7fd2ff" stroke="#fff"/><path d="M6 16H1M7 12H3M7 20H3" stroke="#ffd23f" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  colRocket: svg(
    '<path d="M16 3l5 5v12l-5 5-5-5V8z" fill="#3f9dff"/><path d="M16 3l5 5v12l-5 5z" fill="#2a78f0"/><circle cx="16" cy="12" r="2.6" fill="#ffe27a" stroke="#fff"/><path d="M16 26v5M12 25v3M20 25v3" stroke="#ffd23f" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  cross: svg('<rect x="12" y="2" width="8" height="28" rx="3" fill="#b26bff"/><rect x="2" y="12" width="28" height="8" rx="3" fill="#d39bff"/><circle cx="16" cy="16" r="4" fill="#fff"/>'),
  refresh: svg(
    '<path d="M25 11A10 10 0 0 0 7 12" fill="none" stroke="#2fd796" stroke-width="3.5" stroke-linecap="round"/><path d="M27 5v8h-8z" fill="#2fd796"/><path d="M7 21a10 10 0 0 0 18-1" fill="none" stroke="#27dcdc" stroke-width="3.5" stroke-linecap="round"/><path d="M5 27v-8h8z" fill="#27dcdc"/>',
  ),
  rotate: svg(
    '<rect x="9" y="9" width="7" height="7" rx="1.5" fill="#ffae2b"/><rect x="16" y="9" width="7" height="7" rx="1.5" fill="#ffae2b"/><rect x="16" y="16" width="7" height="7" rx="1.5" fill="#ffae2b"/><path d="M5 18a11 11 0 0 0 19 7" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><path d="M27 21l-1 7-6-3z" fill="#fff"/>',
  ),
  cube: svg('<path d="M16 3l12 6.5v13L16 29 4 22.5v-13z" fill="#ff4f86"/><path d="M16 3l12 6.5L16 16 4 9.5z" fill="#ff9dbd"/><path d="M16 16l12-6.5v13L16 29z" fill="#d92e66"/>'),
  magic: svg(
    '<rect x="13" y="10" width="4.5" height="20" rx="2" transform="rotate(-40 15 20)" fill="#7b70b8"/><rect x="13" y="10" width="4.5" height="5" rx="1" transform="rotate(-40 15 20)" fill="#fff"/><path d="M22 2l1.6 4.4L28 8l-4.4 1.6L22 14l-1.6-4.4L16 8l4.4-1.6z" fill="#ffd23f"/><circle cx="27" cy="16" r="1.6" fill="#7fd2ff"/><circle cx="12" cy="5" r="1.4" fill="#ff9dbd"/>',
  ),
  hint: svg(
    '<path d="M16 3a9 9 0 0 0-5 16.5V23h10v-3.5A9 9 0 0 0 16 3z" fill="#ffe27a"/><path d="M13 10a4 4 0 0 1 4-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="11" y="24" width="10" height="3" rx="1.5" fill="#9aa7bf"/><rect x="13" y="28" width="6" height="2.5" rx="1.2" fill="#9aa7bf"/>',
  ),
  undo: svg('<path d="M12 9H20a8 8 0 0 1 0 16h-8" fill="none" stroke="#7fd2ff" stroke-width="4" stroke-linecap="round"/><path d="M3 9l9-7v14z" fill="#7fd2ff"/>'),
  time: svg(
    '<circle cx="14" cy="17" r="11" fill="#fff"/><circle cx="14" cy="17" r="8.5" fill="#2fd796"/><path d="M14 11v6l4 2.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/><circle cx="25" cy="8" r="6" fill="#ff4f86"/><path d="M25 5v6M22 8h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  ),
  freeze: svg(
    '<g stroke="#bff3ff" stroke-width="2.8" stroke-linecap="round"><path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13"/><path d="M12 5l4 3 4-3M12 27l4-3 4 3M4 14l4.5-1-1.5-4.4M28 18l-4.5 1 1.5 4.4M4 18l4.5 1-1.5 4.4M28 14l-4.5-1 1.5-4.4"/></g>',
  ),
  x2: svg('<rect x="2" y="5" width="28" height="22" rx="6" fill="#ffae2b"/><text x="16" y="22.5" text-anchor="middle" font-size="15" font-weight="900" font-family="Arial" fill="#fff">x2</text>'),
  slot: svg(
    '<rect x="3" y="8" width="11" height="16" rx="3" fill="rgba(255,255,255,.35)"/><rect x="18" y="8" width="11" height="16" rx="3" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/><path d="M23.5 12v8M19.5 16h8" stroke="#2fd796" stroke-width="3" stroke-linecap="round"/>',
  ),
  magnet: svg(
    '<path d="M6 5v10a10 10 0 0 0 20 0V5h-6v10a4 4 0 0 1-8 0V5z" fill="#ff4f6a"/><rect x="6" y="5" width="6" height="5" fill="#d6deeb"/><rect x="20" y="5" width="6" height="5" fill="#d6deeb"/><path d="M27 23l3 2M5 23l-3 2M16 29v3" stroke="#7fd2ff" stroke-width="2" stroke-linecap="round"/>',
  ),
};

export function boosterIcon(id: BoosterId): string {
  return B[id];
}
