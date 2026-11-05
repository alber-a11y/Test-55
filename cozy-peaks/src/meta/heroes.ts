import type { L10n } from './types';

export type Gender = 'f' | 'm';
export type Age = 'young' | 'adult' | 'senior';

export interface HeroLook {
  skin: string;
  hair: string;
  /** Hair silhouette used by the portrait renderer. */
  style: 'ponytail' | 'short' | 'bob' | 'side' | 'bun' | 'bald';
  outfit: string;
  accent: string;
  glasses?: boolean;
  beard?: 'stubble' | 'full' | 'moustache';
  wrinkles?: boolean;
}

export interface Hero {
  id: string;
  gender: Gender;
  age: Age;
  name: L10n;
  /** Who they are, shown on the selection card. */
  bio: L10n;
  look: HeroLook;
}

export const HEROES: Hero[] = [
  {
    id: 'anna',
    gender: 'f',
    age: 'young',
    name: { ru: 'Аня', en: 'Anna' },
    bio: { ru: 'Дизайнер, получила дом бабушки', en: 'A designer who inherited her granny’s house' },
    look: { skin: '#f6d2b8', hair: '#7a4a2a', style: 'ponytail', outfit: '#4f7fd6', accent: '#ffd166' },
  },
  {
    id: 'max',
    gender: 'm',
    age: 'young',
    name: { ru: 'Макс', en: 'Max' },
    bio: { ru: 'Мастер на все руки', en: 'A handy jack of all trades' },
    look: { skin: '#f1c9a5', hair: '#3b2a20', style: 'short', outfit: '#3f9b6b', accent: '#f4a261', beard: 'stubble' },
  },
  {
    id: 'helen',
    gender: 'f',
    age: 'adult',
    name: { ru: 'Елена', en: 'Helen' },
    bio: { ru: 'Вернулась в родной город', en: 'Back in her home town' },
    look: { skin: '#f3cfb1', hair: '#b5562f', style: 'bob', outfit: '#9b4f96', accent: '#ffe08a' },
  },
  {
    id: 'victor',
    gender: 'm',
    age: 'adult',
    name: { ru: 'Виктор', en: 'Victor' },
    bio: { ru: 'Архитектор на пенсии… почти', en: 'An almost-retired architect' },
    look: { skin: '#e9be98', hair: '#5a4636', style: 'side', outfit: '#35618f', accent: '#e9c46a', glasses: true, beard: 'moustache' },
  },
  {
    id: 'vera',
    gender: 'f',
    age: 'senior',
    name: { ru: 'Бабушка Вера', en: 'Grandma Vera' },
    bio: { ru: 'Вернулась в дом своего детства', en: 'Back in the house she grew up in' },
    look: { skin: '#f2d0b6', hair: '#d9d9e0', style: 'bun', outfit: '#c8566b', accent: '#fff1c1', glasses: true, wrinkles: true },
  },
  {
    id: 'ivan',
    gender: 'm',
    age: 'senior',
    name: { ru: 'Дедушка Иван', en: 'Grandpa John' },
    bio: { ru: 'Садовод с золотыми руками', en: 'A gardener with a golden touch' },
    look: { skin: '#eac2a0', hair: '#e4e4ea', style: 'bald', outfit: '#6b8f3a', accent: '#f1d27a', beard: 'full', wrinkles: true },
  },
];

export const heroById = (id: string | null | undefined): Hero => HEROES.find((h) => h.id === id) ?? HEROES[0];
