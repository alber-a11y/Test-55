import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { Rng } from '@shared/core/rng';
import { dayKey, hashStr } from '@shared/core/time';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { randomOpponents } from '../data/quick';
import { DEFAULT_RULES, type DRules } from '../logic/durak';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { topBar } from '../ui/common';

const MODS: { keys: [string, number?][]; rules: Partial<DRules> }[] = [
  { keys: [['r_transfer']], rules: { transfer: true } },
  { keys: [['r_cheat']], rules: { cheat: true } },
  { keys: [['r_teams']], rules: { players: 4, teams: true } },
  { keys: [['r_deck', 24]], rules: { deck: 24 } },
  { keys: [['r_players', 3], ['r_transfer']], rules: { players: 3, transfer: true } },
  { keys: [['r_deck', 52], ['r_players', 3]], rules: { deck: 52, players: 3 } },
];

/** One special table per day: a fixed opponent and a rule twist; the first game pays ×3. */
export class DailyTableScene extends BaseScene {
  constructor() {
    super('DailyTable');
  }

  create(): void {
    const day = dayKey();
    const seed = hashStr('table:' + day);
    const rng = new Rng(seed);
    const mod = MODS[seed % MODS.length];
    const rules: DRules = { ...DEFAULT_RULES, ...mod.rules };
    const opps = randomOpponents(rules.players - 1, 3, seed, getLang());
    const loc = seed % 8;
    menuBackground(this, loc);
    topBar(this, t('dailyTable'), () => this.go('Menu', {}, 'daily_back'));
    const W = this.W;
    const pw = Math.min(W - 60, 900);
    const py = this.portrait ? 300 : 190;
    panel(this, W / 2 - pw / 2, py, pw, 900);
    ribbon(this, W / 2, py, 560, day, 0xc8323c);
    const modName = mod.keys.map(([k, n]) => t(k, { n: n ?? '' })).join(', ');
    txt(this, W / 2, py + 120, t('daily_mod', { m: modName }), 40, UI.gold);
    opps.forEach((o, i) => {
      const x = W / 2 + (i - (opps.length - 1) / 2) * 240;
      this.add.image(x, py + 300, faceTex(this.textures, `daily_${i}_${o.name}`, o.face, 'smug')).setDisplaySize(200, 200);
      txt(this, x, py + 430, o.name, 32, '#ffffff');
    });
    txt(this, W / 2, py + 530, t('dailyTable_d'), 32, '#ffffff', { wordWrap: { width: pw - 80 } });
    const done = save.data.dailyTable.includes(day);
    if (done) txt(this, W / 2, py + 620, t('daily_done'), 32, '#9ff0c8');
    new Button(this, W / 2, py + 760, { w: 520, h: 140, color: 'green', label: t('play'), sub: done ? '' : '×3', size: 56 }).onClick(() => {
      audio.play('shuffle');
      this.go('Game', { mode: 'daily', rules, opponents: opps, loc, seed: rng.int(1, 1e9), ctx: { day } });
    });
    this.setupScene();
  }
}
