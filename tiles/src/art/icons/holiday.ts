import { circ, ell, hl, O, O2, starPts, type IconFn } from '../svg';

export const holiday: IconFn[] = [
  // gift
  (d) => `<rect x="20" y="42" width="60" height="46" rx="5" fill="${d.lin('#ff6a7a', '#d01a3a')}" ${O}/>
    <rect x="15" y="32" width="70" height="15" rx="4" fill="${d.lin('#ff8a8a', '#e02a44')}" ${O}/>
    <rect x="44" y="32" width="12" height="56" fill="${d.lin('#ffe066', '#ffaa1a')}"/>
    <path d="M50 32C40 16 22 18 28 28 32 34 44 34 50 32ZM50 32C60 16 78 18 72 28 68 34 56 34 50 32Z" fill="${d.lin('#ffe066', '#ffaa1a')}" ${O2}/>
    ${hl(26, 52, 3, 8, 0, 0.4)}`,
  // christmas tree
  (d) => {
    const g = d.lin('#6fe07a', '#1f8a3a');
    return `<rect x="43" y="78" width="14" height="14" rx="2" fill="#8a5a2a" ${O2}/>
      <path d="M50 14 74 46H62L82 72H18L38 46H26Z" fill="${g}" ${O}/>
      <path d="M30 58Q50 66 70 56M34 42Q50 48 64 40" stroke="#ffe066" stroke-width="2.5" fill="none" stroke-dasharray="1 5" stroke-linecap="round"/>
      ${circ(40, 62, 4, '#ff4a6a', O2)}${circ(62, 66, 4, '#4ac8ff', O2)}${circ(54, 48, 3.5, '#ffd34a', O2)}${circ(42, 44, 3, '#b98cff', O2)}${circ(28, 68, 3, '#ffd34a', O2)}${circ(72, 70, 3, '#ff4a6a', O2)}
      <polygon points="${starPts(50, 14, 10, 4.5)}" fill="${d.lin('#fff27a', '#ffb31a')}" ${O2}/>`;
  },
  // bell
  (d) => `<path d="M50 16C32 16 28 36 28 52 28 66 20 70 18 76H82C80 70 72 66 72 52 72 36 68 16 50 16Z" fill="${d.rad('#fff07a', '#e09a12')}" ${O}/>
    ${circ(50, 82, 8, d.rad('#ffe066', '#c07a08'), O2)}<rect x="16" y="72" width="68" height="8" rx="4" fill="#e8a81a" ${O2}/>
    <path d="M50 16C42 8 32 10 34 16 36 20 46 18 50 16ZM50 16C58 8 68 10 66 16 64 20 54 18 50 16Z" fill="#e8304a" ${O2}/>
    ${hl(38, 38, 4, 12, 10, 0.55)}`,
  // snowman
  (d) => `${circ(50, 68, 24, d.rad('#ffffff', '#d4e6f6'), O)}${circ(50, 36, 17, d.rad('#ffffff', '#d4e6f6'), O)}
    <rect x="36" y="10" width="28" height="12" rx="2" fill="#2b2b3a"/><rect x="30" y="20" width="40" height="5" rx="2.5" fill="#2b2b3a"/>
    <rect x="36" y="16" width="28" height="4" fill="#e8304a"/>
    ${circ(44, 34, 2.4, '#2b1a12')}${circ(56, 34, 2.4, '#2b1a12')}<path d="M50 39 64 42 50 43Z" fill="#ff8a1a"/>
    <path d="M32 50Q50 58 68 50L66 56Q50 62 34 56Z" fill="#e8304a" ${O2}/><path d="M60 54 66 70 58 70Z" fill="#e8304a" ${O2}/>
    ${circ(50, 66, 2.4, '#2b2b3a')}${circ(50, 76, 2.4, '#2b2b3a')}${hl(40, 60, 5, 8, 20, 0.6)}`,
  // star
  (d) => `<polygon points="${starPts(50, 54, 42, 18)}" fill="${d.rad('#fff9a8', '#ffb31a')}" stroke="#ffc22a" stroke-width="7" stroke-linejoin="round"/>
    <polygon points="${starPts(50, 54, 42, 18)}" fill="none" stroke="#3d2416" stroke-opacity=".25" stroke-width="2"/>
    ${circ(42, 54, 2.6, '#7a4a08')}${circ(58, 54, 2.6, '#7a4a08')}<path d="M45 61q5 4 10 0" stroke="#7a4a08" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${hl(42, 40, 4, 8, 25, 0.6)}`,
  // balloon
  (d) => `<path d="M50 74C50 82 44 86 48 92" stroke="#7a7a8a" stroke-width="2" fill="none"/>
    ${ell(50, 40, 27, 32, d.rad('#9fdcff', '#2a86e0'), O)}<path d="M45 76H55L50 70Z" fill="#2a86e0" ${O2}/>
    ${hl(38, 26, 6, 11, 25, 0.6)}`,
  // party hat
  (d) => `<path d="M50 14 78 84H22Z" fill="${d.lin('#c99bff', '#7a3ad6')}" ${O}/>
    <path d="M42 34 62 44M36 50 68 64M30 66 74 82" stroke="#ffe066" stroke-width="5" stroke-linecap="round"/>
    ${[[46, 26], [56, 54], [40, 60], [58, 74]].map(([x, y]) => circ(x, y, 2.4, '#4ae0c8')).join('')}
    <rect x="18" y="80" width="64" height="10" rx="5" fill="#ff5a8a" ${O2}/>${circ(50, 14, 8, d.rad('#ff9ab8', '#ff3a7a'), O2)}`,
  // mitten
  (d) => `<path d="M30 74V40C30 24 40 16 52 18 62 20 66 30 66 40V46L72 38C78 32 86 38 82 46L70 66V74Z" fill="${d.rad('#7ff0e0', '#16a89a')}" ${O}/>
    <rect x="26" y="70" width="48" height="20" rx="8" fill="${d.lin('#ffffff', '#dfe8f2')}" ${O}/>
    <path d="M40 40l8 8M48 40l-8 8M44 36v16M36 44h16" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    ${[34, 44, 54, 64].map((x) => circ(x, 80, 2.4, '#bcd6ec')).join('')}${hl(38, 28, 4, 7, 20, 0.5)}`,
  // snowflake
  (d) => {
    const s = d.lin('#e0f6ff', '#4fb2f0');
    let arms = '';
    for (let i = 0; i < 6; i++)
      arms += `<g transform="rotate(${i * 60} 50 50)"><path d="M50 50V12M50 24 42 16M50 24 58 16M50 36 40 30M50 36 60 30" stroke="#2a6aa8" stroke-opacity=".3" stroke-width="9" stroke-linecap="round"/><path d="M50 50V12M50 24 42 16M50 24 58 16M50 36 40 30M50 36 60 30" stroke="${s}" stroke-width="6" stroke-linecap="round"/></g>`;
    return `${arms}${circ(50, 50, 7, '#fff', O2)}`;
  },
  // ornament ball
  (d) => `<path d="M50 8C44 8 44 16 50 16" stroke="#c09a3a" stroke-width="2.5" fill="none"/>
    <rect x="42" y="15" width="16" height="10" rx="2" fill="${d.lin('#ffe58a', '#c0880c')}" ${O2}/>
    ${circ(50, 58, 32, d.rad('#ff8ad8', '#b0167a'), O)}
    <path d="M19 52Q50 64 81 52M20 66Q50 78 80 66" stroke="#ffd34a" stroke-width="5" fill="none"/>
    <path d="M30 59l4-4 4 4-4 4zM46 62l4-4 4 4-4 4zM62 59l4-4 4 4-4 4z" fill="#fff"/>${hl(36, 42, 7, 10, 30, 0.6)}`,
  // candle
  (d) => `${ell(50, 22, 14, 18, '#ffe066', 'opacity=".35"')}
    <path d="M50 8C44 18 42 24 46 30 48 32 52 32 54 30 58 24 56 18 50 8Z" fill="${d.lin('#fff27a', '#ff7a1a')}" ${O2}/>
    <path d="M50 22C48 26 48 28 50 30 52 28 52 26 50 22Z" fill="#fff"/>
    <rect x="36" y="34" width="28" height="50" rx="4" fill="${d.lin('#ffffff', '#f2e2d4', 0, 0, 1, 0)}" ${O}/>
    <path d="M36 44 64 36M36 58 64 50M36 72 64 64" stroke="#ff5a6a" stroke-width="5"/>
    <path d="M58 34V44Q58 48 61 48 64 48 64 44V38Z" fill="#fff" ${O2}/>
    ${ell(50, 86, 26, 7, d.lin('#ffd060', '#c08010'), O)}`,
  // gingerbread man
  (d) => {
    const f = d.rad('#e8a46a', '#a8612c');
    return `<path d="M38 36C24 36 14 40 16 48 18 54 30 52 36 52L32 74C28 84 34 90 42 86L50 74 58 86C66 90 72 84 68 74L64 52C70 52 82 54 84 48 86 40 76 36 62 36Z" fill="${f}" ${O}/>
      ${circ(50, 26, 16, f, O)}${circ(44, 24, 2.4, '#2b1a12')}${circ(56, 24, 2.4, '#2b1a12')}
      <path d="M44 31q6 5 12 0M20 46q4 -4 8 0M72 46q4 -4 8 0M36 78q4 -4 8 0M56 78q4 -4 8 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${circ(50, 48, 3, '#ff4a6a')}${circ(50, 60, 3, '#4ac8ff')}${hl(42, 18, 4, 2.5, -25, 0.5)}`;
  },
];
