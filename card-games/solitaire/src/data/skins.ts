import type { BackStyle } from '@shared/cards/backs';
import type { TableStyle } from '@shared/cards/tables';
import { CITIES } from './cities';
import { drawCityScene } from '../art/landmarks';

export type Unlock =
  | { t: 'free' }
  | { t: 'coins'; price: number }
  | { t: 'ads'; n: number }
  | { t: 'city'; city: number }
  | { t: 'level'; level: number }
  | { t: 'achv'; id: string };

export type SkinKind = 'back' | 'face' | 'table';

export interface SkinItem {
  id: string;
  kind: SkinKind;
  ru: string;
  en: string;
  unlock: Unlock;
}

const B = (id: string, c1: string, c2: string, accent: string, pattern: BackStyle['pattern'], emblem: BackStyle['emblem'] = 'none', margin?: string): BackStyle => ({ id, c1, c2, accent, pattern, emblem, margin });

export const BACK_STYLES: BackStyle[] = [
  B('blue', '#2f5fd0', '#1c3a8a', '#9cc3ff', 'lattice', 0),
  B('red', '#c8323c', '#7f1d26', '#ffb3b3', 'lattice', 1),
  B('royal', '#5b2a86', '#2e1350', '#ffd166', 'mandala', 'star'),
  B('emerald', '#1f8a5b', '#0d4a30', '#9ff0c8', 'scales', 3),
  B('ocean', '#1d7fb8', '#0b3d63', '#bde6ff', 'waves', 'none'),
  B('sunset', '#ff7a45', '#b5175a', '#ffe08a', 'stripes', 'star'),
  B('starry', '#1b2350', '#070b22', '#ffe08a', 'stars', 'none'),
  B('checker', '#3a4568', '#1f2b48', '#ffffff', 'checker', 2),
  B('rings', '#0f766e', '#073b37', '#99f6e4', 'rings', 'none'),
  B('chevron', '#e09f1f', '#9a5a07', '#fff1b8', 'chevron', 'none'),
  B('hex', '#334155', '#0f172a', '#7dd3fc', 'hex', 'star'),
  B('suits', '#f4efe2', '#e2d7bd', '#b0303a', 'suits', 'none', '#ffffff'),
  B('candy', '#ff8fc7', '#c2185b', '#ffffff', 'dots', 1),
  B('noir', '#1d1d22', '#0b0b0e', '#e6c36a', 'lattice', 'star', '#121214'),
  ...CITIES.map((c) => ({
    id: `city_${c.id}`,
    c1: c.sky[0],
    c2: c.sky[1],
    accent: c.accent,
    pattern: 'plain' as const,
    art: (ctx: CanvasRenderingContext2D, w: number, h: number) => drawCityScene(ctx, c, w, h, { stars: true }),
  })),
];

export const TABLE_STYLES: TableStyle[] = [
  { id: 'green', kind: 'felt', c1: '#1f7a55', c2: '#0b3324' },
  { id: 'blue', kind: 'felt', c1: '#2763a8', c2: '#0c2244' },
  { id: 'burgundy', kind: 'felt', c1: '#8c2335', c2: '#360b14' },
  { id: 'purple', kind: 'felt', c1: '#5f3a9a', c2: '#1f0f3d' },
  { id: 'teal', kind: 'felt', c1: '#14868c', c2: '#05333a' },
  { id: 'graphite', kind: 'felt', c1: '#4a5266', c2: '#151922' },
  { id: 'wood', kind: 'wood', c1: '#9a6235', c2: '#3e2210', detail: '#2a160a' },
  { id: 'marble', kind: 'marble', c1: '#e9e6df', c2: '#a9a49a', detail: '#7d7a73' },
  { id: 'night', kind: 'night', c1: '#25306b', c2: '#060a22' },
  { id: 'parchment', kind: 'paper', c1: '#e9d6a8', c2: '#9c7b45' },
];

