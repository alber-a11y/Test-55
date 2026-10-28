import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { ballKey } from '../art/balls';
import { canvasTexture, circle } from '../art/canvas';
import { backdropThumb } from '../art/scenery';
import {
  addAdView,
  addBooster,
  adViews,
  boosterCount,
  equip,
  equipped,
  freeBoosterLeft,
  freeCoinsLeft,
  grant,
  owns,
  spend,
  useFreeBooster,
  useFreeCoins,
} from '../core/economy';
import { getLang, t } from '../core/i18n';
import { BOOSTERS, type BoosterId } from '../data/boosters';
import { BALL_COLORS, LETTER_TO_COLOR } from '../data/colors';
import { BACKGROUNDS, BALL_SKINS, type Cosmetic, LAUNCHERS, MOSAIC_PACKS } from '../data/cosmetics';
import { picturesOfPack } from '../data/mosaics';
import { ads } from '../platform/AdManager';
import { AD_CONFIG } from '../platform/ads.config';
import { showDaily } from '../ui/daily';
import { Button, CoinPill, PALETTE, ribbon, RoundButton, ScrollArea, toast, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

type Tab = 'balls' | 'bg' | 'mosaic' | 'launcher' | 'boosters' | 'coins';
const TABS: [Tab, string][] = [
  ['balls', 'ic_balls'],
  ['bg', 'ic_picture'],
  ['mosaic', 'ic_mosaic'],
  ['launcher', 'ic_launcher'],
  ['boosters', 'ic_boosters'],
  ['coins', 'ic_coins'],
];

const CARD_W = 320;
const CARD_H = 370;

export class ShopScene extends BaseScene {
  private tab: Tab = 'balls';
  private area!: ScrollArea;
  private tabBtns: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.baseCreate();
    const { W, H } = this;
    const cx = W / 2;
    this.tab = this.sceneData.tab ?? this.tab;
    this.tabBtns = [];
    this.addBackdrop();
    this.add.rectangle(0, 0, W, H, 0x10051f, 0.45).setOrigin(0).setDepth(-90);
    this.add.rectangle(0, 0, W, H, 0, 0).setOrigin(0).setInteractive().setDepth(-80);

    new RoundButton(this, Math.max(56, cx - 304), 60, 'ic_back', 76, 'blue').setDepth(100).onClick(() => this.back());
    ribbon(this, cx, 60, 300, t('shop'), 'orange').setDepth(100);
    new CoinPill(this, Math.min(W - 100, cx + 262), 62).setDepth(100).setScale(0.85);

    const tw = Math.min(118, (Math.min(W, 720) - 20) / TABS.length);
    TABS.forEach(([id, icon], i) => {
      const x = cx + (i - (TABS.length - 1) / 2) * tw;
      const c = this.add.container(x, 160).setDepth(100);
      const g = this.add.graphics();
      c.add(g);
      c.add(this.add.image(0, -14, icon).setDisplaySize(54, 54));
      const l = txt(this, 0, 30, t(`tab_${id}`), 18);
      if (l.width > tw - 8) l.setScale((tw - 8) / l.width);
      c.add(l);
      c.setData('g', g);
      c.setSize(tw - 6, 96).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        audio.play('click', { vol: 0.6 });
        this.tab = id;
        this.sceneData.tab = id;
        this.refreshTabs();
        this.buildContent();
      });
      c.setData('id', id);
      c.setData('w', tw - 6);
      this.tabBtns.push(c);
    });
    this.refreshTabs();
    const aw = Math.min(W, 700);
    this.area = new ScrollArea(this, cx, 220, aw, H - 230);
    this.buildContent();
  }

  private refreshTabs(): void {
    for (const c of this.tabBtns) {
      const g = c.getData('g') as Phaser.GameObjects.Graphics;
      const w = c.getData('w') as number;
      const active = c.getData('id') === this.tab;
      const [top, mid] = PALETTE[active ? 'orange' : 'purple'];
      g.clear();
      g.fillStyle(0x2a1640, 1).fillRoundedRect(-w / 2 - 3, -51, w + 6, 102, 18);
      g.fillGradientStyle(top, top, mid, mid, 1).fillRoundedRect(-w / 2, -48, w, 96, 16);
      c.setScale(active ? 1.06 : 1);
    }
  }

  private back(): void {
    if (this.sceneData.overlay) {
      this.scene.stop();
      this.scene.resume(this.sceneData.from ?? 'Game');
    } else this.go(this.sceneData.from ?? 'Menu');
  }

  // ── Content ───────────────────────────────────────────────────────

  private buildContent(): void {
    const box = this.area.container;
    box.removeAll(true);
    this.area.reset();
    const cards: Phaser.GameObjects.Container[] = [];
    if (this.tab === 'boosters') cards.push(...this.boosterCards());
    else if (this.tab === 'coins') cards.push(...this.coinCards());
    else {
      const list = { balls: BALL_SKINS, bg: BACKGROUNDS, mosaic: MOSAIC_PACKS, launcher: LAUNCHERS }[this.tab];
      for (const c of list) cards.push(this.cosmeticCard(c));
    }
    const cols = this.area.bounds.w >= CARD_W * 2 + 20 ? 2 : 1;
    cards.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      c.setPosition((col - (cols - 1) / 2) * (CARD_W + 20), 10 + CARD_H / 2 + row * (CARD_H + 20));
      box.add(c);
    });
    this.area.setContentHeight(Math.ceil(cards.length / cols) * (CARD_H + 20) + 30);
  }

  private card(title: string, exclusive = false): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x2a1640, 1).fillRoundedRect(-CARD_W / 2 - 4, -CARD_H / 2 - 4, CARD_W + 8, CARD_H + 12, 26);
    g.fillStyle(0xd8762a, 1).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H + 4, 24);
    g.fillGradientStyle(0xfff6dc, 0xfff6dc, 0xffe3a6, 0xffe3a6, 1).fillRoundedRect(-CARD_W / 2 + 8, -CARD_H / 2 + 8, CARD_W - 16, CARD_H - 14, 20);
    g.fillStyle(0x3a8a4a, 0.15).fillRoundedRect(-CARD_W / 2 + 18, -CARD_H / 2 + 18, CARD_W - 36, 200, 16);
    c.add(g);
    const tt = txt(this, 0, 70, title, 26, '#ffffff');
    if (tt.width > CARD_W - 30) tt.setScale((CARD_W - 30) / tt.width);
    c.add(tt);
    if (exclusive) {
      const e = txt(this, 0, -CARD_H / 2 + 22, t('exclusive'), 18, '#ffe14a');
      const eg = this.add.graphics();
      eg.fillStyle(0x8a4dff, 1).fillRoundedRect(-e.width / 2 - 14, -CARD_H / 2 + 6, e.width + 28, 32, 14);
      c.add([eg, e]);
    }
    return c;
  }

  private preview(c: Cosmetic): Phaser.GameObjects.GameObject[] {
    const y = -CARD_H / 2 + 118;
    if (c.kind === 'balls') {
      const out: Phaser.GameObjects.GameObject[] = [];
      [0, 2, 3, 5, 7, 1].forEach((col, i) => {
        const x = (i % 3 - 1) * 82 + (Math.floor(i / 3) ? 0 : 0);
        const yy = y - 40 + Math.floor(i / 3) * 80;
        const b = this.add.image(x, yy, ballKey(c.id, col)).setScale(0.85);
        out.push(b);
        this.tweens.add({ targets: b, y: yy - 5, duration: 700 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      });
      return out;
    }
    if (c.kind === 'bg') return [this.add.image(0, y, backdropThumb(this, c.id)).setDisplaySize(268, 190)];
    if (c.kind === 'launcher') {
      return [this.add.image(0, y + 10, `launcher_${c.id}`).setDisplaySize(170, 170), this.add.image(0, y - 70, ballKey(equipped('balls'), 3)).setScale(0.6)];
    }
    return [this.add.image(0, y, this.mosaicThumb(c.id)).setDisplaySize(250, 190)];
  }

  private mosaicThumb(pack: string): string {
    const key = `mz_${pack}`;
    if (!this.textures.exists(key)) {
      const pics = picturesOfPack(pack);
      canvasTexture(this, key, 500, 380, (ctx) => {
        pics.slice(0, 2).forEach((p, k) => {
          const ox = k * 250;
          const cell = 250 / 17;
          p.art.forEach((row, r) => {
            for (let i = 0; i < row.length; i++) {
              const ch = row[i];
              if (ch === ' ') continue;
              const col = LETTER_TO_COLOR[ch];
              ctx.fillStyle = col === undefined ? 'rgba(120,90,60,0.18)' : BALL_COLORS[col].base;
              circle(ctx, ox + cell / 2 + i * cell + (r % 2) * (cell / 4), 20 + cell / 2 + r * cell * 0.9, cell * 0.44);
              ctx.fill();
            }
          });
        });
      });
    }
    return key;
  }

  private cosmeticCard(c: Cosmetic): Phaser.GameObjects.Container {
    const isAds = c.unlock.type === 'ads';
    const card = this.card(c.name[getLang()], isAds);
    card.add(this.preview(c));
    const y = CARD_H / 2 - 62;
    const owned = owns(c.id);
    let btn: Button;
    if (owned) {
      if (c.kind === 'mosaic') {
        btn = new Button(this, 0, y, { w: 250, h: 70, label: t('owned'), size: 26, color: 'grey' });
        card.add(txt(this, 0, 108, t('mosaicHint'), 15, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 3, wordWrap: { width: 270 } }));
      } else if (equipped(c.kind) === c.id) {
        btn = new Button(this, 0, y, { w: 250, h: 70, label: t('equipped'), size: 26, color: 'grey', icon: 'ic_check', iconSize: 40 });
      } else {
        btn = new Button(this, 0, y, { w: 250, h: 70, label: t('equip'), size: 28, color: 'green' });
        btn.onClick(() => {
          equip(c);
          audio.play('swap');
          this.buildContent();
        });
      }
    } else if (c.unlock.type === 'coins') {
      const price = c.unlock.price;
      btn = new Button(this, 0, y, { w: 250, h: 70, label: String(price), size: 30, color: 'orange', icon: 'ic_coin', iconSize: 48 });
      btn.onClick(() => {
        if (!spend(price)) {
          audio.play('error');
          return toast(this, t('notEnough'));
        }
        grant(c.id);
        equip(c);
        audio.play('buy');
        toast(this, t('bought'), '#7dff6a');
        this.buildContent();
      });
    } else {
      const need = c.unlock.type === 'ads' ? c.unlock.views : AD_CONFIG.exclusiveViews;
      btn = new Button(this, 0, y, { w: 250, h: 70, label: t('watch', { n: adViews(c.id), m: need }), size: 30, color: 'purple', icon: 'ic_ad', iconSize: 48 });
      btn.onClick(async () => {
        const ok = await ads.rewarded();
        if (!ok) return toast(this, t('adNoReward'));
        if (addAdView(c.id)) {
          equip(c);
          audio.play('unlock');
          toast(this, t('unlocked'), '#ffe14a');
        } else audio.play('coin');
        this.buildContent();
      });
      // Progress pips.
      for (let k = 0; k < need; k++) card.add(this.add.image((k - (need - 1) / 2) * 34, 112, k < adViews(c.id) ? 'ic_star' : 'ic_starEmpty').setDisplaySize(30, 30));
    }
    card.add(btn);
    return card;
  }

  private boosterCards(): Phaser.GameObjects.Container[] {
    const cards: Phaser.GameObjects.Container[] = [];
    const free = this.card(t('freeBooster'), true);
    free.add(this.add.image(0, -CARD_H / 2 + 112, 'ic_gift').setDisplaySize(140, 140));
    const left = freeBoosterLeft();
    free.add(txt(this, 0, 108, left > 0 ? t('leftToday', { n: left }) : t('noneToday'), 20, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 3 }));
    const fb = new Button(this, 0, CARD_H / 2 - 62, { w: 250, h: 70, label: t('free'), size: 28, color: left > 0 ? 'purple' : 'grey', icon: 'ic_ad', iconSize: 48 });
    fb.onClick(async () => {
      if (freeBoosterLeft() <= 0) return toast(this, t('noneToday'));
      const ok = await ads.rewarded();
      if (!ok) return toast(this, t('adNoReward'));
      const id = Phaser.Utils.Array.GetRandom(BOOSTERS).id as BoosterId;
      useFreeBooster(id);
      audio.play('unlock');
      toast(this, `${t('got')} ${t(`b_${id}`)}`, '#ffe14a');
      this.buildContent();
    });
    free.add(fb);
    cards.push(free);
    for (const b of BOOSTERS) {
      const card = this.card(t(`b_${b.id}`));
      card.add(this.add.image(0, -CARD_H / 2 + 108, b.icon).setDisplaySize(130, 130));
      card.add(txt(this, 92, -CARD_H / 2 + 40, `×${boosterCount(b.id)}`, 30, '#7dff6a'));
      card.add(txt(this, 0, 106, t(`bd_${b.id}`), 18, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 3, wordWrap: { width: 280 } }));
      const btn = new Button(this, 0, CARD_H / 2 - 62, { w: 250, h: 70, label: String(b.price), size: 30, color: 'orange', icon: 'ic_coin', iconSize: 48 });
      btn.onClick(() => {
        if (!spend(b.price)) {
          audio.play('error');
          return toast(this, t('notEnough'));
        }
        addBooster(b.id, 1);
        audio.play('buy');
        this.buildContent();
      });
      card.add(btn);
      cards.push(card);
    }
    return cards;
  }

  private coinCards(): Phaser.GameObjects.Container[] {
    const card = this.card(t('freeCoins', { n: AD_CONFIG.freeCoins.amount }), true);
    card.add(this.add.image(0, -CARD_H / 2 + 112, 'ic_coins').setDisplaySize(150, 150));
    const left = freeCoinsLeft();
    card.add(txt(this, 0, 108, left > 0 ? t('leftToday', { n: left }) : t('noneToday'), 20, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 3 }));
    const b = new Button(this, 0, CARD_H / 2 - 62, { w: 250, h: 70, label: t('free'), size: 28, color: left > 0 ? 'purple' : 'grey', icon: 'ic_ad', iconSize: 48 });
    b.onClick(async () => {
      if (freeCoinsLeft() <= 0) return toast(this, t('noneToday'));
      const ok = await ads.rewarded();
      if (!ok) return toast(this, t('adNoReward'));
      useFreeCoins();
      audio.play('coin');
      toast(this, `+${AD_CONFIG.freeCoins.amount}`, '#ffe14a');
      this.buildContent();
    });
    card.add(b);
    const daily = this.card(t('daily'));
    daily.add(this.add.image(0, -CARD_H / 2 + 112, 'ic_gift').setDisplaySize(140, 140));
    const d = new Button(this, 0, CARD_H / 2 - 62, { w: 250, h: 70, label: t('gift'), size: 28, color: 'pink' });
    d.onClick(() => showDaily(this, () => this.buildContent()));
    daily.add(d);
    return [card, daily];
  }
}
