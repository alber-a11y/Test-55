/** UI color themes (shop items). Colors are CSS strings; use `hex()` for Phaser numbers. */
export interface Theme {
  id: string;
  primary: [string, string, string]; // top, bottom, edge
  panel: { top: string; bottom: string; border: string; text: string; sub: string };
  tray: { top: string; bottom: string; border: string; slot: string };
  title: { fill: string; stroke: string };
  accent: string;
  map: { path: string; node: [string, string, string] };
}

export const THEMES: Record<string, Theme> = {
  theme_sky: {
    id: 'theme_sky',
    primary: ['#6fd0ff', '#2f8de0', '#1d5ea6'],
    panel: { top: '#ffffff', bottom: '#e6f3ff', border: '#3584d0', text: '#2a4a74', sub: '#6a86a8' },
    tray: { top: '#3a6cb0', bottom: '#22457e', border: '#b8dcff', slot: '#173462' },
    title: { fill: '#ffffff', stroke: '#1f5f99' },
    accent: '#ffb31a',
    map: { path: '#ffffff', node: ['#6fd0ff', '#2f8de0', '#1d5ea6'] },
  },
  theme_sunset: {
    id: 'theme_sunset',
    primary: ['#ffa36a', '#ff5e62', '#b33a42'],
    panel: { top: '#fffaf4', bottom: '#ffe8da', border: '#e66a4a', text: '#7a3428', sub: '#b06a58' },
    tray: { top: '#c45450', bottom: '#8a2f45', border: '#ffd0b0', slot: '#5e1f33' },
    title: { fill: '#ffffff', stroke: '#a83a3a' },
    accent: '#ffd23a',
    map: { path: '#fff2e6', node: ['#ffa36a', '#ff5e62', '#b33a42'] },
  },
  theme_mint: {
    id: 'theme_mint',
    primary: ['#5fe8bd', '#1fae8a', '#127a61'],
    panel: { top: '#f6fffc', bottom: '#dcf7ee', border: '#1fae8a', text: '#145e4c', sub: '#4f8f7e' },
    tray: { top: '#238f76', bottom: '#11604f', border: '#a8f2da', slot: '#0b4237' },
    title: { fill: '#ffffff', stroke: '#0f6e58' },
    accent: '#ffcf3a',
    map: { path: '#f0fff8', node: ['#5fe8bd', '#1fae8a', '#127a61'] },
  },
  theme_lavender: {
    id: 'theme_lavender',
    primary: ['#cda6ff', '#8a5cf0', '#5b37a8'],
    panel: { top: '#fcf9ff', bottom: '#efe6ff', border: '#8a5cf0', text: '#46307a', sub: '#7a68a8' },
    tray: { top: '#7050cc', bottom: '#47308c', border: '#ddd0ff', slot: '#2e1f5e' },
    title: { fill: '#ffffff', stroke: '#5b37a8' },
    accent: '#ffcf3a',
    map: { path: '#f8f2ff', node: ['#cda6ff', '#8a5cf0', '#5b37a8'] },
  },
  theme_caramel: {
    id: 'theme_caramel',
    primary: ['#ffd27a', '#f09a2c', '#a8601a'],
    panel: { top: '#fffbf2', bottom: '#fbecd2', border: '#c9822e', text: '#6a4018', sub: '#a07a50' },
    tray: { top: '#8f5e2e', bottom: '#5e3b1c', border: '#ffdca0', slot: '#3f2712' },
    title: { fill: '#ffffff', stroke: '#8a4f1c' },
    accent: '#ff6a8a',
    map: { path: '#fff6e6', node: ['#ffd27a', '#f09a2c', '#a8601a'] },
  },
  theme_night: {
    id: 'theme_night',
    primary: ['#54e6ff', '#2a7bff', '#1a3fa8'],
    panel: { top: '#2e3570', bottom: '#1c2148', border: '#4fe3ff', text: '#ffffff', sub: '#a8b4e8' },
    tray: { top: '#1e2452', bottom: '#11152f', border: '#4fe3ff', slot: '#0a0d22' },
    title: { fill: '#ffffff', stroke: '#0a0d22' },
    accent: '#ff4fd8',
    map: { path: '#a8f0ff', node: ['#54e6ff', '#2a7bff', '#1a3fa8'] },
  },
};

/** Fixed semantic button colors shared by every theme. */
export const BTN = {
  green: ['#9ff06a', '#3db82f', '#287a1f'] as [string, string, string],
  gold: ['#ffe066', '#ffa21a', '#b8680a'] as [string, string, string],
  red: ['#ff8a8a', '#e8484a', '#a42c2e'] as [string, string, string],
  gray: ['#e6eaf0', '#aeb6c4', '#7a8496'] as [string, string, string],
  purple: ['#d6a8ff', '#9a5cf0', '#6334b0'] as [string, string, string],
};

export const hex = (c: string) => parseInt(c.replace('#', ''), 16);
