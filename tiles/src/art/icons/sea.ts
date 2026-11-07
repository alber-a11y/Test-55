import { circ, cpath, ell, eyes, hl, O, O2, starPts, type IconFn } from '../svg';

export const sea: IconFn[] = [
  // clownfish
  (d) => `<g transform="translate(50 50) scale(1.12) translate(-52 -50)"><path d="M70 50 90 32 86 50 90 68Z" fill="${d.lin('#ffb347', '#f06212')}" ${O}/>
    <path d="M42 30 50 18 60 30ZM44 70 52 80 58 70Z" fill="#ff8a2a" ${O2}/>
    <path d="M14 50C22 30 58 26 74 50 58 74 22 70 14 50Z" fill="${d.lin('#ffbf4f', '#f06212')}" ${O}/>
    <path d="M34 33C38 42 38 58 34 67M56 31C60 42 60 58 56 69" stroke="#fff" stroke-width="7"/>
    <path d="M34 33C38 42 38 58 34 67M56 31C60 42 60 58 56 69" stroke="#3d2416" stroke-opacity=".3" stroke-width="7" stroke-dasharray="0" fill="none" opacity=".0"/>
    ${circ(24, 46, 4.5, '#2b1a12')}${circ(22.5, 44.5, 1.6, '#fff')}<path d="M16 55q4 2 7 0" stroke="#7a2a08" stroke-width="2" fill="none" stroke-linecap="round"/>${hl(44, 38, 8, 2.5, -10, 0.45)}</g>`,
  // octopus
  (d) => {
    const f = d.rad('#e5a8ff', '#9a3ad6');
    const legs = [-30, -15, 0, 15, 30]
      .map((dx) => `<path d="M${50 + dx * 0.8} 56C${50 + dx * 0.9} 68 ${50 + dx * 1.2 - 5} 76 ${50 + dx * 1.3} 86" stroke="${f}" stroke-width="10" stroke-linecap="round" fill="none"/>`)
      .join('');
    return `${legs}<path d="M22 56C20 26 38 14 50 14 62 14 80 26 78 56 70 64 30 64 22 56Z" fill="${f}" ${O}/>
      ${eyes(40, 60, 40, 5)}<path d="M44 50q6 5 12 0" stroke="#5a1a7a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      ${ell(32, 48, 5, 3, '#ff8acb', 'opacity=".6"')}${ell(68, 48, 5, 3, '#ff8acb', 'opacity=".6"')}${hl(36, 24, 7, 4, -30, 0.55)}`;
  },
  // starfish
  (d) => `<polygon points="${starPts(50, 54, 42, 20)}" fill="${d.rad('#ffd27a', '#ff7a3d')}" stroke="${'#ff8f4a'}" stroke-width="8" stroke-linejoin="round"/>
    <polygon points="${starPts(50, 54, 42, 20)}" fill="none" stroke="#3d2416" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round" transform="translate(0 0)"/>
    ${[[50, 30], [72, 46], [64, 72], [36, 72], [28, 46], [50, 54], [58, 48], [42, 48]].map(([x, y]) => circ(x, y, 2.4, '#fff4d6', 'opacity=".9"')).join('')}
    ${hl(44, 40, 4, 7, 20, 0.5)}`,
  // scallop shell
  (d) => {
    let ribs = '';
    for (let i = -3; i <= 3; i++) ribs += `<path d="M50 84L${50 + i * 11} 26" stroke="#e0607f" stroke-opacity=".45" stroke-width="2.4"/>`;
    return `<path d="M50 86 14 48C12 22 88 22 86 48Z" fill="${d.rad('#ffe6ec', '#ff8fae', 0.5, 0.3, 0.9)}" ${O}/>${ribs}
      <path d="M40 80H60L56 92H44Z" fill="#ffb8c8" ${O2}/>${hl(34, 38, 6, 4, -30, 0.6)}`;
  },
  // crab
  (d) => {
    const f = d.rad('#ff8a6a', '#d42a1a');
    const legs = [0, 1, 2].map((i) => `<path d="M30 ${62 + i * 7}L${14 - i * 2} ${66 + i * 10}M70 ${62 + i * 7}L${86 + i * 2} ${66 + i * 10}" stroke="#d42a1a" stroke-width="4" stroke-linecap="round"/>`).join('');
    return `${legs}<path d="M30 52 20 36M70 52 80 36" stroke="#d42a1a" stroke-width="5" stroke-linecap="round"/>
      <path d="M8 30C8 18 22 14 28 22L20 28 30 32C26 40 10 40 8 30Z" fill="${f}" ${O2}/>
      <path d="M92 30C92 18 78 14 72 22L80 28 70 32C74 40 90 40 92 30Z" fill="${f}" ${O2}/>
      ${ell(50, 62, 28, 19, f, O)}<path d="M42 44V34M58 44V34" stroke="#d42a1a" stroke-width="3.5"/>
      ${circ(42, 32, 6, '#fff', O2)}${circ(58, 32, 6, '#fff', O2)}${circ(43, 33, 3, '#2b1a12')}${circ(59, 33, 3, '#2b1a12')}
      <path d="M44 66q6 4 12 0" stroke="#7a1208" stroke-width="2.5" fill="none" stroke-linecap="round"/>${hl(40, 54, 7, 3, -15, 0.45)}`;
  },
  // whale
  (d) => `<path d="M16 60C14 38 38 28 58 32 78 36 88 50 84 62 78 78 34 82 16 60Z" fill="${d.lin('#7fd0ff', '#2a7ed6')}" ${O}/>
    <path d="M20 60 6 46 8 60 4 74Z" fill="#3c8fe0" ${O2}/>
    <path d="M26 66C40 76 66 76 80 64 74 74 50 82 30 74Z" fill="#dff4ff" opacity=".9"/>
    <path d="M60 30C58 20 54 14 50 10M60 30C62 20 68 14 74 12M60 30V14" stroke="#7fd8ff" stroke-width="4" stroke-linecap="round" fill="none"/>
    ${circ(70, 52, 3.8, '#1a2a4a')}${circ(69, 51, 1.3, '#fff')}<path d="M64 60q6 4 12 0" stroke="#1a3a6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${ell(62, 58, 4, 2.4, '#ff8acb', 'opacity=".5"')}${hl(40, 40, 10, 3.5, -15, 0.5)}`,
  // jellyfish
  (d) => {
    const ts = [30, 40, 50, 60, 70].map((x, i) => `<path d="M${x} 56c${i % 2 ? 6 : -6} 8 ${i % 2 ? -6 : 6} 14 0 22s${i % 2 ? 6 : -6} 10 0 14" stroke="#ff9fe0" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>`).join('');
    return `${ts}<path d="M20 56C18 26 38 14 50 14 62 14 82 26 80 56 72 62 66 54 58 60 52 54 48 54 42 60 34 54 28 62 20 56Z" fill="${d.rad('#ffd6f6', '#e06ad0')}" ${O} opacity=".95"/>
      ${eyes(42, 58, 40, 4)}<path d="M46 47q4 3 8 0" stroke="#7a1a6a" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${circ(32, 32, 3, '#fff', 'opacity=".5"')}${circ(66, 28, 2.4, '#fff', 'opacity=".5"')}${hl(36, 24, 7, 3.5, -30, 0.6)}`;
  },
  // turtle
  (d) => `${ell(26, 74, 8, 6, '#7ed957', O2, -30)}${ell(74, 74, 8, 6, '#7ed957', O2, 30)}${ell(26, 40, 8, 6, '#7ed957', O2, 30)}${ell(70, 38, 8, 6, '#7ed957', O2, -30)}
    ${circ(86, 56, 10, d.rad('#a6f07a', '#4fb53a'), O)}${circ(89, 53, 2.2, '#1a2a12')}
    <path d="M12 58 4 62 12 64Z" fill="#7ed957"/>
    <path d="M16 62C16 34 30 26 50 26 70 26 82 36 82 62Z" fill="${d.rad('#7fd06a', '#2f7a2a')}" ${O}/>
    <path d="M36 34 50 30 64 34 66 48 50 54 34 48ZM34 48 22 56M66 48 78 56M50 54V62M36 34 26 40M64 34 74 40" stroke="#bff09a" stroke-width="2.6" fill="none" stroke-linejoin="round"/>
    <rect x="14" y="58" width="70" height="8" rx="4" fill="#e6d48a" ${O2}/>${hl(38, 36, 8, 3, -15, 0.4)}`,
  // anchor
  (d) => {
    const s = d.lin('#a8bdd6', '#5b7290');
    const p = 'M50 26V86M32 36H68M18 60C20 80 36 88 50 88 64 88 80 80 82 60';
    return `<path d="${p}" stroke="#2a3446" stroke-opacity=".35" stroke-width="12" stroke-linecap="round" fill="none"/>
      <path d="${p}" stroke="${s}" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M10 66 18 54 26 64ZM90 66 82 54 74 64Z" fill="${s}" ${O2}/>
      <path d="${cpath(50, 17, 9)} ${cpath(50, 17, 4)}" fill-rule="evenodd" fill="${s}" ${O2}/>
      <path d="M46 30V80" stroke="#fff" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>`;
  },
  // lifebuoy
  (d) => `<path d="${cpath(50, 50, 38)} ${cpath(50, 50, 18)}" fill-rule="evenodd" fill="${d.rad('#ffffff', '#dfe8f2')}" ${O}/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="${d.lin('#ff6a6a', '#d0102a')}" stroke-width="20" stroke-dasharray="21.99 21.99" transform="rotate(-22.5 50 50)"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="#3d2416" stroke-opacity=".3" stroke-width="2.4"/>
    <circle cx="50" cy="50" r="18" fill="none" stroke="#3d2416" stroke-opacity=".3" stroke-width="2.4"/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="#e8d7a8" stroke-width="2.4" stroke-dasharray="4 5"/>${hl(32, 26, 8, 3.5, -40, 0.6)}`,
  // pufferfish
  (d) => {
    let spikes = '';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = 50 + Math.cos(a) * 33;
      const y = 52 + Math.sin(a) * 33;
      spikes += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}L${(50 + Math.cos(a) * 44).toFixed(1)} ${(52 + Math.sin(a) * 44).toFixed(1)}" stroke="#e8a21a" stroke-width="4" stroke-linecap="round"/>`;
    }
    return `${spikes}${circ(50, 52, 33, d.rad('#fff07a', '#f0b020'), O)}
      ${ell(50, 66, 22, 13, '#fff8d6', 'opacity=".8"')}${eyes(40, 60, 46, 5)}${circ(50, 62, 4, '#e0608a', O2)}
      ${ell(32, 56, 5, 3, '#ff8a6a', 'opacity=".5"')}${ell(68, 56, 5, 3, '#ff8a6a', 'opacity=".5"')}${hl(38, 32, 8, 4, -30, 0.6)}`;
  },
  // coral
  (d) => {
    const s = d.lin('#ff9a8a', '#ff3f6d');
    const p = 'M50 86V58M50 58C50 44 40 38 34 26M50 58C52 46 62 40 66 22M42 42C36 40 28 42 22 36M60 40C68 38 74 42 80 36M50 70C42 66 30 66 24 56M50 68C58 64 70 64 76 54';
    return `<path d="${p}" stroke="#3d2416" stroke-opacity=".3" stroke-width="14" stroke-linecap="round" fill="none"/>
      <path d="${p}" stroke="${s}" stroke-width="10" stroke-linecap="round" fill="none"/>
      ${[[34, 26], [66, 22], [22, 36], [80, 36], [24, 56], [76, 54]].map(([x, y]) => circ(x, y, 3, '#ffd0d8')).join('')}
      <path d="M26 92C28 82 40 80 50 82 60 80 72 82 74 92Z" fill="${d.lin('#c9b8a0', '#8f7a60')}" ${O2}/>`;
  },
];
