export type Lang = 'ru' | 'en';

export interface AdCallbacks {
  /** Ad actually started — game must be paused and muted. */
  onOpen?: () => void;
  /** Ad finished or was closed (always called exactly once). */
  onClose?: () => void;
}

/**
 * Everything the game needs from a publishing platform. A real SDK (Yandex Games,
 * VK Play, CrazyGames, GamePix…) is plugged in by writing one more adapter.
 */
export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Assets generated, first screen is interactive. */
  loadingReady(): void;
  /** Active gameplay started / stopped (level running vs menus, pauses, ads). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Fullscreen ad. Resolves when closed (true if it was actually shown). */
  showInterstitial(cb: AdCallbacks): Promise<boolean>;
  /** Rewarded video. Resolves true only if the reward must be granted. */
  showRewarded(cb: AdCallbacks): Promise<boolean>;
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<void>;
  getLang(): Lang;
  /** Platform-driven pause/resume (e.g. the portal opened its own overlay). */
  onPauseChange(handler: (paused: boolean) => void): void;
}
