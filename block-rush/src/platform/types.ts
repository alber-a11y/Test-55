export type Lang = 'ru' | 'en';

export interface AdCallbacks {
  /** Ad actually started — game must be paused and muted. */
  onOpen?: () => void;
  /** Ad finished or was closed (called once, only after onOpen). */
  onClose?: () => void;
}

export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Game is loaded and the first screen is interactive. */
  loadingReady(): void;
  /** Active gameplay started / stopped (board in play vs menus, pauses, ads). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Fullscreen ad. Resolves when closed: true if it was shown. */
  showInterstitial(cb: AdCallbacks): Promise<boolean>;
  /** Rewarded video. Resolves true only if the reward must be granted. */
  showRewarded(cb: AdCallbacks): Promise<boolean>;
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<void>;
  /** Language the platform asks for, or null when it has no opinion. */
  getLang(): Lang | null;
  /** Platform-driven pause/resume (e.g. Yandex game_api_pause). */
  onPauseChange(handler: (paused: boolean) => void): void;
}
