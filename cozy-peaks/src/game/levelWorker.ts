/// <reference lib="webworker" />
import { generateLevel } from './generator';

self.onmessage = (e: MessageEvent<{ n: number }>) => {
  (self as unknown as Worker).postMessage(generateLevel(e.data.n));
};
