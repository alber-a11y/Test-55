import { StubAdapter } from './StubAdapter';
import type { PlatformAdapter } from './types';

/**
 * Active platform adapter. There is no publishing platform yet, so the stub is
 * always used; a real SDK adapter is selected here once one is chosen.
 */
export let platform: PlatformAdapter = new StubAdapter();

export async function initPlatform(): Promise<PlatformAdapter> {
  try {
    await platform.init();
  } catch (e) {
    console.warn('[platform] init failed, falling back to stub', e);
    platform = new StubAdapter();
    await platform.init();
  }
  return platform;
}
