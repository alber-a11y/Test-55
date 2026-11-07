import { blush, circ, ell, eyes, hl, O, O2, type IconFn } from '../svg';

const face = (d: { rad: (a: string, b: string) => string }, c1: string, c2: string, rx = 34, ry = 31, cy = 56) =>
  ell(50, cy, rx, ry, d.rad(c1, c2), O);
const smile = (y = 66, c = '#5a2a1a') => `<path d="M44 ${y}q6 5 12 0" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

export const animals: IconFn[] = [
  // cat
  (d) => `<path d="M20 42 22 12 44 30ZM80 42 78 12 56 30Z" fill="#f59a3a" ${O}/><path d="M24 34 25 19 37 29ZM76 34 75 19 63 29Z" fill="#ffc6d0"/>
    ${face(d, '#ffc27a', '#f08a24')}<path d="M40 28 42 36M50 26V35M60 28 58 36" stroke="#c8661a" stroke-width="3" stroke-linecap="round"/>
    ${ell(50, 66, 13, 9, '#fff3e6')}${eyes(38, 62, 52)}<path d="M47 60h6l-3 3z" fill="#e0608a"/>${smile(64)}
    <path d="M30 62H14M30 67 16 71M70 62H86M70 67 84 71" stroke="#8a4a1a" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round"/>${blush(28, 72, 62)}${hl(34, 38, 7, 3.5, -25, 0.5)}`,
  // dog
  (d) => `${face(d, '#fff0d6', '#e8c28e')}<path d="M18 30C10 40 12 62 22 66 30 60 30 40 28 30Z" fill="${d.rad('#b37a46', '#7a4a22')}" ${O}/>
    <path d="M82 30C90 40 88 62 78 66 70 60 70 40 72 30Z" fill="${d.rad('#b37a46', '#7a4a22')}" ${O}/>
    ${ell(62, 46, 9, 8, '#c99a64', 'opacity=".55"')}${eyes(38, 62, 50)}${ell(50, 62, 6.5, 5, '#2b1a12')}${hl(48, 60, 2, 1.2, 0, 0.7)}
    <path d="M50 67V70M42 70q8 6 16 0" stroke="#5a2a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M46 72q4 10 8 0Z" fill="#ff7a8a" ${O2}/>${blush(28, 72, 62)}`,
  // bunny
  (d) => `<path d="M30 40C24 26 24 6 34 6 44 6 42 28 40 40ZM70 40C76 26 76 6 66 6 56 6 58 28 60 40Z" fill="${d.rad('#ffffff', '#e6e0ee')}" ${O}/>
    <path d="M33 34C30 24 30 12 34 12 38 12 38 24 37 34ZM67 34C70 24 70 12 66 12 62 12 62 24 63 34Z" fill="#ffc0d0"/>
    ${face(d, '#ffffff', '#e6e0ee', 32, 29, 60)}${eyes(39, 61, 56)}<path d="M46 63h8l-4 4z" fill="#ff7a9a"/>
    <path d="M50 67q-5 5-8 1M50 67q5 5 8 1" stroke="#7a4a5a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="46.5" y="69" width="7" height="7" rx="1.5" fill="#fff" ${O2}/>${blush(30, 70, 66)}`,
  // bear
  (d) => `${circ(24, 30, 12, d.rad('#c58a54', '#7a4a22'), O)}${circ(76, 30, 12, d.rad('#c58a54', '#7a4a22'), O)}${circ(24, 30, 6, '#e8b98a')}${circ(76, 30, 6, '#e8b98a')}
    ${face(d, '#c58a54', '#7a4a22')}${ell(50, 66, 15, 11, '#f0d0a8')}${eyes(38, 62, 50)}${ell(50, 61, 6, 4.5, '#2b1a12')}${smile(67)}${blush(28, 72, 60)}${hl(34, 38, 7, 3.5, -25, 0.4)}`,
  // fox
  (d) => `<path d="M16 46 20 10 44 32ZM84 46 80 10 56 32Z" fill="${d.lin('#ff9a3a', '#e0601a')}" ${O}/><path d="M20 20 24 32 30 26ZM80 20 76 32 70 26Z" fill="#3a2010"/>
    <path d="M14 44C14 30 32 24 50 24 68 24 86 30 86 44 82 62 64 84 50 86 36 84 18 62 14 44Z" fill="${d.rad('#ffad5a', '#e0601a')}" ${O}/>
    <path d="M20 50C30 56 40 62 50 86 60 62 70 56 80 50 76 66 62 84 50 86 38 84 24 66 20 50Z" fill="#fff6ec"/>
    ${eyes(37, 63, 50)}${ell(50, 74, 5, 4, '#2b1a12')}${blush(28, 72, 60)}${hl(34, 34, 7, 3.5, -20, 0.4)}`,
  // panda
  (d) => `${circ(24, 28, 12, '#2b2b3a', O)}${circ(76, 28, 12, '#2b2b3a', O)}${face(d, '#ffffff', '#e0e4ec')}
    ${ell(37, 52, 9, 11, '#2b2b3a', '', -25)}${ell(63, 52, 9, 11, '#2b2b3a', '', 25)}
    ${circ(38, 52, 4, '#fff')}${circ(62, 52, 4, '#fff')}${circ(38.5, 52.5, 2.2, '#2b1a12')}${circ(62.5, 52.5, 2.2, '#2b1a12')}
    ${ell(50, 64, 5, 3.5, '#2b2b3a')}${smile(69, '#2b2b3a')}${blush(26, 74, 64)}${hl(34, 36, 7, 3.5, -25, 0.6)}`,
  // pig
  (d) => `<path d="M18 40 22 16 40 30ZM82 40 78 16 60 30Z" fill="${d.lin('#ffb0c4', '#f07ea0')}" ${O}/>
    ${face(d, '#ffc6d6', '#f08aac')}${ell(50, 64, 13, 10, d.rad('#ffb0c8', '#e86a94'), O2)}${ell(45, 64, 2.6, 4, '#a83a5e')}${ell(55, 64, 2.6, 4, '#a83a5e')}
    ${eyes(37, 63, 48)}${blush(26, 74, 58)}${hl(34, 38, 7, 3.5, -25, 0.5)}`,
  // frog
  (d) => `${circ(32, 30, 14, d.rad('#a6f07a', '#3fae3a'), O)}${circ(68, 30, 14, d.rad('#a6f07a', '#3fae3a'), O)}
    ${ell(50, 60, 38, 28, d.rad('#a6f07a', '#3fae3a'), O)}${circ(32, 30, 8, '#fff')}${circ(68, 30, 8, '#fff')}
    ${circ(33, 31, 4.5, '#2b1a12')}${circ(69, 31, 4.5, '#2b1a12')}${circ(31.5, 29.5, 1.6, '#fff')}${circ(67.5, 29.5, 1.6, '#fff')}
    <path d="M28 62q22 18 44 0" stroke="#1f6a1f" stroke-width="3" fill="none" stroke-linecap="round"/>${circ(44, 50, 1.6, '#1f6a1f')}${circ(56, 50, 1.6, '#1f6a1f')}
    ${blush(24, 76, 62)}${hl(36, 46, 9, 3.5, -20, 0.4)}`,
  // chick
  (d) => `<path d="M46 20C44 12 50 8 52 14 54 8 60 12 56 20" stroke="#f0a020" stroke-width="3" fill="#ffd34a" stroke-linejoin="round"/>
    ${circ(50, 54, 34, d.rad('#fff27a', '#ffc21a'), O)}${ell(22, 62, 8, 13, '#ffcf3a', O2, 20)}${ell(78, 62, 8, 13, '#ffcf3a', O2, -20)}
    ${eyes(39, 61, 48)}<path d="M42 56 58 56 50 66Z" fill="${d.lin('#ffa64a', '#f06a12')}" ${O2}/>${blush(30, 70, 60)}${hl(36, 34, 8, 4, -25, 0.6)}`,
  // owl
  (d) => `<path d="M20 34 24 10 38 24ZM80 34 76 10 62 24Z" fill="#8a5a32" ${O}/>
    <path d="M18 50C18 26 34 18 50 18 66 18 82 26 82 50 82 76 68 90 50 90 32 90 18 76 18 50Z" fill="${d.rad('#c99062', '#7a4a26')}" ${O}/>
    ${ell(50, 70, 18, 16, '#f2d6b0')}${[[44, 66], [56, 66], [50, 74], [44, 80], [56, 80]].map(([x, y]) => `<path d="M${x - 3} ${y}q3 3 6 0" stroke="#b08050" stroke-width="1.6" fill="none"/>`).join('')}
    ${circ(36, 44, 12, '#fff', O2)}${circ(64, 44, 12, '#fff', O2)}${circ(36, 44, 12, 'none', 'stroke="#ffb33a" stroke-width="3"')}${circ(64, 44, 12, 'none', 'stroke="#ffb33a" stroke-width="3"')}
    ${circ(37, 45, 6, '#2b1a12')}${circ(65, 45, 6, '#2b1a12')}${circ(35, 43, 2, '#fff')}${circ(63, 43, 2, '#fff')}
    <path d="M45 54 55 54 50 62Z" fill="#ffa63a" ${O2}/>`,
  // mouse
  (d) => `${circ(22, 30, 16, d.rad('#d6d6e2', '#9a9ab0'), O)}${circ(78, 30, 16, d.rad('#d6d6e2', '#9a9ab0'), O)}${circ(22, 30, 9, '#ffc0d0')}${circ(78, 30, 9, '#ffc0d0')}
    ${ell(50, 58, 30, 28, d.rad('#e4e4ee', '#a4a4ba'), O)}${eyes(39, 61, 52)}${circ(50, 64, 4.5, '#ff7a9a', O2)}${smile(70, '#5a4a5a')}
    <path d="M34 64H16M34 68 18 74M66 64H84M66 68 82 74" stroke="#5a5a6a" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round"/>${blush(30, 70, 62)}${hl(36, 42, 7, 3.5, -25, 0.5)}`,
  // cow
  (d) => `<path d="M30 26C26 18 28 12 32 10M70 26C74 18 72 12 68 10" stroke="#f2e2c4" stroke-width="6" stroke-linecap="round"/>
    ${ell(16, 40, 11, 6, '#f0f0f4', O2, -20)}${ell(84, 40, 11, 6, '#f0f0f4', O2, 20)}
    ${ell(50, 52, 32, 30, d.rad('#ffffff', '#dedee8'), O)}<path d="M26 34C34 30 40 36 38 44 32 46 26 42 26 34ZM66 28C74 30 76 40 70 42 62 40 62 32 66 28Z" fill="#2b2b3a"/>
    ${ell(50, 70, 24, 15, d.rad('#ffd0dc', '#f08aa8'), O2)}${ell(42, 70, 3, 4, '#a83a5e')}${ell(58, 70, 3, 4, '#a83a5e')}
    ${eyes(38, 62, 50)}${hl(36, 30, 6, 3, -25, 0.5)}`,
];
