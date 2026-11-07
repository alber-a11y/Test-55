import { StubAdapter } from './StubAdapter';
import type { PlatformAdapter } from './types';

/**
 * The single place that decides which platform SDK is used. Add a real adapter
 * (Yandex Games, CrazyGames, GameDistribution, VK Play…) implementing PlatformAdapter
 * and pick it here — the rest of the game only talks to `platform` and `ads`.
 */
export const platform: PlatformAdapter = new StubAdapter();
