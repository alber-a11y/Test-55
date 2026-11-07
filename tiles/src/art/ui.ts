import { circ, cpath, ell, hl, O, O2, starPts, type IconFn } from './svg';

const W = 'fill="#fff"';
const shadowed = (p: string, w: number) =>
  `<path d="${p}" stroke="#000" stroke-opacity=".22" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(0 3)"/><path d="${p}" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

/** Interface icons (white glyphs for buttons, colored badges for HUD). */
export const UI_ICONS: Record<string, IconFn> = {
  coin: (d) => `${circ(50, 52, 42, d.lin('#ffe066', '#e08a0c'), O)}${circ(50, 50, 33, d.rad('#fff2a8', '#ffb81a'), 'stroke="#d88a0a" stroke-width="3"')}
    <path d="M50 30 56 44 70 46 60 56 62 70 50 63 38 70 40 56 30 46 44 44Z" fill="#e8960c" opacity=".85"/>${hl(34, 30, 8, 4, -35, 0.7)}`,
  star: (d) => `<polygon points="${starPts(50, 54, 46, 22)}" fill="${d.rad('#fff7a0', '#ffaa12')}" stroke="#e08a0a" stroke-width="5" stroke-linejoin="round"/>${hl(40, 38, 5, 10, 30, 0.6)}`,
  starEmpty: () => `<polygon points="${starPts(50, 54, 46, 22)}" fill="#000" fill-opacity=".22" stroke="#000" stroke-opacity=".25" stroke-width="5" stroke-linejoin="round"/>`,
  gear: () => {
    let teeth = '';
    for (let i = 0; i < 8; i++) teeth += `<rect x="42" y="8" width="16" height="20" rx="4" ${W} transform="rotate(${i * 45} 50 50)"/>`;
    return `<g transform="translate(0 3)" opacity=".22">${teeth.replace(/fill="#fff"/g, 'fill="#000"')}${circ(50, 50, 30, '#000')}</g>${teeth}<path d="${cpath(50, 50, 30)} ${cpath(50, 50, 12)}" fill-rule="evenodd" ${W}/>`;
  },
  home: () => `<path d="M14 50 50 18 86 50" stroke="#000" stroke-opacity=".22" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(0 3)"/>
    <path d="M24 46V84H42V64H58V84H76V46L50 24Z" fill="#000" opacity=".22" transform="translate(0 3)"/>
    <path d="M24 46V84H42V64H58V84H76V46L50 24Z" ${W}/><path d="M14 50 50 18 86 50" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  back: () => shadowed('M58 20 28 50 58 80M30 50H80', 14),
  pause: () => `<rect x="24" y="18" width="18" height="64" rx="6" fill="#000" opacity=".22" transform="translate(0 3)"/><rect x="58" y="18" width="18" height="64" rx="6" fill="#000" opacity=".22" transform="translate(0 3)"/>
    <rect x="24" y="18" width="18" height="64" rx="6" ${W}/><rect x="58" y="18" width="18" height="64" rx="6" ${W}/>`,
  play: () => `<path d="M30 16 82 50 30 84Z" fill="#000" opacity=".22" transform="translate(0 3)" stroke="#000" stroke-width="10" stroke-linejoin="round"/><path d="M30 16 82 50 30 84Z" ${W} stroke="#fff" stroke-width="8" stroke-linejoin="round"/>`,
  close: () => shadowed('M24 24 76 76M76 24 24 76', 15),
  check: () => shadowed('M18 52 40 74 82 28', 15),
  plus: () => shadowed('M50 18V82M18 50H82', 16),
  undo: (d) => `<path d="M34 30H62C76 30 86 40 86 54 86 68 76 78 62 78H30" stroke="#1a5a2a" stroke-opacity=".3" stroke-width="18" stroke-linecap="round" fill="none"/>
    <path d="M34 30H62C76 30 86 40 86 54 86 68 76 78 62 78H30" stroke="${d.lin('#a6f07a', '#2fae3a')}" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M12 30 40 8V52Z" fill="${d.lin('#a6f07a', '#2fae3a')}" ${O}/>`,
  magnet: (d) => `<path d="M22 22V54C22 70 34 82 50 82 66 82 78 70 78 54V22" stroke="#7a1020" stroke-opacity=".35" stroke-width="26" fill="none"/>
    <path d="M22 22V54C22 70 34 82 50 82 66 82 78 70 78 54V22" stroke="${d.lin('#ff7a7a', '#d0102a')}" stroke-width="20" fill="none"/>
    <rect x="12" y="10" width="20" height="18" rx="3" fill="${d.lin('#ffffff', '#c8d4e4')}" ${O}/><rect x="68" y="10" width="20" height="18" rx="3" fill="${d.lin('#ffffff', '#c8d4e4')}" ${O}/>
    <path d="M30 56C30 68 38 74 46 75" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  shuffle: (d) => {
    const s = d.lin('#9adfff', '#1f86e0');
    const p = 'M10 30H26C46 30 54 70 74 70H80M10 70H26C34 70 40 62 44 54M56 46C60 38 66 30 74 30H80';
    return `<path d="${p}" stroke="#123a6a" stroke-opacity=".3" stroke-width="15" stroke-linecap="round" fill="none"/><path d="${p}" stroke="${s}" stroke-width="10" stroke-linecap="round" fill="none"/>
      <path d="M76 16 94 30 76 44ZM76 56 94 70 76 84Z" fill="${s}" ${O}/>`;
  },
  slot: (d) => `<rect x="6" y="34" width="88" height="40" rx="10" fill="${d.lin('#5a6aa8', '#2a3466')}" ${O}/>
    <rect x="12" y="40" width="22" height="28" rx="5" fill="#fff" opacity=".9"/><rect x="39" y="40" width="22" height="28" rx="5" fill="#fff" opacity=".9"/>
    <rect x="66" y="40" width="22" height="28" rx="5" fill="#1a2044" stroke="#ffe066" stroke-width="3" stroke-dasharray="5 3"/>
    ${circ(76, 26, 16, d.rad('#a6f07a', '#2fae3a'), O)}<path d="M76 17V35M67 26H85" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
  ad: (d) => `<rect x="8" y="20" width="84" height="60" rx="12" fill="${d.lin('#ffffff', '#e6ecf6')}" ${O}/>
    <path d="M40 34 66 50 40 66Z" fill="${d.lin('#ff6a7a', '#d0102a')}" stroke="#d0102a" stroke-width="5" stroke-linejoin="round"/>`,
  gift: (d) => `<rect x="16" y="44" width="68" height="44" rx="6" fill="${d.lin('#ff7a8a', '#d0203a')}" ${O}/>
    <rect x="10" y="32" width="80" height="16" rx="5" fill="${d.lin('#ff9a9a', '#e0304a')}" ${O}/><rect x="43" y="32" width="14" height="56" fill="${d.lin('#ffe066', '#ffaa1a')}"/>
    <path d="M50 32C38 12 18 16 26 28 30 34 44 34 50 32ZM50 32C62 12 82 16 74 28 70 34 56 34 50 32Z" fill="${d.lin('#ffe066', '#ffaa1a')}" ${O2}/>`,
  chest: (d) => `<path d="M12 46H88V84C88 88 84 90 80 90H20C16 90 12 88 12 84Z" fill="${d.lin('#c9783a', '#8a4a1a')}" ${O}/>
    <path d="M12 46C12 26 24 18 50 18 76 18 88 26 88 46Z" fill="${d.lin('#e0904a', '#a85a22')}" ${O}/>
    <path d="M12 46H88M30 20V90M70 20V90" stroke="${d.lin('#ffe066', '#e0a01a')}" stroke-width="7"/>
    <rect x="40" y="38" width="20" height="22" rx="4" fill="${d.lin('#ffe066', '#e0a01a')}" ${O2}/>${circ(50, 47, 3.5, '#6a3a12')}${hl(28, 30, 8, 3, -15, 0.4)}`,
  lock: (d) => `<path d="M30 46V34C30 20 40 12 50 12 60 12 70 20 70 34V46" stroke="#5a6478" stroke-width="10" fill="none"/>
    <rect x="18" y="42" width="64" height="48" rx="10" fill="${d.lin('#ffd34a', '#e0900c')}" ${O}/>
    ${circ(50, 62, 7, '#7a4a08')}<rect x="47" y="64" width="6" height="14" rx="3" fill="#7a4a08"/>${hl(30, 52, 4, 8, 0, 0.5)}`,
  map: (d) => `<path d="M10 22 36 12 64 22 90 12V78L64 88 36 78 10 88Z" fill="${d.lin('#fff3d6', '#f0d29a')}" ${O}/>
    <path d="M36 12V78M64 22V88" stroke="#d0a860" stroke-width="2.5"/>
    <path d="M20 66C30 50 44 62 52 46 58 34 70 40 78 28" stroke="#e8304a" stroke-width="4" stroke-dasharray="6 5" fill="none" stroke-linecap="round"/>
    <path d="M72 22 84 34M84 22 72 34" stroke="#e8304a" stroke-width="5" stroke-linecap="round"/>${circ(20, 66, 5, '#2fae3a', O2)}`,
  shop: (d) => `<path d="M34 34V26C34 16 42 10 50 10 58 10 66 16 66 26V34" stroke="#8a4a1a" stroke-width="7" fill="none"/>
    <path d="M16 32H84L80 84C80 88 76 92 72 92H28C24 92 20 88 20 84Z" fill="${d.lin('#ff9ac0', '#e0407a')}" ${O}/>
    <path d="M16 32H84L83 44H17Z" fill="#fff" opacity=".35"/>
    <polygon points="${starPts(50, 64, 16, 7)}" fill="#ffe066" stroke="#e0a01a" stroke-width="2" stroke-linejoin="round"/>`,
  music: () => `<path d="M38 70V22L82 12V60" stroke="#000" stroke-opacity=".22" stroke-width="10" fill="none" transform="translate(0 3)"/>
    ${ell(28, 72, 14, 11, '#000', 'opacity=".22" transform="translate(0 3)"')}${ell(72, 62, 14, 11, '#000', 'opacity=".22" transform="translate(0 3)"')}
    <path d="M38 70V22L82 12V60" stroke="#fff" stroke-width="8" fill="none" stroke-linejoin="round"/>${ell(28, 72, 14, 11, '#fff', '', -15)}${ell(72, 62, 14, 11, '#fff', '', -15)}`,
  sound: () => `<path d="M14 38H32L54 18V82L32 62H14Z" fill="#000" opacity=".22" transform="translate(0 3)"/><path d="M14 38H32L54 18V82L32 62H14Z" ${W} stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
    <path d="M66 34C72 40 72 60 66 66M76 24C88 36 88 64 76 76" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  vibro: () => `<rect x="32" y="12" width="36" height="76" rx="8" fill="#000" opacity=".22" transform="translate(0 3)"/><rect x="32" y="12" width="36" height="76" rx="8" ${W}/>
    <rect x="38" y="20" width="24" height="52" rx="3" fill="#7ab8ff"/>${circ(50, 80, 3, '#7ab8ff')}
    <path d="M22 30 14 40 22 50 14 60 22 70M78 30 86 40 78 50 86 60 78 70" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  lang: () => `${circ(50, 52, 36, '#000', 'opacity=".22"')}${circ(50, 50, 36, 'none', 'stroke="#fff" stroke-width="7"')}
    <path d="M14 50H86M50 14C36 28 36 72 50 86M50 14C64 28 64 72 50 86M22 30H78M22 70H78" stroke="#fff" stroke-width="5" fill="none"/>`,
  question: (d) => `<path d="M34 36C34 24 42 16 52 16 63 16 70 24 70 34 70 46 56 48 56 60V64" stroke="#7a4a08" stroke-opacity=".35" stroke-width="20" stroke-linecap="round" fill="none"/>
    <path d="M34 36C34 24 42 16 52 16 63 16 70 24 70 34 70 46 56 48 56 60V64" stroke="${d.lin('#ff9a3a', '#e0601a')}" stroke-width="14" stroke-linecap="round" fill="none"/>
    ${circ(56, 83, 9, d.lin('#ff9a3a', '#e0601a'), O)}`,
  hand: (d) => `<path d="M40 50V18C40 12 48 12 48 18V44L50 40C50 34 58 34 58 40V46C58 40 66 40 66 46V52C66 46 74 46 74 52V70C74 84 66 92 54 92H48C40 92 34 86 30 80L20 62C17 56 24 52 28 56L40 68Z" fill="${d.lin('#ffffff', '#e6ecf6')}" stroke="#2a3446" stroke-width="4" stroke-linejoin="round"/>`,
  fire: (d) => `<path d="M50 6C54 22 72 30 74 54 76 74 64 90 50 90 34 90 24 78 24 62 24 48 32 40 36 32 40 42 44 44 46 46 46 30 48 18 50 6Z" fill="${d.lin('#ffd34a', '#ff3a1a')}" ${O}/>
    <path d="M50 52C54 62 62 66 62 76 62 84 56 90 50 90 44 90 38 84 38 76 38 68 44 64 46 56 48 60 50 58 50 52Z" fill="#fff27a"/>`,
  trophy: (d) => `<path d="M26 18H74V40C74 56 64 66 50 66 36 66 26 56 26 40Z" fill="${d.lin('#ffe066', '#e09a0c')}" ${O}/>
    <path d="M26 26H12C12 42 20 48 28 48M74 26H88C88 42 80 48 72 48" stroke="#e0a01a" stroke-width="6" fill="none"/>
    <rect x="44" y="64" width="12" height="14" fill="#e0a01a"/><rect x="30" y="76" width="40" height="12" rx="4" fill="${d.lin('#c9783a', '#8a4a1a')}" ${O2}/>${hl(36, 32, 4, 9, 0, 0.6)}`,
  snow: () => `<path d="M50 10V90M15 30 85 70M85 30 15 70" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
};

/** Overlay drawn on top of a tile face for frozen tiles (150×150 face space). */
export function iceOverlay(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">
    <defs><linearGradient id="i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8fbff" stop-opacity=".92"/><stop offset="1" stop-color="#7cc8f0" stop-opacity=".8"/></linearGradient></defs>
    <rect x="3" y="3" width="144" height="144" rx="22" fill="url(#i)" stroke="#bfefff" stroke-width="5"/>
    <path d="M20 30 50 50 40 80M120 22 100 56 126 70M30 120 60 96 92 118 110 96" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>
    <path d="M14 40 44 14M100 136 136 100" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>
  </svg>`;
}

/** Chains drawn over a locked tile (150×150 face space). */
export function lockOverlay(): string {
  const link = (x: number, y: number, r: number) =>
    `<rect x="${x - 11}" y="${y - 6}" width="22" height="12" rx="6" transform="rotate(${r} ${x} ${y})" fill="none" stroke="#5a6478" stroke-width="7"/><rect x="${x - 11}" y="${y - 6}" width="22" height="12" rx="6" transform="rotate(${r} ${x} ${y})" fill="none" stroke="#c8d2e2" stroke-width="3.5"/>`;
  let s = '';
  for (let i = 0; i < 7; i++) s += link(12 + i * 21, 12 + i * 21, 45 + (i % 2) * 90);
  for (let i = 0; i < 7; i++) s += link(138 - i * 21, 12 + i * 21, -45 + (i % 2) * 90);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"><rect x="3" y="3" width="144" height="144" rx="22" fill="#2a3446" opacity=".25"/>${s}</svg>`;
}
