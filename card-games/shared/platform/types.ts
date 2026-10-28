export type Lang = 'ru' | 'en';

export interface AdCallbacks {
  /** Ad actually started — game must be paused and muted. */
  onOpen?: () => void;
  /** Ad finished or was closed (always called exactly once). */
  onClose?: () => void;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isPlayer: boolean;
}

export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Game assets loaded, first screen is interactive. */
  loadingReady(): void;
  /** Active gameplay started / stopped (a deal in progress vs menus, pauses, ads). */
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
  /** Leaderboards are optional: adapters without them resolve to empty / no-op. */
  setScore(board: string, score: number): Promise<void>;
  getEntries(board: string): Promise<LeaderboardEntry[]>;
}

/** Per-game settings shared by all adapters. */
export const platformConfig = {
  /** localStorage key of the save. */
  saveKey: 'card_game_save_v1',
  /** Title shown on the stub ad overlay. */
  title: 'Card Game',
};
