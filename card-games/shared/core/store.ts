import { platform } from '../platform/platform';

/**
 * Debounced persistent store around the platform save (Yandex player data + localStorage).
 * `fresh` builds defaults, `migrate` merges a loaded (possibly older / partial) save on top of them.
 */
export class Store<T extends object> {
  data: T;
  private timer: number | null = null;

  constructor(private fresh: () => T, private migrate: (raw: any, base: T) => T) {
    this.data = fresh();
  }

  async load(): Promise<void> {
    try {
      this.data = this.migrate(await platform.loadData(), this.fresh());
    } catch (e) {
      console.warn('[save] broken save, starting fresh', e);
      this.data = this.fresh();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.flush();
    });
    window.addEventListener('pagehide', () => this.flush());
  }

  /** Debounced persist. */
  save(): void {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => this.flush(), 700);
  }

  flush(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    void platform.saveData(this.data);
  }

  reset(): void {
    this.data = this.fresh();
    this.flush();
  }
}

/** Deep-merge plain objects: values from `raw` win, missing keys come from `base`. */
export function mergeDeep<T>(base: T, raw: any): T {
  if (raw === undefined || raw === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) {
    return (typeof raw === typeof base || base === null ? raw : base) as T;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return base;
  const out: any = { ...raw };
  for (const k of Object.keys(base as any)) out[k] = mergeDeep((base as any)[k], raw[k]);
  return out;
}
