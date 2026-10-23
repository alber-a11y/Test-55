export interface City {
  id: string;
  ru: string;
  en: string;
  /** Sky gradient top/bottom, ground, silhouette, accent. */
  sky: [string, string];
  ground: string;
  sil: string;
  accent: string;
  /** Music transpose in semitones for variety. */
  tr: number;
}

export const CITIES: City[] = [
  { id: 'moscow', ru: 'Москва', en: 'Moscow', sky: ['#2b3a78', '#e98e6b'], ground: '#3b2a4a', sil: '#1d1533', accent: '#ffcf5c', tr: 0 },
  { id: 'paris', ru: 'Париж', en: 'Paris', sky: ['#3f2b6b', '#f3a6a0'], ground: '#40305c', sil: '#20183a', accent: '#ffd1dc', tr: 2 },
  { id: 'london', ru: 'Лондон', en: 'London', sky: ['#33415c', '#9fb3c8'], ground: '#2c3444', sil: '#161c28', accent: '#e6c36a', tr: -2 },
  { id: 'rome', ru: 'Рим', en: 'Rome', sky: ['#5b3a29', '#f6c177'], ground: '#5a3d2b', sil: '#2d1d14', accent: '#ffe29a', tr: 3 },
  { id: 'cairo', ru: 'Каир', en: 'Cairo', sky: ['#c2603b', '#f9d48b'], ground: '#b07a3e', sil: '#5e3a17', accent: '#fff1b8', tr: -3 },
  { id: 'istanbul', ru: 'Стамбул', en: 'Istanbul', sky: ['#1f4e79', '#f4a259'], ground: '#244a6a', sil: '#10243a', accent: '#ffd479', tr: 1 },
  { id: 'agra', ru: 'Агра', en: 'Agra', sky: ['#7b2d5b', '#f7b267'], ground: '#5b2a4a', sil: '#2b1124', accent: '#fff4d6', tr: 5 },
  { id: 'beijing', ru: 'Пекин', en: 'Beijing', sky: ['#7a1f2b', '#f6a54a'], ground: '#5a1a22', sil: '#2b0c10', accent: '#ffd23f', tr: -5 },
  { id: 'tokyo', ru: 'Токио', en: 'Tokyo', sky: ['#28335f', '#f79aa7'], ground: '#2c2f52', sil: '#151830', accent: '#ff8fa3', tr: 4 },
  { id: 'sydney', ru: 'Сидней', en: 'Sydney', sky: ['#1b6ca8', '#9ad0ec'], ground: '#155d8b', sil: '#0b2f4a', accent: '#ffffff', tr: -4 },
  { id: 'newyork', ru: 'Нью-Йорк', en: 'New York', sky: ['#14213d', '#fca311'], ground: '#1c2a4a', sil: '#0a0f1e', accent: '#ffe066', tr: 7 },
  { id: 'rio', ru: 'Рио', en: 'Rio', sky: ['#1d7874', '#f7c59f'], ground: '#1a5f5c', sil: '#0b2e2c', accent: '#ffe8a3', tr: -7 },
];

export const cityOfLevel = (level: number): City => CITIES[Math.floor((level - 1) / 20) % CITIES.length];
export const cityIndexOfLevel = (level: number): number => Math.floor((level - 1) / 20);
/** Lap around the world (0 for the first 240 levels). */
export const lapOfLevel = (level: number): number => Math.floor((level - 1) / (20 * CITIES.length));
/** Postcard levels inside a city (1-based position in the city). */
export const POSTCARD_AT = [7, 14, 20];
