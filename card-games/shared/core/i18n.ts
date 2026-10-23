import type { Lang } from '../platform/types';

export type Dict = Record<string, string>;

const dicts: Record<Lang, Dict> = { ru: {}, en: {} };
let lang: Lang = 'ru';

/** Games (and shared modules) add their strings; later calls override earlier keys. */
export function registerStrings(add: { ru: Dict; en: Dict }): void {
  Object.assign(dicts.ru, add.ru);
  Object.assign(dicts.en, add.en);
}

export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** Translate `key`, substituting `{name}` placeholders. Missing keys fall back to RU, then the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.ru[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Russian plural form picker: plural(5, ['монета', 'монеты', 'монет']). */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
