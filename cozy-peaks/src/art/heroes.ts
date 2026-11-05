import type { Hero } from '../meta/heroes';
import { shade } from './color';

export type Mood = 'happy' | 'wow' | 'think';

/** Cartoon bust portrait of a hero, 200×200. */
export function heroPortrait(h: Hero, mood: Mood = 'happy', bg = true): string {
  const L = h.look;
  const skin = L.skin;
  const skinD = shade(skin, -0.12);
  const hair = L.hair;
  const hairD = shade(hair, -0.2);
  const cx = 100;
  const cy = 92;
  const parts: string[] = [];

  if (bg) parts.push(`<circle cx="100" cy="100" r="98" fill="#ffe9c7"/><circle cx="100" cy="100" r="98" fill="none" stroke="#f3cf93" stroke-width="4"/>`);

  // Hair behind the head.
  switch (L.style) {
    case 'ponytail':
      parts.push(`<path d="M138 60 C170 70 176 120 158 150 C150 128 150 104 140 92Z" fill="${hair}"/>`);
      parts.push(`<ellipse cx="${cx}" cy="${cy - 4}" rx="50" ry="54" fill="${hair}"/>`);
      break;
    case 'bob':
      parts.push(`<path d="M50 90 C46 40 78 30 100 30 C122 30 154 40 150 90 L154 132 C140 140 126 136 120 130 L80 130 C74 136 60 140 46 132Z" fill="${hair}"/>`);
      break;
    case 'bun':
      parts.push(`<circle cx="${cx}" cy="30" r="22" fill="${hair}" stroke="${hairD}" stroke-width="2"/>`);
      parts.push(`<ellipse cx="${cx}" cy="${cy - 6}" rx="50" ry="52" fill="${hair}"/>`);
      break;
    default:
      break;
  }

  // Body.
  parts.push(`<path d="M22 200 C26 160 52 146 80 142 L120 142 C148 146 174 160 178 200Z" fill="${L.outfit}"/>`);
  parts.push(`<path d="M80 142 L100 170 L120 142" fill="${L.accent}" stroke="${shade(L.outfit, -0.2)}" stroke-width="2"/>`);
  parts.push(`<path d="M40 176 C46 164 56 156 66 152" stroke="${shade(L.outfit, 0.25)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>`);
  parts.push(`<path d="M86 124 L86 146 C92 152 108 152 114 146 L114 124Z" fill="${skinD}"/>`);

  // Head and ears.
  parts.push(`<ellipse cx="${cx - 45}" cy="${cy + 6}" rx="9" ry="12" fill="${skinD}"/><ellipse cx="${cx + 45}" cy="${cy + 6}" rx="9" ry="12" fill="${skinD}"/>`);
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="45" ry="50" fill="${skin}"/>`);

  // Face.
  const eyeY = cy + 2;
  if (mood === 'wow') {
    parts.push(`<ellipse cx="${cx - 17}" cy="${eyeY}" rx="7" ry="9" fill="#fff"/><ellipse cx="${cx + 17}" cy="${eyeY}" rx="7" ry="9" fill="#fff"/>`);
  }
  parts.push(`<ellipse cx="${cx - 17}" cy="${eyeY}" rx="5.5" ry="7" fill="#2b1d18"/><ellipse cx="${cx + 17}" cy="${eyeY}" rx="5.5" ry="7" fill="#2b1d18"/>`);
  parts.push(`<circle cx="${cx - 15}" cy="${eyeY - 3}" r="2.2" fill="#fff"/><circle cx="${cx + 19}" cy="${eyeY - 3}" r="2.2" fill="#fff"/>`);
  if (h.gender === 'f') parts.push(`<path d="M${cx - 22} ${eyeY - 3} l-4 -1 M${cx + 22} ${eyeY - 3} l4 -1" stroke="#2b1d18" stroke-width="2.5" stroke-linecap="round"/>`);
  const browY = mood === 'wow' ? eyeY - 24 : mood === 'think' ? eyeY - 16 : eyeY - 19;
  const browC = L.style === 'bald' || h.age === 'senior' ? shade(hair, -0.35) : hairD;
  parts.push(
    mood === 'think'
      ? `<path d="M${cx - 28} ${browY + 1} Q${cx - 18} ${browY - 3} ${cx - 8} ${browY + 1} M${cx + 8} ${browY - 2} Q${cx + 18} ${browY - 8} ${cx + 28} ${browY - 1}" stroke="${browC}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - 28} ${browY + 5} Q${cx - 20} ${browY - 5} ${cx - 9} ${browY - 2} M${cx + 9} ${browY - 2} Q${cx + 20} ${browY - 5} ${cx + 28} ${browY + 5}" stroke="${browC}" stroke-width="3.8" fill="none" stroke-linecap="round"/>`,
  );
  parts.push(`<path d="M${cx - 2} ${cy + 10} q4 8 -3 10" stroke="${shade(skin, -0.25)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  if (mood === 'wow') parts.push(`<ellipse cx="${cx}" cy="${cy + 32}" rx="8" ry="9" fill="#8c2f2a"/><ellipse cx="${cx}" cy="${cy + 36}" rx="5" ry="4" fill="#e8706a"/>`);
  else if (mood === 'think') parts.push(`<path d="M${cx - 10} ${cy + 32} q10 -4 18 2" stroke="#8c2f2a" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  else parts.push(`<path d="M${cx - 16} ${cy + 26} q16 18 32 0 q-16 6 -32 0Z" fill="#8c2f2a" stroke="#8c2f2a" stroke-width="2" stroke-linejoin="round"/><path d="M${cx - 9} ${cy + 31} q9 6 18 0" fill="#fff" opacity=".9"/>`);
  parts.push(`<ellipse cx="${cx - 29}" cy="${cy + 20}" rx="8" ry="5" fill="#f28b82" opacity=".45"/><ellipse cx="${cx + 29}" cy="${cy + 20}" rx="8" ry="5" fill="#f28b82" opacity=".45"/>`);
  if (L.wrinkles) parts.push(`<path d="M${cx - 34} ${eyeY + 2} l-6 -3 M${cx - 34} ${eyeY + 6} l-6 1 M${cx + 34} ${eyeY + 2} l6 -3 M${cx + 34} ${eyeY + 6} l6 1 M${cx - 14} ${cy - 30} q14 -4 28 0" stroke="${shade(skin, -0.22)}" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  // Beard.
  if (L.beard === 'full') parts.push(`<path d="M56 100 C56 150 80 160 100 160 C120 160 144 150 144 100 C136 120 126 116 118 114 C110 124 90 124 82 114 C74 116 64 120 56 100Z" fill="${hair}" stroke="${shade(hair, -0.15)}" stroke-width="2"/>
    <path d="M${cx - 12} ${cy + 30} q12 6 24 0" stroke="#8c2f2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
  if (L.beard === 'moustache') parts.push(`<path d="M${cx - 22} ${cy + 24} C${cx - 14} ${cy + 14} ${cx - 4} ${cy + 18} ${cx} ${cy + 22} C${cx + 4} ${cy + 18} ${cx + 14} ${cy + 14} ${cx + 22} ${cy + 24} C${cx + 12} ${cy + 24} ${cx + 4} ${cy + 24} ${cx} ${cy + 26} C${cx - 4} ${cy + 24} ${cx - 12} ${cy + 24} ${cx - 22} ${cy + 24}Z" fill="${hairD}"/>`);
  if (L.beard === 'stubble') parts.push(`<path d="M62 112 C70 138 86 144 100 144 C114 144 130 138 138 112 C126 128 74 128 62 112Z" fill="${hairD}" opacity=".22"/>`);

  // Hair in front.
  switch (L.style) {
    case 'ponytail':
      parts.push(`<path d="M54 84 C50 44 80 36 100 36 C128 36 152 50 146 86 C138 66 120 56 96 60 C80 62 66 70 54 84Z" fill="${hair}"/>`);
      parts.push(`<path d="M136 62 C146 60 152 66 150 74" stroke="${L.accent}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
      break;
    case 'short':
      parts.push(`<path d="M55 80 C50 40 80 32 102 32 C130 32 152 46 146 82 C140 64 128 58 116 62 C110 50 92 52 84 58 C74 58 62 66 55 80Z" fill="${hair}"/>`);
      break;
    case 'bob':
      parts.push(`<path d="M54 92 C50 46 78 38 100 38 C126 38 150 48 146 92 C140 70 120 58 100 66 C84 58 62 66 54 92Z" fill="${hair}"/>`);
      break;
    case 'side':
      parts.push(`<path d="M55 76 C52 42 82 34 104 34 C132 34 150 48 146 78 C136 60 112 56 90 54 C76 56 62 64 55 76Z" fill="${hair}"/><path d="M88 52 C100 48 120 50 134 58" stroke="${shade(hair, 0.25)}" stroke-width="3" fill="none"/>`);
      break;
    case 'bun':
      parts.push(`<path d="M54 86 C50 48 80 40 100 40 C124 40 152 50 146 86 C136 64 118 54 100 56 C82 54 62 64 54 86Z" fill="${hair}"/><path d="M70 58 C84 50 116 50 130 58" stroke="#fff" stroke-width="3" fill="none" opacity=".5"/>`);
      break;
    case 'bald':
      parts.push(`<path d="M55 96 C50 80 52 66 58 60 C60 74 62 84 66 92Z" fill="${hair}"/><path d="M145 96 C150 80 148 66 142 60 C140 74 138 84 134 92Z" fill="${hair}"/>`);
      parts.push(`<path d="M72 52 C82 44 96 42 108 44" stroke="#fff" stroke-width="5" fill="none" opacity=".35" stroke-linecap="round"/>`);
      break;
  }

  if (L.glasses) parts.push(`<g fill="none" stroke="#5a3a2a" stroke-width="3.5"><circle cx="${cx - 17}" cy="${eyeY}" r="13"/><circle cx="${cx + 17}" cy="${eyeY}" r="13"/><path d="M${cx - 4} ${eyeY} h8 M${cx - 30} ${eyeY - 2} l-12 -4 M${cx + 30} ${eyeY - 2} l12 -4"/></g>
    <circle cx="${cx - 17}" cy="${eyeY}" r="12" fill="#bfe6ff" opacity=".18"/><circle cx="${cx + 17}" cy="${eyeY}" r="12" fill="#bfe6ff" opacity=".18"/>`);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="hero-svg">${parts.join('')}</svg>`;
}

/** Avatar frame drawn around the round portrait (skins). */
export function frameSvg(id: string): string {
  const ring = (stroke: string, w: number, extra = '') =>
    `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="frame-svg"><circle cx="100" cy="100" r="94" fill="none" stroke="${stroke}" stroke-width="${w}"/>${extra}</svg>`;
  switch (id) {
    case 'wood':
      return ring('#9a6233', 12, `<circle cx="100" cy="100" r="94" fill="none" stroke="#c4884f" stroke-width="4" stroke-dasharray="14 8"/>`);
    case 'flowers': {
      let f = '';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const x = 100 + Math.cos(a) * 94;
        const y = 100 + Math.sin(a) * 94;
        const col = ['#ff8fb1', '#ffd23f', '#b78cff', '#7ad0ff'][i % 4];
        f += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-7" rx="5" ry="7" fill="${col}" transform="rotate(${r})"/>`).join('')}<circle r="4" fill="#fff6c2"/></g>`;
      }
      return ring('#6fbf73', 8, f);
    }
    case 'hearts': {
      let f = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        f += `<path d="M0 6 C-8 0 -8 -7 -3 -7 C-1 -7 0 -5 0 -4 C0 -5 1 -7 3 -7 C8 -7 8 0 0 6Z" fill="#ff5a7a" transform="translate(${(100 + Math.cos(a) * 94).toFixed(1)} ${(100 + Math.sin(a) * 94).toFixed(1)}) scale(1.6)"/>`;
      }
      return ring('#ffc2d1', 8, f);
    }
    case 'gold':
      return ring('#e9b334', 12, `<circle cx="100" cy="100" r="88" fill="none" stroke="#fff1b8" stroke-width="3"/><circle cx="100" cy="100" r="100" fill="none" stroke="#a8761a" stroke-width="3"/>`);
    default:
      return ring('#ffffff', 8);
  }
}
