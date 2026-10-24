import { audio } from '@shared/audio/audio';
import { getLang, setLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, Slider, Toggle, txt } from '@shared/ui/widgets';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

export class SettingsScene extends BaseScene {
  constructor() {
    super('Settings');
  }

  create(data: { from?: string; back?: unknown }): void {
    const W = this.W;
    const H = this.H;
    menuBackground(this);
    const back = () => {
      save.flush();
      this.go(data.from ?? 'Menu', data.back ?? {}, data.back ? undefined : 'settings_back');
    };
    topBar(this, t('settings'), back, { coins: false });
    const s = save.data.settings;
    const pw = Math.min(W - 60, 940);
    const py = this.portrait ? 230 : 180;
    const rows = 9;
    const rh = this.portrait ? 128 : 92;
    panel(this, W / 2 - pw / 2, py, pw, rows * rh + 60);
    let y = py + 30 + rh / 2;
    const x0 = W / 2 - pw / 2 + 50;
    const xr = W / 2 + pw / 2 - 60;
    const label = (icon: string, text: string) => {
      this.add.image(x0 + 30, y, `i_${icon}`).setDisplaySize(64, 64);
      txt(this, x0 + 80, y, text, 34, '#ffffff').setOrigin(0, 0.5);
    };
    label('music', t('music'));
    new Slider(this, xr - 230, y, 300, s.musicVol, (v) => {
      s.musicVol = v;
      audio.setVolumes(s.soundVol, s.musicVol);
      save.save();
    });
    y += rh;
    label('sound', t('sound'));
    new Slider(this, xr - 230, y, 300, s.soundVol, (v, final) => {
      s.soundVol = v;
      audio.setVolumes(s.soundVol, s.musicVol);
      save.save();
      if (final) audio.play('coin', { throttleMs: 0 });
    });
    y += rh;
    label('globe', t('language'));
    const langs: Button[] = [];
    (['ru', 'en'] as const).forEach((l, i) => {
      const b = new Button(this, xr - 190 + i * 140, y, { w: 120, h: 80, color: getLang() === l ? 'gold' : 'dark', label: l.toUpperCase(), size: 32 }).onClick(() => {
        setLang(l);
        s.lang = l;
        save.save();
        langs.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
        this.scene.restart(data);
      });
      langs.push(b);
    });
    y += rh;
    const toggle = (icon: string, text: string, get: () => boolean, set: (v: boolean) => void) => {
      label(icon, text);
      new Toggle(this, xr - 60, y, get(), (v) => {
        set(v);
        save.save();
      });
      y += rh;
    };
    toggle('wand', t('set_autoMove'), () => s.autoMove, (v) => (s.autoMove = v));
    toggle('check', t('set_solvable'), () => s.solvable, (v) => (s.solvable = v));
    toggle('timer', t('set_timer'), () => s.timer, (v) => (s.timer = v));
    toggle('hand', t('set_leftHand'), () => s.leftHand, (v) => (s.leftHand = v));
    label('cards', t('set_klDraw'));
    const draws: Button[] = [];
    ([1, 3] as const).forEach((d, i) => {
      const b = new Button(this, xr - 190 + i * 140, y, { w: 120, h: 80, color: s.klDraw === d ? 'gold' : 'dark', label: String(d), size: 32 }).onClick(() => {
        s.klDraw = d;
        save.save();
        draws.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
      });
      draws.push(b);
    });
    y += rh;
    label('cards', t('set_spSuits'));
    const suits: Button[] = [];
    ([1, 2, 4] as const).forEach((d, i) => {
      const b = new Button(this, xr - 260 + i * 120, y, { w: 104, h: 80, color: s.spSuits === d ? 'gold' : 'dark', label: String(d), size: 32 }).onClick(() => {
        s.spSuits = d;
        save.save();
        suits.forEach((bb, j) => bb.setColor(j === i ? 'gold' : 'dark'));
      });
      suits.push(b);
    });
    void H;
    this.setupScene();
  }
}
