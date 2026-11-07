import { scopeIds } from './svg';
/** Tile body skins. Texture is 150×164: a 150×150 face plus a 14px "thickness" edge below it. */
export const TILE_W = 150;
export const TILE_FACE = 150;
export const TILE_H = 164;

interface Skin {
  face: [string, string];
  edge: [string, string];
  border: string;
  radius: number;
  extra?: string;
  gloss?: number;
}

const SKINS: Record<string, Skin> = {
  skin_classic: { face: ['#ffffff', '#f4eee4'], edge: ['#d2ae80', '#8f6640'], border: '#eadfcd', radius: 22, gloss: 0.5 },
  skin_wood: {
    face: ['#f8dcab', '#e7b673'], edge: ['#a76a36', '#6b3f1d'], border: '#d9a463', radius: 18, gloss: 0.25,
    extra: `<path d="M10 30C50 22 90 40 140 30M10 62C60 54 90 72 140 60M10 96C40 88 100 104 140 94M10 126C60 118 90 134 140 124" stroke="#b77a3c" stroke-opacity=".28" stroke-width="3" fill="none"/>
      <ellipse cx="104" cy="78" rx="10" ry="5" fill="none" stroke="#b77a3c" stroke-opacity=".3" stroke-width="2.5"/>`,
  },
  skin_marble: {
    face: ['#ffffff', '#e8ecf2'], edge: ['#a9b4c4', '#6f7c92'], border: '#dfe4ec', radius: 22, gloss: 0.4,
    extra: `<path d="M8 40C30 46 40 30 60 44S90 70 110 60 142 66 142 66M20 120C40 100 60 112 70 96S100 80 120 90M90 14C96 30 84 40 100 52" stroke="#9aa6ba" stroke-opacity=".35" stroke-width="2" fill="none"/>`,
  },
  skin_glass: {
    face: ['#effcff', '#bfe8fb'], edge: ['#73c2ea', '#3a8fc2'], border: '#ffffff', radius: 26, gloss: 0.75,
    extra: `<path d="M18 120 120 18M40 136 136 40" stroke="#fff" stroke-opacity=".45" stroke-width="10" stroke-linecap="round"/>`,
  },
  skin_caramel: {
    face: ['#fff5fa', '#ffdbea'], edge: ['#ff9fc4', '#d9568a'], border: '#ffc2da', radius: 30, gloss: 0.5,
    extra: [[20, 22], [130, 26], [24, 128], [128, 126], [75, 14], [14, 75], [136, 76], [76, 138]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${x < 50 ? '#ff8fbf' : '#8fd8ff'}" opacity=".7"/>`).join(''),
  },
  skin_gold: {
    face: ['#fffbe6', '#ffe596'], edge: ['#e3a62c', '#a26a0a'], border: '#ffd25a', radius: 22, gloss: 0.6,
    extra: `<path d="M120 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM26 116l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity=".9"/>`,
  },
  skin_neon: {
    face: ['#2c3270', '#191c45'], edge: ['#14163a', '#08091c'], border: '#4fe3ff', radius: 22, gloss: 0.12,
    extra: `<rect x="8" y="8" width="134" height="134" rx="18" fill="none" stroke="#ff4fd8" stroke-width="2" stroke-opacity=".55"/>`,
  },
  skin_cloud: { face: ['#ffffff', '#e9f5ff'], edge: ['#bcdcff', '#86b6ee'], border: '#ffffff', radius: 40, gloss: 0.6 },
};

export const SKIN_IDS = Object.keys(SKINS);

/** Tile body SVG. `hidden` renders the golden "mystery" face used for "?" tiles. */
export function tileSvg(id: string, variant: 'normal' | 'hidden' = 'normal'): string {
  const s = SKINS[id] ?? SKINS.skin_classic;
  const face = variant === 'hidden' ? (['#ffe58a', '#ffbe2e'] as [string, string]) : s.face;
  const edge = variant === 'hidden' ? (['#e09a1a', '#a8640a'] as [string, string]) : s.edge;
  const border = variant === 'hidden' ? '#fff0b0' : s.border;
  const r = s.radius;
  const neon = id === 'skin_neon' && variant === 'normal';
  return scopeIds(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}" viewBox="0 0 ${TILE_W} ${TILE_H}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${face[0]}"/><stop offset="1" stop-color="${face[1]}"/></linearGradient>
    <linearGradient id="e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${edge[0]}"/><stop offset="1" stop-color="${edge[1]}"/></linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${s.gloss ?? 0.4}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="c"><rect x="3" y="3" width="144" height="144" rx="${r}"/></clipPath>
  </defs>
  <rect x="3" y="15" width="144" height="146" rx="${r}" fill="url(#e)"/>
  <rect x="3" y="3" width="144" height="144" rx="${r}" fill="url(#f)"/>
  <g clip-path="url(#c)">${variant === 'normal' ? s.extra ?? '' : `<path d="M-10 40 40 -10M-10 90 90 -10M-10 140 140 -10M40 160 160 40M90 160 160 90" stroke="#fff" stroke-opacity=".3" stroke-width="12"/>`}
    <rect x="3" y="3" width="144" height="60" fill="url(#g)"/></g>
  <rect x="4.5" y="4.5" width="141" height="141" rx="${r - 1}" fill="none" stroke="${neon ? '#4fe3ff' : border}" stroke-width="${neon ? 4 : 3}"/>
  ${neon ? `<rect x="4.5" y="4.5" width="141" height="141" rx="${r - 1}" fill="none" stroke="#4fe3ff" stroke-opacity=".35" stroke-width="10"/>` : ''}
</svg>`, `${id}_${variant}`);
}

/** Soft drop shadow drawn under raised tiles. */
export function tileShadowSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="170" height="184" viewBox="0 0 170 184"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter></defs>
  <rect x="12" y="16" width="146" height="156" rx="26" fill="#000" opacity=".35" filter="url(#b)"/></svg>`;
}
