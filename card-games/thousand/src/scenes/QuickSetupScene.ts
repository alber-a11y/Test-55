import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, Toggle, txt, UI } from '@shared/ui/widgets';
import { randomOpponents } from '../data/quick';
import { WORLDS } from '../data/route';
import { DEFAULT_RULES, type TRules } from '../logic/thousand';
import { save, type ModeId } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

/** Rules of the classic modes: quick game, blitz, dark night, marriage fever. */
export function presetRules(mode: ModeId): Partial<TRules> {
  switch (mode) {
    case 'blitz':
      return { target: 500 };
    case 'dark':
      return { contractX: 2 };
    case 'fever':
      return { marriageX: 2 };
  }
  return {};
}

export class QuickSetupScene extends BaseScene {
  constructor() {
    super('QuickSetup');
  }

  create(data: { mode?: ModeId }): void {
    const mode = data.mode ?? 'quick';
    menuBackground(this, 1);
    topBar(this, t(mode), () => this.go('Modes', {}, 'setup_back'));
    const W = this.W;
    const q = save.data.settings.quick;
    const port = this.portrait;
    const pw = Math.min(W - 60, 980);
    const py = port ? 230 : 170;
    const rh = port ? 128 : 84;
    const rows = mode === 'quick' ? 7 : 6;
    panel(this, W / 2 - pw / 2, py, pw, rh * rows + (port ? 360 : 260));
    ribbon(this, W / 2, py, Math.min(pw - 160, 560), t(mode), 0x2b3d78);
    let y = py + 100;
    txt(this, W / 2, y, t(`${mode}_d`), 26, '#cfd6e6', { strokeThickness: 0, wordWrap: { width: pw - 80 } });
    y += port ? 90 : 64;
    const x0 = W / 2 - pw / 2 + 50;
    const xr = W / 2 + pw / 2 - 60;
    const row = (label: string) => txt(this, x0, y, label, 34, '#ffffff').setOrigin(0, 0.5);
    const seg = <T extends number>(vals: T[], cur: T, labels: string[], apply: (v: T) => void) => {
      const bw = labels.some((l) => l.length > 3) ? 160 : 110;
      vals.forEach((v, i) => {
        new Button(this, xr - (vals.length - 1 - i) * (bw + 12) - bw / 2, y, { w: bw, h: port ? 88 : 72, color: v === cur ? 'gold' : 'dark', label: labels[i], size: 28 }).onClick(() => {
          apply(v);
          save.save();
          this.scene.restart(data);
        });
      });
    };
    row(t('qs_level')).setY(y - 12);
    seg([1, 2, 3, 4], q.level, ['1', '2', '3', '4'], (v) => (q.level = v));
    txt(this, x0, y + 24, t('lvl' + q.level), 22, UI.gold).setOrigin(0, 0.5);
    y += rh;
    if (mode === 'quick') {
      row(t('qs_target'));
      seg<1000 | 500>([500, 1000], q.target, ['500', '1000'], (v) => (q.target = v));
      y += rh;
    }
    const tog = (label: string, val: boolean, set: (v: boolean) => void) => {
      row(label);
      new Toggle(this, xr - 60, y, val, (v) => {
        set(v);
        save.save();
      });
      y += rh;
    };
    tog(t('qs_barrel'), q.barrel, (v) => (q.barrel = v));
    tog(t('qs_bolts'), q.bolts, (v) => (q.bolts = v));
    tog(t('qs_samosval'), q.samosval, (v) => (q.samosval = v));
    tog(t('qs_rospis'), q.rospis, (v) => (q.rospis = v));
    tog(t('qs_golden'), q.golden, (v) => (q.golden = v));
    const play = new Button(this, W / 2, y + (port ? 90 : 60), { w: 520, h: port ? 150 : 120, color: 'green', label: t('start'), size: 56 }).onClick(() => {
      const rules: TRules = { ...DEFAULT_RULES, target: mode === 'quick' ? q.target : 1000, barrel: q.barrel, bolts: q.bolts, samosval: q.samosval, rospis: q.rospis, golden: q.golden, ...presetRules(mode) };
      const seed = (Math.random() * 1e9) | 0;
      audio.play('whistle');
      this.go('Game', { mode, rules, opponents: randomOpponents(q.level, seed, getLang()), world: seed % WORLDS.length, seed, boosters: [] });
    });
    this.tweens.add({ targets: play, scale: 1.05, duration: 800, yoyo: true, repeat: -1 });
    this.setupScene();
  }
}
