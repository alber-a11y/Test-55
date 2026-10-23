import { platformConfig, type AdCallbacks, type Lang, type LeaderboardEntry, type PlatformAdapter } from './types';

/* Minimal typing of the parts of Yandex Games SDK v2 we use. */
interface YLbEntry {
  rank: number;
  score: number;
  player: { publicName?: string; uniqueID?: string };
}
interface YLbApi {
  setScore?(name: string, score: number): Promise<void>;
  setLeaderboardScore?(name: string, score: number): Promise<void>;
  getEntries?(name: string, o: Record<string, unknown>): Promise<{ entries: YLbEntry[]; userRank: number }>;
  getLeaderboardEntries?(name: string, o: Record<string, unknown>): Promise<{ entries: YLbEntry[]; userRank: number }>;
}
interface YSDK {
  adv: {
    showFullscreenAdv(o: { callbacks: Record<string, (...a: any[]) => void> }): void;
    showRewardedVideo(o: { callbacks: Record<string, (...a: any[]) => void> }): void;
  };
  features: {
    LoadingAPI?: { ready(): void };
    GameplayAPI?: { start(): void; stop(): void };
  };
  environment: { i18n: { lang: string } };
  getPlayer(o?: { scopes?: boolean }): Promise<{
    getData(keys?: string[]): Promise<Record<string, unknown>>;
    setData(d: Record<string, unknown>, flush?: boolean): Promise<void>;
    getUniqueID?(): string;
  }>;
  leaderboards?: YLbApi;
  getLeaderboards?(): Promise<YLbApi>;
  on?(event: string, cb: () => void): void;
}

export class YandexAdapter implements PlatformAdapter {
  readonly name = 'yandex';
  private ysdk!: YSDK;
  private player: Awaited<ReturnType<YSDK['getPlayer']>> | null = null;
  private lb: YLbApi | null = null;
  private pauseHandlers: ((p: boolean) => void)[] = [];
  private inGameplay = false;

  constructor(private readonly sdkFactory: { init(): Promise<YSDK> }) {}

  async init(): Promise<void> {
    this.ysdk = await this.sdkFactory.init();
    try {
      this.player = await this.ysdk.getPlayer({ scopes: false });
    } catch (e) {
      console.warn('[platform:yandex] player unavailable, using localStorage', e);
    }
    try {
      this.lb = this.ysdk.leaderboards ?? (await this.ysdk.getLeaderboards?.()) ?? null;
    } catch {
      this.lb = null;
    }
    this.ysdk.on?.('game_api_pause', () => this.pauseHandlers.forEach((h) => h(true)));
    this.ysdk.on?.('game_api_resume', () => this.pauseHandlers.forEach((h) => h(false)));
  }

  loadingReady(): void {
    this.ysdk.features.LoadingAPI?.ready();
  }

  gameplayStart(): void {
    if (this.inGameplay) return;
    this.inGameplay = true;
    this.ysdk.features.GameplayAPI?.start();
  }

  gameplayStop(): void {
    if (!this.inGameplay) return;
    this.inGameplay = false;
    this.ysdk.features.GameplayAPI?.stop();
  }

  showInterstitial(cb: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      let opened = false;
      let done = false;
      const close = (shown: boolean) => {
        if (done) return;
        done = true;
        if (opened) cb.onClose?.();
        resolve(shown);
      };
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => {
            opened = true;
            cb.onOpen?.();
          },
          onClose: (wasShown: boolean) => close(!!wasShown),
          onError: () => close(false),
          onOffline: () => close(false),
        },
      });
    });
  }

  showRewarded(cb: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      let opened = false;
      let rewarded = false;
      let done = false;
      const close = () => {
        if (done) return;
        done = true;
        if (opened) cb.onClose?.();
        resolve(rewarded);
      };
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {
            opened = true;
            cb.onOpen?.();
          },
          onRewarded: () => {
            rewarded = true;
          },
          onClose: close,
          onError: close,
        },
      });
    });
  }

  async loadData(): Promise<unknown | null> {
    let cloud: unknown = null;
    if (this.player) {
      try {
        const d = await this.player.getData(['save']);
        cloud = d?.save ?? null;
      } catch {
        /* ignore */
      }
    }
    if (cloud) return cloud;
    try {
      const raw = localStorage.getItem(platformConfig.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async saveData(data: unknown): Promise<void> {
    try {
      localStorage.setItem(platformConfig.saveKey, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    if (this.player) {
      try {
        await this.player.setData({ save: data as Record<string, unknown> });
      } catch {
        /* ignore — retried with next save */
      }
    }
  }

  getLang(): Lang {
    const l = (this.ysdk?.environment?.i18n?.lang || 'ru').toLowerCase();
    // Russian for CIS languages Yandex usually serves, English otherwise.
    return ['ru', 'be', 'kk', 'uk', 'uz'].includes(l) ? 'ru' : 'en';
  }

  onPauseChange(handler: (paused: boolean) => void): void {
    this.pauseHandlers.push(handler);
  }

  async setScore(board: string, score: number): Promise<void> {
    try {
      if (this.lb?.setScore) await this.lb.setScore(board, score);
      else await this.lb?.setLeaderboardScore?.(board, score);
    } catch {
      /* not authorized or board missing — leaderboards are optional */
    }
  }

  async getEntries(board: string): Promise<LeaderboardEntry[]> {
    if (!this.lb) return [];
    const opts = { quantityTop: 10, includeUser: true, quantityAround: 3 };
    try {
      const res = this.lb.getEntries ? await this.lb.getEntries(board, opts) : await this.lb.getLeaderboardEntries?.(board, opts);
      if (!res) return [];
      const me = this.player?.getUniqueID?.();
      return res.entries.map((e) => ({
        rank: e.rank,
        name: e.player.publicName || '—',
        score: e.score,
        isPlayer: !!me && e.player.uniqueID === me,
      }));
    } catch {
      return [];
    }
  }
}