export const SKINS: SkinItem[] = [
  // Backs
  { id: 'blue', kind: 'back', ru: 'Классика', en: 'Classic', unlock: { t: 'free' } },
  { id: 'red', kind: 'back', ru: 'Рубин', en: 'Ruby', unlock: { t: 'free' } },
  { id: 'suits', kind: 'back', ru: 'Масти', en: 'Suits', unlock: { t: 'coins', price: 250 } },
  { id: 'royal', kind: 'back', ru: 'Королевская', en: 'Royal', unlock: { t: 'coins', price: 400 } },
  { id: 'ocean', kind: 'back', ru: 'Океан', en: 'Ocean', unlock: { t: 'ads', n: 2 } },
  { id: 'emerald', kind: 'back', ru: 'Изумруд', en: 'Emerald', unlock: { t: 'coins', price: 500 } },
  { id: 'candy', kind: 'back', ru: 'Конфета', en: 'Candy', unlock: { t: 'ads', n: 1 } },
  { id: 'sunset', kind: 'back', ru: 'Закат', en: 'Sunset', unlock: { t: 'coins', price: 600 } },
  { id: 'starry', kind: 'back', ru: 'Звёздная ночь', en: 'Starry Night', unlock: { t: 'ads', n: 3 } },
  { id: 'checker', kind: 'back', ru: 'Шахматы', en: 'Checker', unlock: { t: 'coins', price: 500 } },
  { id: 'rings', kind: 'back', ru: 'Круги', en: 'Rings', unlock: { t: 'ads', n: 2 } },
  { id: 'chevron', kind: 'back', ru: 'Шеврон', en: 'Chevron', unlock: { t: 'coins', price: 700 } },
  { id: 'hex', kind: 'back', ru: 'Соты', en: 'Hexagon', unlock: { t: 'coins', price: 800 } },
  { id: 'noir', kind: 'back', ru: 'Нуар', en: 'Noir', unlock: { t: 'achv', id: 'levels' } },
  ...CITIES.map((c, i): SkinItem => ({ id: `city_${c.id}`, kind: 'back', ru: c.ru, en: c.en, unlock: { t: 'city', city: i } })),
  // Faces
  { id: 'classic', kind: 'face', ru: 'Классика', en: 'Classic', unlock: { t: 'free' } },
  { id: 'big', kind: 'face', ru: 'Крупные', en: 'Large', unlock: { t: 'free' } },
  { id: 'four', kind: 'face', ru: '4 цвета', en: '4 colors', unlock: { t: 'coins', price: 300 } },
  { id: 'retro', kind: 'face', ru: 'Ретро', en: 'Retro', unlock: { t: 'coins', price: 600 } },
  { id: 'minimal', kind: 'face', ru: 'Минимал', en: 'Minimal', unlock: { t: 'ads', n: 2 } },
  { id: 'candy', kind: 'face', ru: 'Карамель', en: 'Caramel', unlock: { t: 'ads', n: 2 } },
  { id: 'neon', kind: 'face', ru: 'Неон', en: 'Neon', unlock: { t: 'ads', n: 3 } },
  { id: 'noir', kind: 'face', ru: 'Золото', en: 'Gold', unlock: { t: 'coins', price: 1500 } },
  // Tables
  { id: 'green', kind: 'table', ru: 'Сукно', en: 'Felt', unlock: { t: 'free' } },
  { id: 'blue', kind: 'table', ru: 'Синее сукно', en: 'Blue felt', unlock: { t: 'coins', price: 300 } },
  { id: 'burgundy', kind: 'table', ru: 'Бордо', en: 'Burgundy', unlock: { t: 'coins', price: 400 } },
  { id: 'purple', kind: 'table', ru: 'Аметист', en: 'Amethyst', unlock: { t: 'ads', n: 2 } },
  { id: 'teal', kind: 'table', ru: 'Лагуна', en: 'Lagoon', unlock: { t: 'coins', price: 500 } },
  { id: 'graphite', kind: 'table', ru: 'Графит', en: 'Graphite', unlock: { t: 'ads', n: 2 } },
  { id: 'parchment', kind: 'table', ru: 'Пергамент', en: 'Parchment', unlock: { t: 'coins', price: 600 } },
  { id: 'wood', kind: 'table', ru: 'Дуб', en: 'Oak', unlock: { t: 'coins', price: 800 } },
  { id: 'marble', kind: 'table', ru: 'Мрамор', en: 'Marble', unlock: { t: 'ads', n: 3 } },
  { id: 'night', kind: 'table', ru: 'Ночь', en: 'Night', unlock: { t: 'coins', price: 1000 } },
];

export const backStyle = (id: string): BackStyle => BACK_STYLES.find((b) => b.id === id) ?? BACK_STYLES[0];
export const tableStyle = (id: string): TableStyle => TABLE_STYLES.find((b) => b.id === id) ?? TABLE_STYLES[0];
export const skinKey = (s: { kind: SkinKind; id: string }): string => `${s.kind}:${s.id}`;
