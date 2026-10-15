export type Lang = 'ru' | 'en';

export interface AdCallbacks {
  /** Ad actually started — game must be paused and muted. */
  onOpen?: () => void;
  /** Ad finished or was closed (always called exactly once). */
  onClose?: () => void;
}

export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Game assets loaded, first screen is interactive. */
  loadingReady(): void;
  /** Active gameplay started / stopped (battle running vs menus, pauses, ads). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Fullscreen ad. Resolves when closed (shown or not). */
  showInterstitial(cb: AdCallbacks): Promise<boolean>;
  /** Rewarded video. Resolves true only if the reward must be granted. */
  showRewarded(cb: AdCallbacks): Promise<boolean>;
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<void>;
  getLang(): Lang;
  /** Platform-driven pause/resume (e.g. Yandex game_api_pause). */
  onPauseChange(handler: (paused: boolean) => void): void;
}
