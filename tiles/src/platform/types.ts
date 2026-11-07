import type { Lang } from '../core/i18n';

export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;
  /** Assets loaded and the first screen is interactive. */
  loadingReady(): void;
  /** Active gameplay started / stopped (level running vs menus, popups, ads). */
  gameplayStart(): void;
  gameplayStop(): void;
  /** Fullscreen ad. Resolves when closed (shown or not). */
  showInterstitial(): Promise<void>;
  /** Rewarded video. Resolves true only if the reward must be granted. */
  showRewarded(): Promise<boolean>;
  /** Preferred language reported by the platform (null = unknown). */
  getLang(): Lang | null;
  /** Platform-driven pause/resume (e.g. the portal shows its own overlay). */
  onPauseChange(handler: (paused: boolean) => void): void;
}
