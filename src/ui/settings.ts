import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { getLang, setLang, t } from '../core/i18n';
import { save } from '../core/save';
import { Button, panel, Slider, txt } from './widgets';

/**
 * Modal settings panel: music / sound volume sliders and language.
 * `onClose(langChanged)` — the caller restarts its scene when the language changed.
 */
export function openSettings(scene: Phaser.Scene, onClose: (langChanged: boolean) => void, depth = 200): Phaser.GameObjects.Container {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const d = save.data.settings;
  const startLang = getLang();
  const c = scene.add.container(0, 0).setDepth(depth);
  c.add(scene.add.rectangle(0, 0, W, H, 0x0a0820, 0.75).setOrigin(0).setInteractive());
  const pw = 560;
  const x0 = W / 2 - pw / 2;
  c.add(panel(scene, x0, 110, pw, 480, 0x2b2f55));
  c.add(txt(scene, W / 2, 158, t('settings').toUpperCase(), 44, '#ffd60a'));

  const row = (y: number, icon: string, label: string, value: number, apply: (v: number) => void, preview?: () => void) => {
    c.add(scene.add.image(x0 + 56, y, icon).setDisplaySize(46, 46));
    c.add(txt(scene, x0 + 90, y, label, 26, '#ffffff').setOrigin(0, 0.5));
    c.add(
      new Slider(scene, x0 + 360, y, 220, value, (v, final) => {
        apply(v);
        save.save();
        if (final) preview?.();
      }),
    );
  };
  row(250, 'i_music', t('music'), d.musicVol, (v) => {
    d.musicVol = v;
    audio.setVolumes(d.soundVol, d.musicVol);
  });
  row(330, 'i_sound', t('sound'), d.soundVol, (v) => {
    d.soundVol = v;
    audio.setVolumes(d.soundVol, d.musicVol);
  }, () => audio.play('coin', { throttleMs: 0 }));

  c.add(scene.add.image(x0 + 56, 420, 'i_globe').setDisplaySize(46, 46));
  c.add(txt(scene, x0 + 90, 420, t('language'), 26, '#ffffff').setOrigin(0, 0.5));
  const langBtns: Button[] = [];
  (['ru', 'en'] as const).forEach((l, i) => {
    const b = new Button(scene, x0 + 330 + i * 110, 420, { w: 96, h: 56, color: getLang() === l ? 'yellow' : 'dark', label: l.toUpperCase(), size: 24 }).onClick(() => {
      setLang(l);
      d.lang = l;
      save.save();
      langBtns.forEach((bb, j) => bb.setColor(j === i ? 'yellow' : 'dark'));
    });
    langBtns.push(b);
    c.add(b);
  });

  c.add(
    new Button(scene, W / 2, 530, { w: 260, h: 74, color: 'green', label: t('done'), size: 30 }).onClick(() => {
      save.flush();
      c.destroy();
      onClose(getLang() !== startLang);
    }),
  );
  return c;
}
