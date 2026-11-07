import { circ, ell, eyes, hl, O, O2, starPts, type IconFn } from '../svg';

export const space: IconFn[] = [
  // ringed planet
  (d) => `<path d="M10 62C4 50 96 30 92 44" stroke="${d.lin('#ffe1a8', '#d48a3a', 0, 0, 1, 0)}" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${circ(50, 50, 28, d.rad('#ffc27a', '#d4602a'), O)}<path d="M24 44Q50 52 76 42M22 56Q50 64 78 54" stroke="#ffe0b0" stroke-opacity=".6" stroke-width="4" fill="none"/>
    <path d="M92 44C96 56 10 76 10 62" stroke="${d.lin('#ffe1a8', '#d48a3a', 0, 0, 1, 0)}" stroke-width="7" fill="none" stroke-linecap="round"/>${hl(40, 34, 7, 4, -30, 0.6)}`,
  // rocket
  (d) => `<path d="M40 76 30 92 50 84 70 92 60 76Z" fill="${d.lin('#ffe066', '#ff6a1a')}" ${O2}/>
    <path d="M34 60 20 74 22 84 38 72ZM66 60 80 74 78 84 62 72Z" fill="${d.lin('#ff6a7a', '#c81a3a')}" ${O}/>
    <path d="M50 8C34 22 32 48 36 76H64C68 48 66 22 50 8Z" fill="${d.lin('#ffffff', '#c8d4e4', 0, 0, 1, 0)}" ${O}/>
    <path d="M50 8C44 13 40 20 38 26H62C60 20 56 13 50 8Z" fill="#e8304a"/>
    ${circ(50, 44, 9, d.rad('#a8e8ff', '#2a86e0'), 'stroke="#8a9ab0" stroke-width="3.5"')}${hl(47, 41, 3, 2, -30, 0.8)}${hl(42, 56, 2.5, 10, 0, 0.5)}`,
  // crescent moon
  (d) => `<path d="M62 12C40 14 22 32 22 54 22 76 40 92 62 92 70 92 78 88 84 82 60 84 44 66 44 46 44 30 52 18 62 12Z" fill="${d.rad('#fff8b0', '#f2c21a')}" ${O}/>
    ${circ(36, 58, 4, '#e6b012', 'opacity=".5"')}${circ(44, 76, 3, '#e6b012', 'opacity=".5"')}
    ${circ(36, 46, 2.4, '#7a5a08')}<path d="M34 54q4 3 7 0" stroke="#7a5a08" stroke-width="2" fill="none" stroke-linecap="round"/>
    <polygon points="${starPts(78, 30, 8, 3.5, 4, 0)}" fill="#fff27a"/>${hl(32, 32, 4, 9, 30, 0.5)}`,
  // ufo
  (d) => `<path d="M38 72 30 92H70L62 72Z" fill="#b8ff8a" opacity=".35"/>
    <path d="M30 46C30 26 70 26 70 46Z" fill="${d.rad('#c8f4ff', '#58b8e8')}" ${O} opacity=".95"/>
    ${circ(50, 38, 7, '#7ee07a', O2)}${circ(47.5, 37, 1.6, '#1a3a12')}${circ(52.5, 37, 1.6, '#1a3a12')}
    ${ell(50, 56, 42, 13, d.lin('#d4dcec', '#7a88a8'), O)}${ell(50, 52, 28, 5, '#eef2fa', 'opacity=".7"')}
    ${[22, 36, 50, 64, 78].map((x, i) => circ(x, 60, 3, ['#ffe066', '#ff6a8a', '#7ee07a', '#4ac8ff', '#ffe066'][i])).join('')}${hl(40, 34, 5, 3, -30, 0.7)}`,
  // comet
  (d) => `<path d="M60 40C40 30 20 20 6 18 18 30 30 40 50 56Z" fill="${d.lin('#ffffff', '#7ad0ff', 0, 0, 1, 1)}" opacity=".7"/>
    <path d="M58 48C42 46 24 46 10 52 26 56 40 60 56 62Z" fill="${d.lin('#ffe9a8', '#ff9a3a', 0, 0, 1, 0)}" opacity=".7"/>
    ${circ(66, 56, 20, d.rad('#fff6c8', '#ffa21a'), O)}${circ(60, 50, 4, '#ffd06a')}${circ(72, 62, 3, '#ffd06a')}${hl(60, 48, 5, 3, -30, 0.7)}`,
  // astronaut helmet
  (d) => `${circ(50, 46, 34, d.rad('#ffffff', '#c8d4e4'), O)}
    <rect x="22" y="30" width="56" height="34" rx="17" fill="${d.lin('#3a4a8a', '#141a3a')}" ${O2}/>
    <path d="M30 38C36 34 44 34 48 36" stroke="#9ad8ff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    ${circ(62, 52, 2, '#fff', 'opacity=".7"')}${circ(40, 56, 1.4, '#fff', 'opacity=".6"')}
    <rect x="28" y="78" width="44" height="14" rx="5" fill="${d.lin('#e8eef6', '#a8b4c8')}" ${O}/>${circ(50, 85, 3.5, '#ff5a6a')}
    ${hl(34, 22, 7, 3.5, -25, 0.8)}`,
  // satellite
  (d) => `<rect x="6" y="38" width="28" height="22" rx="2" fill="${d.lin('#5ab8ff', '#1a5aa8')}" ${O}/>
    <rect x="66" y="38" width="28" height="22" rx="2" fill="${d.lin('#5ab8ff', '#1a5aa8')}" ${O}/>
    <path d="M15 38V60M25 38V60M6 49H34M75 38V60M85 38V60M66 49H94" stroke="#bfe6ff" stroke-width="1.6" opacity=".7"/>
    <path d="M34 49H66" stroke="#8a9ab0" stroke-width="4"/>
    <rect x="38" y="34" width="24" height="30" rx="4" fill="${d.lin('#ffe066', '#e0a01a', 0, 0, 1, 0)}" ${O}/>
    <path d="M50 34V22M42 18C46 26 54 26 58 18" stroke="#8a9ab0" stroke-width="3" fill="none" stroke-linecap="round"/>${circ(50, 16, 3, '#ff5a6a')}${hl(44, 42, 2.5, 7, 0, 0.5)}`,
  // alien
  (d) => `<path d="M34 22 26 8M66 22 74 8" stroke="#5fd06a" stroke-width="3.5" stroke-linecap="round"/>${circ(26, 8, 4.5, '#ffe066', O2)}${circ(74, 8, 4.5, '#ffe066', O2)}
    <path d="M50 18C26 18 16 36 18 54 20 74 38 90 50 90 62 90 80 74 82 54 84 36 74 18 50 18Z" fill="${d.rad('#b8ff8a', '#3fae3a')}" ${O}/>
    ${ell(36, 52, 10, 13, '#1a2a12', '', -20)}${ell(64, 52, 10, 13, '#1a2a12', '', 20)}${circ(33, 47, 3.5, '#fff')}${circ(61, 47, 3.5, '#fff')}
    <path d="M42 74q8 6 16 0" stroke="#1f6a1f" stroke-width="3" fill="none" stroke-linecap="round"/>${hl(36, 28, 8, 3.5, -20, 0.5)}`,
  // sun
  (d) => {
    let rays = '';
    for (let i = 0; i < 10; i++) rays += `<path d="M50 4 56 18H44Z" fill="${'#ffb31a'}" transform="rotate(${i * 36} 50 50)" stroke="#e08a0a" stroke-width="1.5" stroke-linejoin="round"/>`;
    return `${rays}${circ(50, 50, 28, d.rad('#fff27a', '#ffa21a'), O)}${eyes(41, 59, 46, 3.5)}
      <path d="M42 57q8 7 16 0" stroke="#a8580a" stroke-width="2.6" fill="none" stroke-linecap="round"/>${ell(34, 56, 4, 2.5, '#ff7a5a', 'opacity=".5"')}${ell(66, 56, 4, 2.5, '#ff7a5a', 'opacity=".5"')}
      ${hl(40, 34, 6, 3, -30, 0.6)}`;
  },
  // earth
  (d) => `${circ(50, 50, 36, d.rad('#8fd8ff', '#1f6ad0'), O)}
    <path d="M28 30C36 26 44 30 42 38 40 44 30 44 28 52 24 52 18 46 20 40 22 34 24 32 28 30ZM56 20C64 20 74 26 78 34 72 36 64 32 60 38 58 44 66 48 64 56 60 62 54 58 52 52 50 46 44 40 48 32 50 26 52 22 56 20ZM40 66C46 62 54 66 54 72 52 78 46 84 40 82 36 78 36 70 40 66Z" fill="${d.lin('#8ef07a', '#2fa83a')}" ${O2}/>
    ${hl(36, 30, 8, 4, -35, 0.55)}`,
  // asteroid
  (d) => `<path d="M24 30C34 16 56 14 70 20 84 26 90 42 86 58 82 74 68 86 50 86 32 86 16 74 14 58 12 46 16 38 24 30Z" fill="${d.rad('#c8bcb0', '#6e6258')}" ${O}/>
    ${circ(38, 38, 8, '#8a7e72', O2)}${circ(64, 56, 10, '#8a7e72', O2)}${circ(40, 68, 6, '#8a7e72', O2)}${circ(66, 30, 4, '#8a7e72', O2)}
    ${circ(36, 36, 4, '#6e6258', 'opacity=".5"')}${circ(62, 54, 5, '#6e6258', 'opacity=".5"')}${hl(30, 28, 6, 3, -40, 0.5)}`,
  // sparkle star
  (d) => `<path d="M50 6C54 34 66 46 94 50 66 54 54 66 50 94 46 66 34 54 6 50 34 46 46 34 50 6Z" fill="${d.rad('#ffe6ff', '#b94aff', 0.5, 0.5, 0.6)}" ${O}/>
    <path d="M78 16C79 22 82 25 88 26 82 27 79 30 78 36 77 30 74 27 68 26 74 25 77 22 78 16Z" fill="#fff27a"/>
    <path d="M22 70C23 74 25 76 29 77 25 78 23 80 22 84 21 80 19 78 15 77 19 76 21 74 22 70Z" fill="#7ae8ff"/>${hl(46, 40, 2.5, 6, 0, 0.7)}`,
];
