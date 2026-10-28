import { audio } from '../audio/audio';
import { getLang, setLang, t } from '../core/i18n';
import { save } from '../core/save';
import { Button, drawPanel, Modal, ribbon, RoundButton, Slider, Toggle, txt } from '../ui/widgets';
import { BaseScene } from './BaseScene';

export class SettingsScene extends BaseScene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.baseCreate();
    const { W, H } = this;
    const cx = W / 2;
    const s = save.data.settings;
    this.addBackdrop();
    this.add.rectangle(0, 0, W, H, 0x10051f, 0.45).setOrigin(0).setDepth(-90);
    this.add.rectangle(0, 0, W, H, 0, 0).setOrigin(0).setInteractive().setDepth(-80);
    const ph = Math.min(H - 80, 1000);
    const top = H / 2 - ph / 2;
    const g = this.add.graphics();
    g.setPosition(cx, H / 2);
    drawPanel(g, 620, ph);
    ribbon(this, cx, top + 6, 400, t('settings'), 'purple');
    new RoundButton(this, cx + 300, top + 10, 'ic_close', 70, 'red').onClick(() => this.back());

    const rowY = (i: number) => top + 130 + i * ((ph - 220) / 6.5);
    const label = (y: number, icon: string, s2: string) => {
      this.add.image(cx - 250, y, icon).setDisplaySize(54, 54).setTint(0x7a3f16);
      txt(this, cx - 210, y, s2, 28, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4 }).setOrigin(0, 0.5);
    };
    const apply = () => {
      audio.setVolumes(s.soundVol, s.musicVol);
      save.save();
    };
    label(rowY(0), 'ic_music', t('music'));
    new Slider(this, cx + 140, rowY(0), 230, s.musicVol, (v) => {
      s.musicVol = v;
      apply();
    });
    label(rowY(1), 'ic_sound', t('sound'));
    new Slider(this, cx + 140, rowY(1), 230, s.soundVol, (v) => {
      s.soundVol = v;
      apply();
      audio.play('pop', { throttleMs: 120 });
    });
    label(rowY(2), 'ic_vibro', t('vibration'));
    new Toggle(this, cx + 170, rowY(2), s.vibration, [t('on'), t('off')], (v) => {
      s.vibration = v;
      apply();
      if (v) navigator.vibrate?.(40);
    });
    label(rowY(3), 'ic_fx', t('effects'));
    new Toggle(this, cx + 170, rowY(3), !s.lowFx, [t('fxHigh'), t('fxLow')], (v) => {
      s.lowFx = !v;
      apply();
    }).setScale(1.1, 1);
    label(rowY(4), 'ic_lang', t('language'));
    (['ru', 'en'] as const).forEach((l, i) => {
      const b = new Button(this, cx + 100 + i * 120, rowY(4), { w: 104, h: 62, label: l.toUpperCase(), size: 26, color: getLang() === l ? 'green' : 'grey' });
      b.onClick(() => {
        s.lang = l;
        setLang(l);
        apply();
        this.scene.restart(this.sceneData);
      });
    });
    const fs = new Button(this, cx, rowY(5), { w: 420, h: 76, label: t('fullscreen'), size: 28, color: 'blue', icon: 'ic_fullscreen', iconSize: 46 });
    fs.onClick(() => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
    });
    const reset = new Button(this, cx, rowY(6), { w: 420, h: 70, label: t('reset'), size: 24, color: 'red' });
    reset.onClick(() => this.confirmReset());
    txt(this, cx, top + ph - 50, 'v0.1.0', 18, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 3 });
  }

  private confirmReset(): void {
    const m = new Modal(this, { w: 560, h: 420, title: t('reset'), titleColor: 'red' });
    m.content.add(txt(this, 0, -40, t('resetConfirm'), 26, '#7a3f16', { stroke: '#fff6dc', strokeThickness: 4, wordWrap: { width: 460 } }));
    const yes = new Button(this, -110, 110, { w: 190, h: 76, label: t('yes'), size: 30, color: 'red' });
    yes.onClick(() => {
      save.reset();
      m.close();
      this.time.delayedCall(250, () => this.back(true));
    });
    const no = new Button(this, 110, 110, { w: 190, h: 76, label: t('no'), size: 30, color: 'green' });
    no.onClick(() => m.close());
    m.content.add([yes, no]);
  }

  private back(toMenu = false): void {
    if (this.sceneData.overlay && !toMenu) {
      this.scene.stop();
      this.scene.resume(this.sceneData.from ?? 'Game');
    } else if (toMenu) {
      if (this.sceneData.overlay) this.scene.stop(this.sceneData.from ?? 'Game');
      this.go('Menu');
    } else this.go(this.sceneData.from ?? 'Menu');
  }
}
