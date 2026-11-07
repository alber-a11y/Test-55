import { circ, cpath, ell, hl, O, O2, type IconFn } from '../svg';

const leaf = (d: { lin: (a: string, b: string) => string }, x: number, y: number, rot: number, s = 1) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 0 C 8 -12, 22 -12, 26 -8 C 20 2, 8 6, 0 0Z" fill="${d.lin('#9be85f', '#3a9e35')}" ${O2}/>` +
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M2 -1 C 10 -5, 17 -6, 22 -7" stroke="#2c7a2a" stroke-opacity=".5" stroke-width="1.4" fill="none"/>`;

export const garden: IconFn[] = [
  // apple
  (d) => `<path d="M50 30C38 21 15 25 16 50 17 75 36 92 50 84 64 92 83 75 84 50 85 25 62 21 50 30Z" fill="${d.rad('#ff8a78', '#cf1b2b')}" ${O}/>
    <path d="M50 32C50 24 52 18 56 11" stroke="#7a4a22" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    ${leaf(d, 55, 22, -20)}${hl(33, 45, 7, 12, 25)}${hl(40, 34, 3, 3, 0, 0.8)}`,
  // cherries
  (d) => `<path d="M33 62C38 40 48 26 62 14M66 64C66 44 64 30 62 14" stroke="#5a8a2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${leaf(d, 62, 15, -10, 0.9)}
    ${circ(32, 70, 17, d.rad('#ff7a8a', '#a8102a'), O)}${circ(66, 72, 17, d.rad('#ff7a8a', '#a8102a'), O)}
    ${hl(26, 64, 4, 6, 30)}${hl(60, 66, 4, 6, 30)}`,
  // strawberry
  (d) => `<path d="M50 92C30 82 14 60 20 42 26 26 74 26 80 42 86 60 70 82 50 92Z" fill="${d.rad('#ff7070', '#c8102a')}" ${O}/>
    ${[[36, 48], [50, 44], [64, 48], [42, 60], [58, 60], [50, 72], [34, 64], [66, 64], [46, 80], [56, 78]]
      .map(([x, y]) => ell(x, y, 2.2, 3.2, '#ffe9a8')).join('')}
    <polygon points="28,34 40,30 34,18 50,27 66,18 60,30 72,34 58,40 50,34 42,40" fill="${d.lin('#8be05a', '#2f9a35')}" ${O2}/>
    <path d="M50 27V16" stroke="#3f8a2a" stroke-width="4" stroke-linecap="round"/>${hl(32, 48, 4, 8, 25)}`,
  // orange
  (d) => `${circ(50, 55, 33, d.rad('#ffd06a', '#f0700f'), O)}
    ${[[38, 62], [58, 68], [64, 50], [46, 76], [70, 64], [30, 50]].map(([x, y]) => circ(x, y, 1.4, '#c85a08', 'opacity=".35"')).join('')}
    <path d="M50 23v-6" stroke="#6a4a1a" stroke-width="4" stroke-linecap="round"/>${leaf(d, 52, 20, -25)}
    ${hl(37, 42, 8, 12, 35)}`,
  // lemon
  (d) => `<path d="M13 56C10 50 14 46 18 44 26 30 44 24 60 27 74 30 84 40 86 48 91 52 90 58 86 60 82 74 62 84 44 81 28 78 19 68 13 56Z" fill="${d.rad('#fff58a', '#f0bf0d')}" ${O}/>
    ${leaf(d, 68, 28, -40, 0.8)}${hl(34, 46, 6, 13, 55)}${hl(60, 38, 3, 2, 0, 0.5)}`,
  // grapes
  (d) => {
    const g = d.rad('#d6b3ff', '#6424b0');
    const c = [[30, 42], [50, 40], [70, 42], [40, 58], [60, 58], [50, 75]]
      .map(([x, y]) => circ(x, y, 12, g, O2) + hl(x - 4, y - 4, 3, 4.5, 30, 0.7)).join('');
    return `<path d="M50 30V14" stroke="#6a4a1a" stroke-width="4" stroke-linecap="round"/>${leaf(d, 52, 18, -15)}${c}`;
  },
  // watermelon slice
  (d) => `<g transform="rotate(-12 50 50)">
    <path d="M10 38A40 40 0 0 0 90 38Z" fill="${d.lin('#5fd06a', '#1f8a3a')}" ${O}/>
    <path d="M15 38A35 35 0 0 0 85 38Z" fill="#f4ffe8"/>
    <path d="M19 38A31 31 0 0 0 81 38Z" fill="${d.rad('#ff7a7a', '#e2203a', 0.5, 0.1, 0.9)}"/>
    ${[[34, 48], [50, 56], [66, 48], [42, 62], [58, 62], [50, 44]].map(([x, y]) => ell(x, y, 2, 3.4, '#2b1a12')).join('')}
    ${hl(30, 43, 8, 2.5, 20, 0.5)}</g>`,
  // pear
  (d) => `<path d="M50 22C42 22 40 34 38 42 26 54 24 76 36 86 44 92 56 92 64 86 76 76 74 54 62 42 60 34 58 22 50 22Z" fill="${d.rad('#f0f57a', '#8cc22a')}" ${O}/>
    <path d="M50 24C50 18 52 14 54 10" stroke="#6a4a1a" stroke-width="4" stroke-linecap="round" fill="none"/>${leaf(d, 53, 16, -30, 0.8)}
    ${hl(38, 62, 5, 11, 15)}${circ(60, 72, 1.3, '#6a8a1a', 'opacity=".4"')}${circ(44, 78, 1.3, '#6a8a1a', 'opacity=".4"')}`,
  // carrot
  (d) => `<path d="M46 30C40 18 36 12 30 10M50 28C50 16 52 10 56 6M54 30C60 20 66 16 74 16" stroke="${d.lin('#8be05a', '#2f9a35')}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M30 34Q50 22 70 34Q60 66 46 93Q40 96 38 90Q28 62 30 34Z" fill="${d.lin('#ffba4f', '#f0620f', 0, 0, 1, 0)}" ${O}/>
    <path d="M40 46h10M46 58h12M42 70h8M50 80h6" stroke="#c84f08" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>
    ${hl(38, 44, 3, 9, 10)}`,
  // mushroom
  (d) => `<path d="M37 54C34 70 36 84 41 90H59C64 84 66 70 63 54Z" fill="${d.lin('#fffaf0', '#e8d2b4')}" ${O}/>
    <path d="M12 54C12 24 88 24 88 54 88 60 12 60 12 54Z" fill="${d.rad('#ff7676', '#c41d30')}" ${O}/>
    ${circ(32, 42, 6, '#fff')}${circ(54, 34, 7, '#fff')}${circ(72, 46, 5, '#fff')}${circ(46, 50, 3.5, '#fff')}
    ${hl(26, 36, 5, 3, -30, 0.5)}${circ(45, 72, 2, '#c9a882')}${circ(55, 78, 1.6, '#c9a882')}`,
  // tulip
  (d) => `<path d="M50 62V94" stroke="#3f9a35" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 88C38 84 28 72 26 60 38 64 46 74 50 88ZM50 84C58 74 66 68 76 66 74 78 62 86 50 84Z" fill="${d.lin('#8be05a', '#2f9a35')}" ${O2}/>
    <path d="M28 22C26 50 36 66 50 66 64 66 74 50 72 22L61 36 50 16 39 36Z" fill="${d.rad('#ffa8d8', '#e0347a')}" ${O}/>
    <path d="M50 18 61 36C58 50 54 58 50 64 46 58 42 50 39 36Z" fill="#fff" opacity=".18"/>${hl(36, 40, 3, 9, 10)}`,
  // sunflower
  (d) => {
    const p = d.lin('#ffe65a', '#ffa11f');
    let petals = '';
    for (let i = 0; i < 12; i++) petals += `<ellipse cx="50" cy="24" rx="7.5" ry="15" fill="${p}" ${O2} transform="rotate(${i * 30} 50 50)"/>`;
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => circ(50 + Math.cos(i * 0.8) * 8, 50 + Math.sin(i * 0.8) * 8, 1.6, '#2b1608', 'opacity=".55"')).join('');
    return `${petals}${circ(50, 50, 17, d.rad('#9a6a32', '#4a2a10'), O)}${seeds}${hl(44, 44, 5, 3, -30, 0.35)}`;
  },
];
// keep cpath referenced for icon sets that use even-odd holes
void cpath;
