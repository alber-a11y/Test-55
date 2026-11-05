import { generateLevel } from './generator';
import type { LevelData } from './model';

/**
 * Level source: deterministic generation off the main thread with a small cache,
 * and the next level is prepared in advance while the current one is played.
 */
const cache = new Map<number, Promise<LevelData>>();
let worker: Worker | null = null;
const pending = new Map<number, (l: LevelData) => void>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./levelWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<LevelData>) => {
      pending.get(e.data.n)?.(e.data);
      pending.delete(e.data.n);
    };
    worker.onerror = () => {
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function getLevel(n: number): Promise<LevelData> {
  const hit = cache.get(n);
  if (hit) return hit;
  const w = getWorker();
  const p = w
    ? new Promise<LevelData>((resolve) => {
        pending.set(n, resolve);
        w.postMessage({ n });
        // Fallback if the worker is silent (e.g. blocked by CSP).
        setTimeout(() => {
          if (pending.has(n)) {
            pending.delete(n);
            resolve(generateLevel(n));
          }
        }, 4000);
      })
    : Promise.resolve().then(() => generateLevel(n));
  cache.set(n, p);
  if (cache.size > 6) cache.delete(cache.keys().next().value!);
  return p;
}

export function prefetch(n: number): void {
  void getLevel(n);
}
