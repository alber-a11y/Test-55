import { engine } from '../audio/engine';
import { music } from '../audio/music';
import { sfx } from '../audio/sfx';
import { panelTexture } from '../art/textures';
import { getLang, setLang, t, type Lang } from '../core/i18n';
import { store } from '../core/save';
import { VERSION } from '../config';
import { BTN } from '../data/themes';
import { Button } from '../ui/Button';
import { Popup } from '../ui/Popup';
import { label, plain } from '../ui/text';
import { Slider, Toggle, toast } from '../ui/widgets';
import { BaseScene } from './BaseScene';

export class SettingsScene extends BaseScene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.setup();
    music.play('menu');
    this.addBackground();
    const th = this.theme;
    const { cx, colX, H } = this;
    new Button(this, colX + 90, 96, { w: 120, h: 120, colors: th.primary, icon: 'ui_back', iconSize: 66, onClick: () => this.back() });
    label(this, cx, 96, t('settings'), 72, { stroke: th.title.stroke });

    const pw = 980;
    const ph = Math.min(H - 260, 1120);
    const top = 210;
    this.add.image(cx, top + ph / 2, panelTexture(this.textures, pw, ph, th.panel.top, th.panel.bottom, th.panel.border));
    const s = store.data.settings;
    const L = cx - pw / 2 + 70;
    let y = top + 120;
    const icon = (k: string) => this.add.image(L + 50, y, k).setDisplaySize(84, 84).setTint(0x000000).setAlpha(0.18);
    const iconColor = (k: string) => {
      const b = new Button(this, L + 50, y, { w: 110, h: 110, colors: th.primary, icon: k, iconSize: 66, onClick: () => undefined, silent: true });
      b.disableInteractive();
    };
    void icon;
    const rowTitle = (k: Parameters<typeof t>[0]) => plain(this, L + 130, y, t(k), 46, th.panel.text, { originX: 0, weight: '900' });

    iconColor('ui_music');
    rowTitle('music');
    new Slider(this, cx + 30, y, 380, s.music, th.primary[1], (v) => {
      s.music = v;
      engine.setVolumes(s.music, s.sfx);
    }, () => store.save());
    y += 170;
    iconColor('ui_sound');
    rowTitle('sounds');
    new Slider(this, cx + 30, y, 380, s.sfx, th.primary[1], (v) => {
      s.sfx = v;
      engine.setVolumes(s.music, s.sfx);
    }, () => {
      store.save();
      sfx('match');
    });
    y += 170;
    iconColor('ui_vibro');
    rowTitle('vibration');
    new Toggle(this, cx + pw / 2 - 150, y, s.vibro, (v) => {
      s.vibro = v;
      store.save();
      if (v) navigator.vibrate?.(40);
    });
    y += 170;
    iconColor('ui_lang');
    rowTitle('language');
    const langs: Array<[Lang, string]> = [['ru', 'Русский'], ['en', 'English']];
    langs.forEach(([l, name], i) => {
      new Button(this, cx + 70 + i * 250, y, { w: 230, h: 110, colors: getLang() === l ? BTN.green : BTN.gray, text: name, fontSize: 40, onClick: () => {
        if (getLang() === l) return;
        s.lang = l;
        store.save();
        setLang(l);
        this.scene.restart(this.sceneData);
      } });
    });
    y += 220;
    new Button(this, cx, y, { w: 620, h: 130, colors: BTN.red, text: t('reset'), fontSize: 48, onClick: () => this.confirmReset() });
    y += 150;
    plain(this, cx, Math.min(y, top + ph - 60), t('about', { v: VERSION }), 32, th.panel.sub);
  }

  private confirmReset(): void {
    const th = this.theme;
    const p = new Popup(this, { w: 840, h: 600, title: t('reset'), theme: th, closable: true, backdropCloses: true });
    p.content.add(plain(this, 0, -60, t('resetConfirm'), 44, th.panel.text, { wrap: 720, lineSpacing: 6 }));
    p.content.add(new Button(this, -180, 160, { w: 320, h: 130, colors: BTN.red, text: t('yes'), fontSize: 54, onClick: () => {
      store.reset();
      p.close(() => {
        toast(this, 'OK');
        this.time.delayedCall(400, () => this.go('Menu'));
      });
    } }));
    p.content.add(new Button(this, 180, 160, { w: 320, h: 130, colors: BTN.green, text: t('no'), fontSize: 54, onClick: () => p.close() }));
  }
}
