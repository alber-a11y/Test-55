import { StubAdapter } from './StubAdapter';
import type { PlatformAdapter } from './types';

/**
 * The active portal adapter. Only the stub exists for now; when an ad network is chosen,
 * add its adapter and pick it here (by hostname or a build flag).
 */
export const platform: PlatformAdapter = new StubAdapter();
