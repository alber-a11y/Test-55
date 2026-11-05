/** UI icons, 64×64, cartoon style with outlines and highlights (as in the reference HUD). */
const svg = (body: string, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="ico">${body}</svg>`;

const starPts = (cx: number, cy: number, r: number, inner = 0.48) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
};

export const ICONS = {
  heart: svg(`<path d="M32 56C14 44 5 35 5 22C5 13 12 7 20 7C26 7 30 10 32 15C34 10 38 7 44 7C52 7 59 13 59 22C59 35 50 44 32 56Z" fill="#e63946" stroke="#9b1d27" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 20C14 15 17 13 21 13" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7" fill="none"/>`),
  coin: svg(`<circle cx="32" cy="34" r="25" fill="#c98a12"/><circle cx="32" cy="30" r="25" fill="#f8c537" stroke="#b07a10" stroke-width="3"/>
    <circle cx="32" cy="30" r="17" fill="none" stroke="#e2a51d" stroke-width="3"/>
    <polygon points="${starPts(32, 30, 11)}" fill="#fff3b0" stroke="#d59a17" stroke-width="2" stroke-linejoin="round"/>
    <path d="M17 20 A17 17 0 0 1 28 12" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>`),
  star: svg(`<polygon points="${starPts(32, 33, 28)}" fill="#ffc83d" stroke="#c98a12" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M24 26 L29 18" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`),
  chest: svg(`<rect x="7" y="28" width="50" height="28" rx="4" fill="#c0392b" stroke="#7b1f16" stroke-width="3"/>
    <path d="M7 30 C7 14 18 10 32 10 C46 10 57 14 57 30 Z" fill="#e0533f" stroke="#7b1f16" stroke-width="3" stroke-linejoin="round"/>
    <rect x="7" y="27" width="50" height="6" fill="#f6c443" stroke="#9a6a10" stroke-width="2"/>
    <rect x="27" y="10" width="10" height="46" fill="#f6c443" stroke="#9a6a10" stroke-width="2"/>
    <rect x="26" y="30" width="12" height="12" rx="2" fill="#ffe27a" stroke="#9a6a10" stroke-width="2"/>
    <polygon points="${starPts(32, 21, 6)}" fill="#fff4b8"/>`),
  gear: svg(`<path d="M27 4h10l2 8 6 3 7-4 7 7-4 7 3 6 8 2v10l-8 2-3 6 4 7-7 7-7-4-6 3-2 8H27l-2-8-6-3-7 4-7-7 4-7-3-6-8-2V27l8-2 3-6-4-7 7-7 7 4 6-3z" fill="#4f7ee8" stroke="#24479b" stroke-width="3" stroke-linejoin="round" transform="translate(4 4) scale(.875)"/>
    <circle cx="32" cy="32" r="9" fill="#e9f0ff" stroke="#24479b" stroke-width="3"/>`),
  info: svg(`<circle cx="32" cy="32" r="26" fill="#3d8bfd" stroke="#1d4fa8" stroke-width="3"/><circle cx="32" cy="19" r="4" fill="#fff"/><rect x="28" y="27" width="8" height="21" rx="3" fill="#fff"/>`),
  goals: svg(`<rect x="12" y="10" width="40" height="48" rx="5" fill="#f6d9a8" stroke="#8a5a2b" stroke-width="3"/>
    <rect x="22" y="5" width="20" height="10" rx="3" fill="#b07a45" stroke="#6e4522" stroke-width="2.5"/>
    <rect x="18" y="20" width="28" height="34" rx="2" fill="#fffdf5"/>
    <path d="M22 28l3 3 5-6M22 38l3 3 5-6M22 48l3 3 5-6" stroke="#2fa35a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M33 29h10M33 39h10M33 49h8" stroke="#e05a47" stroke-width="3" stroke-linecap="round"/>`),
  house: svg(`<path d="M6 30 L32 8 L58 30" fill="none" stroke="#a83a2a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 28 V56 H51 V28 L32 13Z" fill="#ffe1b0" stroke="#8a5a2b" stroke-width="3" stroke-linejoin="round"/>
    <path d="M6 30 L32 8 L58 30" fill="none" stroke="#e0533f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="26" y="38" width="12" height="18" rx="2" fill="#b0703a" stroke="#6e4522" stroke-width="2"/>
    <rect x="41" y="34" width="7" height="7" fill="#8fd3ff" stroke="#6e4522" stroke-width="1.5"/><rect x="16" y="34" width="7" height="7" fill="#8fd3ff" stroke="#6e4522" stroke-width="1.5"/>`),
  shop: svg(`<path d="M10 22 H54 L50 56 H14 Z" fill="#f28c38" stroke="#9b4a12" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 26 V16 A10 10 0 0 1 42 16 V26" fill="none" stroke="#9b4a12" stroke-width="4" stroke-linecap="round"/>
    <path d="M10 22 H54 L53 30 H11 Z" fill="#ffb35c"/>
    <polygon points="${starPts(32, 42, 9)}" fill="#fff1c1" stroke="#c76a1d" stroke-width="1.5"/>`),
  undo: svg(`<path d="M22 14 L8 26 L22 38" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 26 H38 C49 26 56 33 56 42 C56 51 49 56 40 56 H30" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`),
  wand: svg(`<path d="M12 54 L40 26" stroke="#5b3a29" stroke-width="7" stroke-linecap="round"/><path d="M12 54 L20 46" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    <polygon points="${starPts(44, 20, 14)}" fill="#ffd23f" stroke="#c98a12" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="16" cy="18" r="3" fill="#fff"/><circle cx="56" cy="44" r="2.5" fill="#fff"/><circle cx="28" cy="10" r="2" fill="#ffd23f"/>`),
  plusCard: svg(`<rect x="22" y="10" width="28" height="40" rx="4" fill="#fff" stroke="#5a3d8a" stroke-width="3" transform="rotate(14 36 30)"/>
    <rect x="12" y="12" width="28" height="40" rx="4" fill="#fff" stroke="#5a3d8a" stroke-width="3" transform="rotate(-8 26 32)"/>
    <path d="M22 32 H34 M28 26 V38" stroke="#8b5cf6" stroke-width="5" stroke-linecap="round" transform="rotate(-8 26 32)"/>`),
  hammer: svg(`<path d="M30 30 L52 52" stroke="#8a5a2b" stroke-width="8" stroke-linecap="round"/>
    <rect x="8" y="12" width="32" height="16" rx="3" fill="#b8c2cc" stroke="#4b5563" stroke-width="3" transform="rotate(45 24 20)"/>`),
  peek: svg(`<path d="M4 32 C14 16 50 16 60 32 C50 48 14 48 4 32Z" fill="#fff" stroke="#3b2a6b" stroke-width="3.5"/>
    <circle cx="32" cy="32" r="11" fill="#5b8def"/><circle cx="32" cy="32" r="5" fill="#1d1d2b"/><circle cx="35" cy="28" r="2.5" fill="#fff"/>`),
  lucky: svg(`<path d="M32 30 C20 4 4 18 18 30 C4 42 20 58 32 34 C44 58 60 42 46 30 C60 18 44 4 32 30Z" fill="#3fbf6f" stroke="#1d7a41" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 32 C34 44 38 52 44 58" stroke="#1d7a41" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),
  startWild: svg(`<rect x="14" y="8" width="36" height="50" rx="5" fill="#8e5bd8" stroke="#4b2a8a" stroke-width="3"/>
    <polygon points="${starPts(32, 32, 14)}" fill="#ffd23f" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`),
  plus3: svg(`<rect x="10" y="12" width="30" height="42" rx="4" fill="#fff" stroke="#2d5bb8" stroke-width="3"/>
    <rect x="14" y="16" width="22" height="34" rx="2" fill="#2f5fc8"/>
    <circle cx="46" cy="40" r="14" fill="#2fbf71" stroke="#16723f" stroke-width="3"/>
    <text x="46" y="46" font-size="17" font-weight="900" fill="#fff" text-anchor="middle" font-family="Nunito, Arial">+3</text>`),
  doubleCoins: svg(`<circle cx="24" cy="34" r="18" fill="#f8c537" stroke="#b07a10" stroke-width="3"/>
    <circle cx="40" cy="28" r="18" fill="#f8c537" stroke="#b07a10" stroke-width="3"/>
    <text x="40" y="35" font-size="18" font-weight="900" fill="#9a6a10" text-anchor="middle" font-family="Nunito, Arial">×2</text>`),
  ad: svg(`<rect x="6" y="12" width="52" height="38" rx="7" fill="#ffd23f" stroke="#a6720e" stroke-width="3"/>
    <path d="M27 22 L42 31 L27 40 Z" fill="#7a4b0b"/><rect x="22" y="52" width="20" height="4" rx="2" fill="#a6720e"/>`),
  lock: svg(`<path d="M20 28 V20 A12 12 0 0 1 44 20 V28" fill="none" stroke="#8b95a1" stroke-width="7"/>
    <rect x="12" y="26" width="40" height="32" rx="6" fill="#f2b632" stroke="#9a6a10" stroke-width="3"/>
    <circle cx="32" cy="40" r="5" fill="#6b4a0e"/><rect x="30" y="42" width="4" height="9" rx="2" fill="#6b4a0e"/>`),
  key: svg(`<circle cx="20" cy="22" r="12" fill="#f2b632" stroke="#9a6a10" stroke-width="3"/><circle cx="20" cy="22" r="5" fill="#fff8de"/>
    <path d="M28 30 L54 56 M44 46 L50 40 M50 52 L56 46" stroke="#9a6a10" stroke-width="7" stroke-linecap="round"/>
    <path d="M28 30 L54 56 M44 46 L50 40 M50 52 L56 46" stroke="#f2b632" stroke-width="3.5" stroke-linecap="round"/>`),
  check: svg(`<circle cx="32" cy="32" r="27" fill="#34c26b" stroke="#fff" stroke-width="4"/><path d="M19 33 L28 42 L46 23" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  close: svg(`<circle cx="32" cy="32" r="27" fill="#e05a5a" stroke="#fff" stroke-width="4"/><path d="M22 22 L42 42 M42 22 L22 42" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`),
  plus: svg(`<circle cx="32" cy="32" r="27" fill="#3ec46d" stroke="#fff" stroke-width="4"/><path d="M32 18 V46 M18 32 H46" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`),
  left: svg(`<path d="M40 12 L20 32 L40 52" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  right: svg(`<path d="M24 12 L44 32 L24 52" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  arrowR: svg(`<path d="M6 24 H34 V12 L58 32 L34 52 V40 H6 Z" fill="#ffc83d" stroke="#d08a12" stroke-width="3" stroke-linejoin="round"/>`),
  swap: svg(`<path d="M12 26 C14 16 24 10 34 12 L36 6 L48 18 L32 24 L34 18 C27 17 21 21 19 26Z" fill="#f3e3c0" stroke="#c7a76c" stroke-width="2"/>
    <path d="M52 38 C50 48 40 54 30 52 L28 58 L16 46 L32 40 L30 46 C37 47 43 43 45 38Z" fill="#f3e3c0" stroke="#c7a76c" stroke-width="2"/>`),
  gift: svg(`<rect x="8" y="26" width="48" height="30" rx="4" fill="#e65a8c" stroke="#9b2153" stroke-width="3"/>
    <rect x="5" y="18" width="54" height="12" rx="3" fill="#ff7eb0" stroke="#9b2153" stroke-width="3"/>
    <rect x="28" y="18" width="8" height="38" fill="#ffd23f"/>
    <path d="M32 18 C24 4 10 10 18 18 M32 18 C40 4 54 10 46 18" stroke="#ffd23f" stroke-width="4" fill="none"/>`),
  clock: svg(`<circle cx="32" cy="32" r="26" fill="#fff" stroke="#5a3d8a" stroke-width="4"/><path d="M32 16 V32 L42 38" stroke="#5a3d8a" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  music: svg(`<path d="M24 46 V14 L52 8 V40" fill="none" stroke="#5a3d8a" stroke-width="5"/><ellipse cx="18" cy="47" rx="8" ry="6" fill="#5a3d8a"/><ellipse cx="46" cy="41" rx="8" ry="6" fill="#5a3d8a"/>`),
  sound: svg(`<path d="M8 24 H20 L34 12 V52 L20 40 H8Z" fill="#5a3d8a"/><path d="M42 22 C48 28 48 36 42 42 M48 16 C58 26 58 38 48 48" stroke="#5a3d8a" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  globe: svg(`<circle cx="32" cy="32" r="25" fill="#8fd3ff" stroke="#2d5bb8" stroke-width="3"/><path d="M7 32 H57 M32 7 C20 20 20 44 32 57 C44 44 44 20 32 7" stroke="#2d5bb8" stroke-width="3" fill="none"/>`),
  user: svg(`<circle cx="32" cy="22" r="12" fill="#5a3d8a"/><path d="M10 58 C10 42 20 36 32 36 C44 36 54 42 54 58Z" fill="#5a3d8a"/>`),
  brush: svg(`<rect x="8" y="10" width="40" height="18" rx="5" fill="#e879c6" stroke="#9b2c7d" stroke-width="3"/>
    <path d="M48 19 H54 V36 H32 V44" fill="none" stroke="#8a5a2b" stroke-width="4"/><rect x="28" y="44" width="8" height="16" rx="3" fill="#8a5a2b"/>`),
  sparkle: svg(`<path d="M32 4 C34 22 42 30 60 32 C42 34 34 42 32 60 C30 42 22 34 4 32 C22 30 30 22 32 4Z" fill="#fff6c2" stroke="#e7b417" stroke-width="2"/>`),
  infinity: svg(`<path d="M20 22 C8 22 8 42 20 42 C30 42 34 22 44 22 C56 22 56 42 44 42 C34 42 30 22 20 22Z" fill="none" stroke="#fff" stroke-width="6"/>`),
  trophy: svg(`<path d="M18 8 H46 V24 C46 36 39 42 32 42 C25 42 18 36 18 24Z" fill="#ffc83d" stroke="#b07a10" stroke-width="3"/>
    <path d="M18 14 H8 C8 26 14 30 20 30 M46 14 H56 C56 26 50 30 44 30" fill="none" stroke="#b07a10" stroke-width="3"/>
    <rect x="28" y="42" width="8" height="8" fill="#e0a31d"/><rect x="18" y="50" width="28" height="8" rx="2" fill="#8e5bd8" stroke="#4b2a8a" stroke-width="2"/>`),
};

export type IconName = keyof typeof ICONS;
export const icon = (n: IconName) => ICONS[n];

/** Booster id → icon. */
export const BOOSTER_ICON: Record<string, IconName> = {
  undo: 'undo',
  wild: 'wand',
  plusCard: 'plusCard',
  hammer: 'hammer',
  peek: 'peek',
  lucky: 'lucky',
  startWild: 'startWild',
  plus3: 'plus3',
  doubleCoins: 'doubleCoins',
};
