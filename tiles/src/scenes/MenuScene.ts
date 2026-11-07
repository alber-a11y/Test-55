import { music } from '../audio/music';
import { ensureIcons, ensureSkin, iconKey, tileKey } from '../art/textures';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { store } from '../core/save';
import { BTN } from '../data/themes';
import { Button } from '../ui/Button';
import { openDaily } from '../ui/DailyPopup';
import { label } from '../ui/text';
import { badge, CoinCounter } from '../ui/widgets';
import { BaseScene } from './BaseScene';

let dailyShownThisSession = false;

export class MenuScene extends BaseScene {
  coins!: CoinCounter;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.setup();
    music.play('menu');
    this.addBackground();
    const { cx, H, colX } = this;
    const th = this.theme;

    new Button(this, colX + 90, 96, { w: 120, h: 120, colors: th.primary, icon: 'ui_gear', iconSize: 70, onClick: () => this.go('Settings', { from: 'Menu' }, { hop: true }) });
    this.coins = new CoinCounter(this, colX + 1080 - 190, 96, () => this.go('Shop', { tab: 'coins' }, { hop: true }));

    this.buildLogo(cx, H * 0.24);

    const lvl = store.data.level;
    const playY = H * 0.58;
    label(this, cx, playY - 150, t('level', { n: lvl }), 64, { stroke: th.title.stroke });
    const play = new Button(this, cx, playY, { w: 640, h: 190, colors: BTN.green, text: t('play'), fontSize: 92, icon: 'ui_play', iconSize: 96, onClick: () => this.go('Game', { level: lvl }) });
    play.pulse();

    const rowY = playY + 310;
    const items: Array<[string, string, () => void, boolean]> = [
      ['ui_map', t('map'), () => this.go('Map', {}, { hop: true }), false],
      ['ui_shop', t('shop'), () => this.go('Shop', {}, { hop: true }), false],
      ['ui_gift', t('gift'), () => openDaily(this, this.coins), econ.dailyAvailable()],
    ];
    items.forEach(([icon, text, fn, dot], i) => {
      const x = cx + (i - 1) * 300;
      const b = new Button(this, x, rowY, { w: 270, h: 240, colors: th.primary, icon, iconSize: 130, onClick: fn });
      b.icon!.setY(-30);
      const l = label(this, 0, 70, text, 40, { stroke: th.primary[2] });
      if (l.width > 240) l.setScale(240 / l.width);
      b.add(l);
      if (dot) b.add(badge(this, 112, -100));
    });

    if (econ.dailyAvailable() && !dailyShownThisSession && store.data.stats.wins > 0) {
      dailyShownThisSession = true;
      this.time.delayedCall(500, () => openDaily(this, this.coins));
    }
  }

  private buildLogo(x: number, y: number): void {
    const set = store.data.equipped.icons;
    const skin = store.data.equipped.skin;
    const deco: Array<[number, number, number, number, number]> = [
      [-400, -60, -14, 0.8, 0],
      [400, -90, 12, 0.85, 3],
      [-330, 170, 10, 0.7, 6],
      [350, 160, -12, 0.72, 9],
      [0, -230, 0, 0.75, 4],
    ];
    void Promise.all([ensureSkin(this.textures, skin), ensureIcons(this.textures, set, deco.map((d) => d[4]))]).then(() => {
      if (this.sys.isActive()) this.buildDeco(x, y, deco, set, skin);
    });
    this.buildTitle(x, y);
  }

  private buildDeco(x: number, y: number, deco: Array<[number, number, number, number, number]>, set: string, skin: string): void {
    for (const [dx, dy, rot, s, ic] of deco) {
      const c = this.add.container(x + dx, y + dy).setDepth(-1);
      c.add(this.add.image(0, 0, tileKey(skin)));
      c.add(this.add.image(0, -7, iconKey(set, ic)).setDisplaySize(118, 118));
      c.setScale(s).setAngle(rot);
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 250 });
      this.tweens.add({ targets: c, y: c.y - 18, angle: rot + 4, yoyo: true, repeat: -1, duration: 1600 + Math.abs(dx) * 2, ease: 'Sine.easeInOut' });
    }
  }

  private buildTitle(x: number, y: number): void {
    const th = this.theme;
    const words = t('title').split(' ');
    const mk = (s: string, yy: number, size: number) => {
      const tt = label(this, x, yy, s, size, { stroke: th.title.stroke, strokeW: Math.round(size * 0.17) });
      const g = tt.context.createLinearGradient(0, 0, 0, tt.height);
      g.addColorStop(0.15, '#fff7b0');
      g.addColorStop(0.55, '#ffd23a');
      g.addColorStop(0.95, '#ff9a1a');
      tt.setFill(g);
      if (tt.width > 900) tt.setScale(900 / tt.width);
      return tt;
    };
    const a = mk(words[0], y - 40, 150);
    const b = mk(words.slice(1).join(' '), y + 100, 170);
    for (const o of [a, b]) {
      o.setScale(o.scale * 0.2);
      this.tweens.add({ targets: o, scale: o.scale * 5, duration: 500, ease: 'Back.easeOut', delay: o === a ? 0 : 120 });
    }
    const sub = this.add.container(x, y + 255);
    const subT = label(this, 0, -4, t('subtitle'), 60, { stroke: th.primary[2] });
    const w = subT.width + 120;
    const bgB = new Button(this, 0, 0, { w: Math.round(w), h: 100, colors: th.primary, onClick: () => undefined, silent: true });
    bgB.disableInteractive();
    sub.add([bgB, subT]);
  }
}
