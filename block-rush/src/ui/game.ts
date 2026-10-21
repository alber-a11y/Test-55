import { audio } from '../audio/audio';
import { CONFIG } from '../config';
import { t } from '../core/i18n';
import { addBooster, addCoins, boosterCount, persist, save, takeBooster } from '../core/save';
import { pauseHub } from '../core/pause';
import { BOOSTERS, boosterDef, boosterName, type BoosterId } from '../game/boosters';
import { Session, type SessionEvent } from '../game/session';
import { ads } from '../platform/ads';
import { GameView } from '../render/view';
import { interstitial, syncGameplay, watchAd, type Screen } from './app';
import { btn, h, iconBtn, openModal, toast, type ModalHandle } from './dom';
import { boosterIcon, ICONS } from './icons';
import { nav } from './nav';
import { settingsRows } from './settings';

type Mode = 'levels' | 'classic';

export class GameScreen implements Screen {
  el: HTMLElement;
  music: 'levels' | 'classic';
  private canvas: HTMLCanvasElement;
  private view: GameView;
  session!: Session;
  private hud: Record<string, HTMLElement> = {};
  private boosterEls = new Map<BoosterId, { el: HTMLElement; count: HTMLElement }>();
  private armed: BoosterId | null = null;
  private hintEl: HTMLElement;
  private chipsEl: HTMLElement;
  private endTimer = 0;
  private startModal: ModalHandle | null = null;
  private shownGems = 0;
  private lastHud = '';
  private adBreakPending = false;

  constructor(
    readonly mode: Mode,
    private level = 1,
  ) {
    this.music = mode;
    this.canvas = h('canvas', { class: 'board-canvas' });
    this.hintEl = h('div', { class: 'target-hint hidden' });
    this.chipsEl = h('div', { class: 'chips' });
    this.el = h('div', { class: `screen game-screen mode-${mode}` }, [
      this.buildHud(),
      h('div', { class: 'canvas-wrap' }, [this.canvas, this.chipsEl, this.hintEl]),
      this.buildBoosterBar(),
    ]);
    this.view = new GameView(this.canvas);
    this.view.onTarget = (tg) => this.applyArmed(tg);
    this.view.gemTarget = () => this.gemTargetPoint();
    this.view.onGemArrive = () => {
      this.shownGems = Math.min(this.session.gemsTotal, this.shownGems + 1);
      this.hud.gems?.parentElement?.classList.remove('pulse');
      void this.hud.gems?.parentElement?.offsetWidth;
      this.hud.gems?.parentElement?.classList.add('pulse');
    };
    this.view.onDragChange = (d) => {
      if (d) ads.blockers.add('drag');
      else ads.blockers.delete('drag');
    };
    this.newSession();
  }

  // ---------- setup ----------

  private buildHud(): HTMLElement {
    const box = (key: string, label: string, icon?: string) => {
      const v = h('b', { text: '0' });
      this.hud[key] = v;
      return h('div', { class: `hud-box hud-${key}` }, [
        icon ? h('span', { class: 'hud-icon', html: icon }) : null,
        h('span', { class: 'hud-text' }, [h('small', { text: label }), v]),
      ]);
    };
    const pause = iconBtn(ICONS.pause, () => this.openPause(), 'hud-pause');
    if (this.mode === 'levels') {
      return h('div', { class: 'hud' }, [
        pause,
        box('time', t('hud.time'), ICONS.clock),
        box('gems', t('hud.gems'), ICONS.gem),
        box('score', t('hud.score')),
        box('level', t('hud.level')),
      ]);
    }
    return h('div', { class: 'hud' }, [pause, box('best', t('hud.best'), ICONS.trophy), box('score', t('hud.score'))]);
  }

