import { audio } from '@shared/audio/audio';
import { getLang, setLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, Slider, Toggle, txt } from '@shared/ui/widgets';
import { save } from '../save';
import { skin } from '../skin';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

export class SettingsScene extends BaseScene {
  constructor() {
    super('Settings');
  }

  create(data: { from?: string }): void {
    const W = this.W;
    menuBackground(this);
    topBar(this, t('settings'), () => {
      save.flush();
      this.go(data.from ?? 'Menu', {}, 'settings_back');
    }, { coins: false });
    const s = save.data.settings;
    const pw = Math.min(W - 60, 940);
    const py = this.portrait ? 240 : 190;
    const rh = this.portrait ? 140 : 110;
    panel(this, W / 2 - pw / 2, py, pw, rh * 5 + 60);
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
    (['ru', 'en'] as const).forEach((l, i) =>
      new Button(this, xr - 190 + i * 140, y, { w: 120, h: 80, color: getLang() === l ? 'gold' : 'dark', label: l.toUpperCase(), size: 32 }).onClick(() => {
        setLang(l);
        s.lang = l;
        save.save();
        this.scene.restart(data);
      }),
    );
    y += rh;
    label('timer', t('set_speed'));
    ([1, 2, 3] as const).forEach((v, i) =>
      new Button(this, xr - 300 + i * 150, y, { w: 136, h: 80, color: s.speed === v ? 'gold' : 'dark', label: t(`speed${v}`), size: 26 }).onClick(() => {
        s.speed = v;
        save.save();
        this.scene.restart(data);
      }),
    );
    y += rh;
    label('cards', t('set_ruLetters'));
    new Toggle(this, xr - 60, y, s.ruLetters, (v) => {
      s.ruLetters = v;
      save.save();
      skin.apply();
    });
    this.setupScene();
  }
}
