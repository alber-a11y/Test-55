export type Lang = 'ru' | 'en';

export interface AdCallbacks {
  /** The ad really started: the game must already be paused and muted. */
  onOpen?: () => void;
  /** The ad was closed or failed (called once). */
  onClose?: () => void;
}

/**
 * Everything the game needs from a portal SDK. A new ad network = one class implementing this.
 * Shaped after Yandex Games SDK v2; other portals (VK Play, CrazyGames, GameDistribution…) map onto it.
 */
export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Assets loaded, the first screen is interactive (Yandex: LoadingAPI.ready). */
  loadingReady(): void;
  /** Active play started / stopped (Yandex: GameplayAPI.start/stop). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Fullscreen ad. Resolves true if it was actually shown. */
  showInterstitial(cb: AdCallbacks): Promise<boolean>;
  /** Rewarded video. Resolves true only if the reward must be granted (watched to the end). */
  showRewarded(cb: AdCallbacks): Promise<boolean>;
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<void>;
  getLang(): Lang | null;
  /** Remote config flags (string values), if the portal supports them. */
  getFlags(): Promise<Record<string, string>>;
  /** Portal-driven pause (e.g. Yandex game_api_pause / resume). */
  onPauseChange(handler: (paused: boolean) => void): void;
}