  private buildBoosterBar(): HTMLElement {
    const bar = h('div', { class: 'boosters scroll-x' });
    for (const b of BOOSTERS) {
      if (!b.modes.includes(this.mode)) continue;
      const count = h('span', { class: 'b-count' });
      const el = h(
        'button',
        {
          class: 'booster',
          title: t(boosterName(b.id)),
          onClick: () => this.onBooster(b.id),
        },
        [h('span', { class: 'b-icon', html: boosterIcon(b.id) }), count, h('span', { class: 'b-name', text: t(boosterName(b.id)) })],
      );
      this.boosterEls.set(b.id, { el, count });
      bar.appendChild(el);
    }
    this.refreshBoosters();
    return bar;
  }

  private refreshBoosters(): void {
    for (const [id, { el, count }] of this.boosterEls) {
      const n = boosterCount(id);
      count.innerHTML = n > 0 ? String(n) : ICONS.ad;
      count.classList.toggle('is-ad', n === 0);
      el.classList.toggle('armed', this.armed === id);
    }
  }

  private newSession(): void {
    clearTimeout(this.endTimer);
    this.session = this.mode === 'levels' ? new Session({ mode: 'levels', level: this.level }) : new Session({ mode: 'classic' });
    this.session.on((e) => this.onEvent(e));
    this.view.setSession(this.session);
    this.shownGems = 0;
    this.disarm();
    this.lastHud = '';
    if (this.mode === 'levels') {
      save.stats.played++;
      this.openStart();
    } else {
      save.stats.classicGames++;
    }
    persist();
    syncGameplay();
  }

  resize(): void {
    this.view.resize();
  }

  inPlay(): boolean {
    return this.session.state === 'playing' && !this.startModal;
  }

  destroy(): void {
    clearTimeout(this.endTimer);
    ads.blockers.delete('drag');
  }

  // ---------- frame / hud ----------

  frame(dt: number): void {
    const s = this.session;
    // Timers run only when nothing pauses the game (modal, ad, hidden tab, blur, platform).
    if (!pauseHub.paused) s.update(dt);
    this.view.frame(dt);
    this.updateHud();
  }

