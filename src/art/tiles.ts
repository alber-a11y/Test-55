import type { BiomeDef } from '../data/types';
import { OUTLINE as O, shade } from './color';

const svg = (w: number, h: number, b: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${b}</svg>`;

/** Deterministic tiny PRNG for decoration placement. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function floorSvg(b: BiomeDef, variant: number): string {
  const r = prng(variant * 977 + b.id.length * 131);
  const base = variant % 2 === 0 ? b.floorA : b.floorB;
  let deco = '';
  for (let i = 0; i < 5; i++) {
    const x = 6 + r() * 52;
    const y = 6 + r() * 52;
    deco += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + r() * 3).toFixed(1)}" ry="${(1.5 + r() * 2).toFixed(1)}" fill="${b.deco}" opacity="0.5"/>`;
  }
  if (variant >= 2) {
    // occasional decorative tuft / crack
    deco += `<path d="M20,44 l4,-8 l3,6 l4,-9 l3,11" stroke="${shade(base, -0.25)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  }
  return svg(64, 64, `<rect width="64" height="64" fill="${base}"/>${deco}<rect x="0.5" y="0.5" width="63" height="63" fill="none" stroke="${shade(base, -0.06)}" stroke-width="1"/>`);
}

export function wallSvg(b: BiomeDef): string {
  const top = b.wallTop;
  const side = b.wallSide;
  const dk = b.wallDark;
  let extra = '';
  switch (b.wallStyle) {
    case 'rock':
      extra = `<path d="M12,20 L22,30 L18,42 M44,14 L40,28 L50,36" stroke="${dk}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="46" cy="48" rx="6" ry="4" fill="${shade(top, 0.25)}"/>
        <path d="M14,70 L14,82 M34,68 L34,84 M52,70 L52,80" stroke="${dk}" stroke-width="3" stroke-linecap="round"/>`;
      break;
    case 'brick':
      extra = `<path d="M3,22 L61,22 M3,43 L61,43 M22,3 L22,22 M42,22 L42,43 M22,43 L22,62" stroke="${dk}" stroke-width="2.5"/>
        <path d="M3,76 L61,76 M18,64 L18,76 M44,64 L44,76 M30,76 L30,86" stroke="${dk}" stroke-width="2.5"/>`;
      break;
    case 'crystal':
      extra = `<path d="M12,48 L18,14 L28,44 Z" fill="#c77dff" stroke="${O}" stroke-width="2.5"/>
        <path d="M30,46 L40,6 L50,46 Z" fill="#e0aaff" stroke="${O}" stroke-width="2.5"/>
        <path d="M46,50 L54,26 L58,50 Z" fill="#9d4edd" stroke="${O}" stroke-width="2.5"/>
        <path d="M37,14 L40,10 L42,30" stroke="#fff" stroke-width="2" fill="none"/>`;
      break;
    case 'candy':
      extra = `<path d="M3,30 Q12,40 20,30 Q28,44 36,30 Q44,40 52,30 Q58,38 61,30 L61,3 L3,3 Z" fill="#fff0f6"/>
        <circle cx="16" cy="14" r="3" fill="#ffd60a"/><circle cx="34" cy="20" r="3" fill="#4cc9f0"/><circle cx="50" cy="12" r="3" fill="#80ed99"/>
        <path d="M0,88 L24,64 M20,88 L44,64 M40,88 L64,64" stroke="#fff0f6" stroke-width="6"/>`;
      break;
    case 'tomb':
      extra = `<path d="M14,58 L14,22 Q14,6 32,6 Q50,6 50,22 L50,58 Z" fill="${shade(top, 0.15)}" stroke="${O}" stroke-width="3"/>
        <path d="M32,16 L32,40 M24,24 L40,24" stroke="${dk}" stroke-width="4" stroke-linecap="round"/>
        <path d="M6,60 Q12,52 18,60 M46,60 Q52,52 58,60" stroke="#2b9348" stroke-width="3" fill="none"/>`;
      break;
    case 'ice':
      extra = `<path d="M3,18 Q14,8 30,12 Q46,4 61,14 L61,3 L3,3 Z" fill="#ffffff"/>
        <path d="M14,30 L26,22 M18,40 L36,28 M40,50 L52,42" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
        <path d="M10,64 L14,80 L18,64 M40,64 L44,84 L48,64" fill="#ffffff" opacity="0.8"/>`;
      break;
    case 'neon':
      extra = `<rect x="8" y="8" width="48" height="48" rx="6" fill="none" stroke="#4cc9f0" stroke-width="3"/>
        <path d="M3,70 L61,70" stroke="#4cc9f0" stroke-width="3"/><circle cx="32" cy="32" r="6" fill="#4cc9f0" opacity="0.6"/>`;
      break;
  }
  return svg(
    64,
    88,
    `<rect x="1.5" y="1.5" width="61" height="84" rx="6" fill="${side}" stroke="${O}" stroke-width="3"/>
     <rect x="1.5" y="1.5" width="61" height="62" rx="6" fill="${top}" stroke="${O}" stroke-width="3"/>
     <path d="M6,6 L58,6" stroke="${shade(top, 0.35)}" stroke-width="3" stroke-linecap="round"/>
     ${extra}`,
  );
}

export function crateSvg(b: BiomeDef): string {
  const a = b.crateA;
  const d = b.crateB;
  return svg(
    64,
    84,
    `<rect x="3" y="3" width="58" height="78" rx="5" fill="${d}" stroke="${O}" stroke-width="3"/>
     <rect x="3" y="3" width="58" height="56" rx="5" fill="${a}" stroke="${O}" stroke-width="3"/>
     <path d="M8,8 L56,54 M56,8 L8,54" stroke="${d}" stroke-width="5"/>
     <rect x="8" y="8" width="48" height="46" fill="none" stroke="${d}" stroke-width="4"/>
     <path d="M8,64 L56,64 M8,72 L56,72" stroke="${shade(d, -0.3)}" stroke-width="2"/>`,
  );
}

export function barrelSvg(b: BiomeDef): string {
  const a = b.crateA;
  return svg(
    64,
    84,
    `<path d="M8,20 L8,70 Q32,84 56,70 L56,20 Z" fill="${shade(a, -0.15)}" stroke="${O}" stroke-width="3"/>
     <ellipse cx="32" cy="20" rx="24" ry="12" fill="${a}" stroke="${O}" stroke-width="3"/>
     <ellipse cx="32" cy="20" rx="14" ry="6" fill="${shade(a, -0.25)}"/>
     <path d="M8,40 Q32,52 56,40 M8,60 Q32,72 56,60" stroke="#6c757d" stroke-width="5" fill="none"/>`,
  );
}

export function bushSvg(b: BiomeDef): string {
  const c = b.bush;
  const d = b.bushDark;
  const l = shade(c, 0.25);
  return svg(
    68,
    80,
    `<g stroke="${O}" stroke-width="3">
      <circle cx="16" cy="56" r="15" fill="${d}"/><circle cx="52" cy="56" r="15" fill="${d}"/>
      <circle cx="34" cy="60" r="17" fill="${d}"/>
      <circle cx="18" cy="36" r="16" fill="${c}"/><circle cx="50" cy="36" r="16" fill="${c}"/>
      <circle cx="34" cy="24" r="18" fill="${c}"/><circle cx="34" cy="46" r="16" fill="${c}"/>
    </g>
    <path d="M24,18 Q30,12 38,14 M12,32 Q16,26 22,28 M44,30 Q50,26 56,30" stroke="${l}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  );
}

export function waterSvg(b: BiomeDef): string {
  return svg(
    64,
    64,
    `<rect width="64" height="64" fill="${b.water}"/>
     <path d="M6,18 Q12,13 18,18 Q24,23 30,18 M34,44 Q40,39 46,44 Q52,49 58,44" stroke="${b.waterLight}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  );
}

export function edgeSvg(b: BiomeDef): string {
  // Dark arena border block (outside walls).
  return svg(64, 64, `<rect width="64" height="64" fill="${shade(b.bg, -0.15)}"/><circle cx="20" cy="22" r="6" fill="${shade(b.bg, -0.3)}"/><circle cx="46" cy="44" r="8" fill="${shade(b.bg, -0.3)}"/>`);
}
