import { circ, cpath, ell, hl, O, O2, type IconFn } from '../svg';

const sprinkles = (pts: number[][]) =>
  pts.map(([x, y, r], i) => `<rect x="${x - 3}" y="${y - 1.2}" width="6" height="2.4" rx="1.2" fill="${['#ffffff', '#ffe14d', '#5ad1ff', '#7be36b', '#b98cff'][i % 5]}" transform="rotate(${r} ${x} ${y})"/>`).join('');

export const sweets: IconFn[] = [
  // cupcake
  (d) => `<path d="M24 56H76L67 92H33Z" fill="${d.lin('#8fdcff', '#2f8fd8')}" ${O}/>
    <path d="M36 58l3 32M50 58v32M64 58l-3 32" stroke="#fff" stroke-opacity=".45" stroke-width="2.5"/>
    <path d="M20 60C14 48 26 38 34 41 34 28 52 22 58 31 70 27 84 39 78 50 86 54 82 64 72 61Z" fill="${d.rad('#ffd0ea', '#ff6fb5')}" ${O}/>
    ${circ(56, 22, 8, d.rad('#ff7a7a', '#c8102a'), O2)}<path d="M57 15C58 10 61 8 64 6" stroke="#4a8a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${sprinkles([[32, 50, 30], [46, 44, -20], [62, 46, 60], [70, 54, 10], [40, 56, -50]])}${hl(30, 46, 4, 2.5, -20, 0.6)}`,
  // donut
  (d) => `<path d="${cpath(50, 52, 36)} ${cpath(50, 52, 11)}" fill-rule="evenodd" fill="${d.rad('#f6cf96', '#c0803e')}" ${O}/>
    <path d="M18 46C18 30 34 18 50 18 68 18 84 30 84 48 84 58 76 60 74 66 70 72 62 74 56 72 50 76 42 76 36 72 26 72 22 64 20 58 18 54 17 50 18 46Z ${cpath(50, 52, 13)}" fill-rule="evenodd" fill="${d.rad('#ffc6e6', '#ff5fa8')}"/>
    ${sprinkles([[30, 36, 20], [44, 28, -40], [62, 28, 30], [72, 42, -10], [70, 58, 50], [30, 56, -30], [40, 66, 10], [60, 66, -50]])}
    ${hl(32, 32, 7, 3, -35, 0.5)}`,
  // lollipop
  (d) => `<rect x="46.5" y="54" width="7" height="40" rx="3.5" fill="${d.lin('#ffffff', '#d8d8e8', 0, 0, 1, 0)}" ${O2}/>
    ${circ(50, 36, 28, d.rad('#8ff0ff', '#2a9fe0'), O)}
    <path d="M50 36m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0a15 15 0 1 1-30 0a19 19 0 1 1 38 0a23 23 0 1 1-46 0" fill="none" stroke="#fff" stroke-width="4" stroke-opacity=".85"/>
    <path d="M40 64l10-6 10 6-10 4z" fill="#ff6b9a" ${O2}/>${hl(36, 24, 6, 3.5, -35, 0.7)}`,
  // wrapped candy
  (d) => `<path d="M30 50 10 34 14 50 10 66ZM70 50 90 34 86 50 90 66Z" fill="${d.lin('#ffe48a', '#ffaa2a')}" ${O}/>
    ${ell(50, 50, 24, 19, d.rad('#ffe066', '#ff8f12'), O)}
    <path d="M38 33C44 44 44 56 38 67M50 31C56 44 56 56 50 69M62 33C68 44 68 56 62 67" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none"/>
    ${hl(40, 40, 6, 3, -30, 0.7)}`,
  // ice cream
  (d) => `<path d="M30 50H70L51 95Q50 97 49 95Z" fill="${d.lin('#f8cd88', '#cf8a3a')}" ${O}/>
    <path d="M36 56l20 22M46 52l18 18M34 64l10 10M64 56L42 82M54 52 38 70" stroke="#a8682a" stroke-opacity=".45" stroke-width="2"/>
    ${circ(38, 44, 15, d.rad('#ffd6ea', '#ff7fb6'), O)}${circ(62, 44, 15, d.rad('#d4ffe8', '#4fd69a'), O)}
    ${circ(50, 28, 16, d.rad('#c99a74', '#6e3f22'), O)}${circ(50, 14, 5, d.rad('#ff7a7a', '#c8102a'), O2)}
    ${hl(44, 22, 4, 2.5, -30, 0.6)}${hl(32, 38, 4, 2.5, -30, 0.6)}`,
  // cookie
  (d) => `${circ(50, 52, 36, d.rad('#f1c486', '#b8742f'), O)}
    ${[[36, 38, 5], [60, 34, 4], [68, 56, 5.5], [44, 62, 6], [30, 56, 3.5], [56, 74, 4], [52, 48, 3]]
      .map(([x, y, r]) => `<path d="M${x - r} ${y}q${r} -${r * 1.4} ${r * 2} 0q-${r * 0.3} ${r * 1.2} -${r * 2} 0z" fill="#5a2e14"/>`).join('')}
    ${hl(36, 30, 8, 3.5, -35, 0.4)}`,
  // macaron
  (d) => `${ell(50, 62, 34, 15, d.rad('#e4d0ff', '#9a6be0'), O)}
    <path d="M18 52Q26 46 34 52T50 52T66 52T82 52V56Q74 62 66 56T50 56T34 56T18 56Z" fill="#fff8ec" ${O2}/>
    ${ell(50, 40, 34, 16, d.rad('#efe2ff', '#a678ea'), O)}
    <path d="M18 46Q26 52 34 46T50 46T66 46T82 46" stroke="#8a5cd0" stroke-opacity=".35" stroke-width="2" fill="none"/>
    ${hl(36, 32, 9, 3.5, -10, 0.6)}`,
  // cake slice
  (d) => `<path d="M16 44 28 60V90L16 74Z" fill="#e7b977" ${O}/>
    <path d="M28 60 86 46V76L28 90Z" fill="${d.lin('#ffe1a8', '#f0b65f')}" ${O}/>
    <path d="M28 70 86 56M28 80 86 66" stroke="#ff8fb8" stroke-width="5"/>
    <path d="M16 44 74 30 86 46 28 60Z" fill="${d.lin('#fff6fa', '#ffd2e4')}" ${O}/>
    ${circ(54, 38, 7, d.rad('#ff7a7a', '#c8102a'), O2)}${hl(52, 35, 2, 1.5, 0, 0.8)}`,
  // chocolate bar
  (d) => `<g transform="rotate(-14 50 50)">
    <rect x="26" y="14" width="48" height="42" rx="4" fill="${d.lin('#8f5634', '#4e2812')}" ${O}/>
    ${[0, 1].map((c) => [0, 1, 2].map((r) => `<rect x="${30 + c * 21}" y="${18 + r * 13}" width="18" height="10" rx="2" fill="#a86a42" opacity=".75"/>`).join('')).join('')}
    <path d="M24 52L30 48 36 52 42 48 48 52 54 48 60 52 66 48 72 52 76 50V58H24Z" fill="#dfe6f0" ${O2}/>
    <rect x="24" y="56" width="52" height="34" rx="4" fill="${d.lin('#ff6a6a', '#c81e3a')}" ${O}/>
    <rect x="24" y="66" width="52" height="10" fill="#ffd54a" opacity=".9"/>${hl(34, 22, 5, 2, 0, 0.5)}</g>`,
  // candy cane
  (d) => `<path d="M62 92V36A14 14 0 0 0 34 36V42" stroke="#3d2416" stroke-opacity=".3" stroke-width="17" stroke-linecap="round" fill="none"/>
    <path d="M62 92V36A14 14 0 0 0 34 36V42" stroke="#fff" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M62 92V36A14 14 0 0 0 34 36V42" stroke="${d.lin('#ff5a6a', '#d0102a')}" stroke-width="13" stroke-dasharray="7 7" fill="none"/>
    <path d="M58 88V38" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round"/>`,
  // gummy bear
  (d) => {
    const f = d.rad('#b9ff8f', '#2fae3a');
    return `${circ(37, 21, 7, f, O2)}${circ(63, 21, 7, f, O2)}
      ${ell(30, 56, 8, 11, f, O2, -30)}${ell(70, 56, 8, 11, f, O2, 30)}${ell(38, 84, 10, 8, f, O2)}${ell(62, 84, 10, 8, f, O2)}
      ${ell(50, 66, 20, 23, f, O)}${circ(50, 34, 17, f, O)}
      ${circ(44, 32, 2.4, '#1f5a1a')}${circ(56, 32, 2.4, '#1f5a1a')}${ell(50, 40, 4, 3, '#1f5a1a', 'opacity=".6"')}
      ${hl(43, 24, 5, 3, -30, 0.7)}${hl(42, 58, 4, 8, 15, 0.45)}`;
  },
  // honey jar
  (d) => `<path d="M24 46C24 38 30 34 36 34H64C70 34 76 38 76 46V80C76 88 70 92 62 92H38C30 92 24 88 24 80Z" fill="${d.lin('#ffd060', '#e8860c', 0, 0, 1, 0)}" ${O}/>
    <rect x="26" y="20" width="48" height="16" rx="5" fill="${d.lin('#c27a3e', '#7a4318')}" ${O}/>
    <path d="M24 40C30 44 36 40 40 46 44 52 50 44 54 48 58 52 64 42 76 44" stroke="#ffe9a0" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="34" y="56" width="32" height="20" rx="5" fill="#fff8e6" ${O2}/>
    <path d="M44 66h12" stroke="#e8860c" stroke-width="3" stroke-linecap="round"/>${hl(31, 60, 3.5, 12, 0, 0.5)}`,
];