  private updateHud(): void {
    const s = this.session;
    const time = Math.ceil(s.timeLeft);
    const key = `${s.score}|${time}|${this.shownGems}|${Math.ceil(s.freezeLeft)}|${Math.ceil(s.x2Left)}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    this.hud.score.textContent = String(s.score);
    if (this.mode === 'levels') {
      this.hud.time.textContent = String(time);
      this.hud.time.parentElement!.parentElement!.classList.toggle('low', time <= 10 && s.freezeLeft <= 0);
      this.hud.gems.textContent = `${this.shownGems}/${s.gemsTotal}`;
      this.hud.level.textContent = String(s.levelNo);
    } else {
      this.hud.best.textContent = String(Math.max(save.bestClassic, s.score));
    }
    const chips: string[] = [];
    if (s.freezeLeft > 0) chips.push(`<span class="chip chip-ice">${boosterIcon('freeze')}${Math.ceil(s.freezeLeft)}</span>`);
    if (s.x2Left > 0) chips.push(`<span class="chip chip-x2">${boosterIcon('x2')}${Math.ceil(s.x2Left)}</span>`);
    this.chipsEl.innerHTML = chips.join('');
  }

  private gemTargetPoint(): { x: number; y: number } | null {
    const g = this.hud.gems;
    if (!g) return null;
    const a = g.parentElement!.parentElement!.getBoundingClientRect();
    const c = this.canvas.getBoundingClientRect();
    return { x: a.left + 22 - c.left, y: a.top + a.height / 2 - c.top };
  }

  // ---------- session events ----------

  private onEvent(e: SessionEvent): void {
    if (e.type === 'state') {
      clearTimeout(this.endTimer);
      if (this.session.state === 'won') {
        audio.play('win');
        this.endTimer = window.setTimeout(() => this.openWin(), 1100);
      } else if (this.session.state === 'lost') {
        if (this.session.loseReason === 'moves') toast(t('toast.noFit'), 'bad');
        this.disarm();
        this.view.cancelDrag();
        this.endTimer = window.setTimeout(() => this.openLose(), this.session.loseReason === 'moves' ? 900 : 500);
      }
      syncGameplay();
    } else if (e.type === 'tray' && e.refill && this.mode === 'classic' && this.session.moves > 0) {
      this.maybeAdBreak();
    }
  }

  /** Classic mode: periodic fullscreen ad at a natural pause (new set of pieces). */
  private maybeAdBreak(): void {
    if (this.adBreakPending || ads.sinceLastAd() < CONFIG.ads.classicBreakSec || !ads.canShowInterstitial()) return;
    this.adBreakPending = true;
    const note = h('div', { class: 'ad-break' }, [h('div', { text: t('ad.break') })]);
    this.el.appendChild(note);
    // Freeze the board while the notice is up.
    pauseHub.set('adbreak', true);
    window.setTimeout(async () => {
      note.remove();
      await interstitial('classic_break');
      pauseHub.set('adbreak', false);
      this.adBreakPending = false;
    }, 1300);
  }

  // ---------- boosters ----------

  private disarm(): void {
    this.armed = null;
    this.view.targeting = null;
    this.hintEl.classList.add('hidden');
    this.refreshBoosters();
  }

  private async onBooster(id: BoosterId): Promise<void> {
    audio.play('click');
    if (this.session.state !== 'playing' || this.startModal) return;
    if (this.armed === id) {
      this.disarm();
      return;
    }
    this.disarm();
    if (boosterCount(id) <= 0) {
      const ok = await this.offerBooster(id);
      if (!ok) return;
    }
    const def = boosterDef(id);
    if (def.target === 'instant') {
      if (id === 'undo' && !this.session.canUndo) {
        toast(t('booster.nothingToUndo'), 'bad');
        return;
      }
      if (this.session.useBooster(id)) {
        takeBooster(id);
        if (id === 'freeze') toast(t('toast.freeze'), 'good');
        if (id === 'x2') toast(t('toast.x2'), 'good');
        if (id === 'time') toast(t('toast.time', { n: 30 }), 'good');
      } else toast(t('booster.notHere'), 'bad');
      this.refreshBoosters();
      return;
    }
    this.armed = id;
    this.view.targeting = { id, kind: def.target };
    this.hintEl.innerHTML = '';
    this.hintEl.append(
      h('span', { class: 'th-icon', html: boosterIcon(id) }),
      h('span', {}, [
        h('b', { text: t(boosterName(id)) }),
        h('span', { text: ' · ' + t(def.target === 'cell' ? 'booster.pickCell' : 'booster.pickPiece') }),
        h('small', { text: t('booster.cancelHint') }),
      ]),
    );
    this.hintEl.classList.remove('hidden');
    this.refreshBoosters();
  }

  private applyArmed(target: { x?: number; y?: number; slot?: number }): void {
    const id = this.armed;
    if (!id) return;
    if (this.session.useBooster(id, target)) {
      takeBooster(id);
      this.disarm();
    } else {
      audio.play('invalid');
    }
  }

  /** Booster is out: offer it for a rewarded video. */
  private offerBooster(id: BoosterId): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        resolve(v);
      };
      const def = boosterDef(id);
      const m = openModal(
        [
          h('div', { class: 'big-icon', html: boosterIcon(id) }),
          h('p', { class: 'modal-text', text: t('booster.getDesc', { name: t(boosterName(id)) }) }),
          h('div', { class: 'modal-buttons' }, [
            btn(
              `${t('common.watch')}  +${def.adAmount}`,
              async () => {
                m.close();
                const ok = await watchAd(`booster_${id}`);
                if (ok) {
                  addBooster(id, def.adAmount);
                  toast(t('booster.got', { name: t(boosterName(id)) }), 'good');
                  this.refreshBoosters();
                }
                finish(ok);
              },
              { variant: 'green', ad: true },
            ),
          ]),
        ],
        { title: t('booster.get'), closable: true, onClose: () => finish(false) },
      );
    });
  }

  // ---------- modals ----------

  private openStart(): void {
    const s = this.session;
    let bonusBtn: HTMLButtonElement;
    const m = openModal(
      [
        h('div', { class: 'goal-row' }, [
          h('div', { class: 'goal' }, [h('span', { html: ICONS.gem }), h('b', { text: String(s.gemsTotal) })]),
          h('div', { class: 'goal' }, [h('span', { html: ICONS.clock }), h('b', { text: `${s.timeTotal}` })]),
        ]),
        h('p', { class: 'modal-text', text: t('start.goal', { g: s.gemsTotal }) + ' · ' + t('start.time', { t: s.timeTotal }) }),
        h('p', { class: 'modal-hint', text: t('start.hint') }),
        h('div', { class: 'modal-buttons' }, [
          btn(t('start.play'), () => m.close(), { variant: 'green', icon: ICONS.play }),
          (bonusBtn = btn(
            t('start.bonus'),
            async () => {
              const ok = await watchAd('start_bonus');
              if (ok) {
                s.timeLeft += 20;
                s.timeTotal += 20;
                addBooster('bomb', 1);
                this.refreshBoosters();
                toast(t('start.bonusGot'), 'good');
                bonusBtn.disabled = true;
                m.close();
              }
            },
            { variant: 'gold', ad: true, sub: t('start.bonusDesc') },
          )),
        ]),
      ],
      {
        title: t('start.title', { n: s.levelNo }),
        class: 'start-modal',
        onClose: () => {
          this.startModal = null;
          syncGameplay();
        },
      },
    );
    this.startModal = m;
  }

  private openPause(): void {
    if (this.session.state !== 'playing') return;
    this.view.cancelDrag();
    const m = openModal(
      [
        h('div', { class: 'modal-buttons' }, [
          btn(t('pause.resume'), () => m.close(), { variant: 'green', icon: ICONS.play }),
          btn(
            t('pause.restart'),
            async () => {
              m.close();
              await interstitial('restart');
              this.newSession();
            },
            { variant: 'blue', icon: ICONS.retry },
          ),
          btn(
            t('pause.menu'),
            async () => {
              m.close();
              await interstitial('menu');
              nav.menu();
            },
            { variant: 'ghost', icon: ICONS.home },
          ),
        ]),
        ...settingsRows(false),
      ],
      { title: t('pause.title'), closable: true },
    );
  }

  private levelReward(): number {
    const e = CONFIG.economy;
    return Math.round(e.winBase + e.winPerStar * this.session.stars + e.winPerLevel * this.session.levelNo);
  }

  private openWin(): void {
    const s = this.session;
    const stars = s.stars;
    const lvl = s.levelNo;
    const reward = this.levelReward();
    // Progress is saved before any button so closing the tab never loses it.
    save.stars[lvl] = Math.max(save.stars[lvl] ?? 0, stars);
    if (lvl >= save.level) save.level = lvl + 1;
    save.stats.wins++;
    addCoins(reward);
    persist(true);
    let doubled = false;
    const coinsEl = h('b', { text: `+${reward}` });
    let dblBtn: HTMLButtonElement;
    const m = openModal(
      [
        h(
          'div',
          { class: 'stars' },
          [0, 1, 2].map((i) => h('span', { class: `star ${i < stars ? 'on' : ''}`, style: `animation-delay:${0.15 + i * 0.18}s`, html: i < stars ? ICONS.star : ICONS.starEmpty })),
        ),
        h('div', { class: 'result-row' }, [h('small', { text: t('hud.score') }), h('b', { text: String(s.score) })]),
        h('div', { class: 'result-row reward' }, [h('small', { text: t('win.reward') }), h('span', { class: 'coin', html: ICONS.coin }), coinsEl]),
        h('div', { class: 'modal-buttons' }, [
          (dblBtn = btn(
            t('win.double'),
            async () => {
              if (doubled) return;
              const ok = await watchAd('win_double');
              if (ok) {
                doubled = true;
                addCoins(reward);
                audio.play('coin');
                coinsEl.textContent = `+${reward * 2}`;
                dblBtn.disabled = true;
              }
            },
            { variant: 'gold', ad: true },
          )),
          btn(
            t('win.next'),
            async () => {
              m.close();
              await interstitial('level_complete');
              this.level = lvl + 1;
              this.newSession();
            },
            { variant: 'green', icon: ICONS.play },
          ),
          btn(
            t('lose.menu'),
            async () => {
              m.close();
              await interstitial('menu');
              nav.menu();
            },
            { variant: 'ghost', icon: ICONS.home, small: true },
          ),
        ]),
      ],
      { title: t('win.title'), class: 'win-modal' },
    );
  }

  private openLose(): void {
    if (this.mode === 'classic') return this.openGameOver();
    const s = this.session;
    const canRevive = s.revivesUsed < CONFIG.levels.revivesPerAttempt;
    audio.play('lose');
    const m = openModal(
      [
        h('div', { class: 'big-icon', html: s.loseReason === 'time' ? ICONS.clock : boosterIcon('refresh') }),
        h('p', { class: 'modal-text', text: t('lose.desc', { g: s.gemsLeft }) }),
        h('div', { class: 'modal-buttons' }, [
          canRevive
            ? btn(
                s.loseReason === 'time' ? t('lose.continueTime', { s: CONFIG.levels.reviveSeconds }) : t('lose.continueMoves'),
                async () => {
                  const ok = await watchAd('revive');
                  if (ok) {
                    m.close();
                    s.revive();
                  }
                },
                { variant: 'green', ad: true },
              )
            : null,
          btn(
            t('lose.retry'),
            async () => {
              m.close();
              await interstitial('level_fail');
              this.newSession();
            },
            { variant: 'blue', icon: ICONS.retry },
          ),
          btn(
            t('lose.menu'),
            async () => {
              m.close();
              await interstitial('menu');
              nav.menu();
            },
            { variant: 'ghost', icon: ICONS.home, small: true },
          ),
        ]),
      ],
      { title: s.loseReason === 'time' ? t('lose.timeTitle') : t('lose.movesTitle'), class: 'lose-modal' },
    );
  }

  private openGameOver(): void {
    const s = this.session;
    const isBest = s.score > save.bestClassic;
    if (isBest) {
      save.bestClassic = s.score;
      persist(true);
    }
    const coins = Math.floor(s.score * CONFIG.economy.classicCoinsPerScore);
    const canRevive = s.revivesUsed < CONFIG.classic.revivesPerGame;
    audio.play(isBest ? 'win' : 'lose');
    const finishGame = () => {
      if (coins > 0) addCoins(coins);
    };
    const m = openModal(
      [
        isBest ? h('div', { class: 'new-best', text: t('over.newBest') }) : null,
        h('div', { class: 'result-row big' }, [h('small', { text: t('over.score') }), h('b', { text: String(s.score) })]),
        h('div', { class: 'result-row' }, [h('small', { text: t('over.best') }), h('span', { class: 'coin', html: ICONS.trophy }), h('b', { text: String(save.bestClassic) })]),
        h('div', { class: 'result-row reward' }, [h('small', { text: t('over.coins') }), h('span', { class: 'coin', html: ICONS.coin }), h('b', { text: `+${coins}` })]),
        h('div', { class: 'modal-buttons' }, [
          canRevive
            ? btn(
                t('over.continue'),
                async () => {
                  const ok = await watchAd('revive_classic');
                  if (ok) {
                    m.close();
                    s.revive();
                  }
                },
                { variant: 'green', ad: true, sub: t('over.continueDesc') },
              )
            : null,
          btn(
            t('lose.retry'),
            async () => {
              m.close();
              finishGame();
              await interstitial('game_over');
              this.newSession();
            },
            { variant: 'blue', icon: ICONS.retry },
          ),
          btn(
            t('lose.menu'),
            async () => {
              m.close();
              finishGame();
              await interstitial('menu');
              nav.menu();
            },
            { variant: 'ghost', icon: ICONS.home, small: true },
          ),
        ]),
      ],
      { title: t('over.title'), class: 'lose-modal' },
    );
  }
}
