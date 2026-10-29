import { audio } from '@shared/audio/audio';
import { getLang, t } from '@shared/core/i18n';
import { Rng } from '@shared/core/rng';
import { BaseScene } from '@shared/ui/base';
import { Button, panel, ribbon, toast, txt, UI } from '@shared/ui/widgets';
import { faceTex } from '../art/avatars';
import { randomOpponents } from '../data/quick';
import { DEFAULT_RULES } from '../logic/thousand';
import { grant, spendCoins, track } from '../progress';
import { save } from '../save';
import { menuBackground } from '../ui/bg';
import { rewardPopup, topBar, watchAd } from '../ui/common';

const ENTRY = 150;
/** Four stages: target points and bot levels. */
export const CUP_STAGES = [
  { target: 300, levels: [2, 2] },
  { target: 300, levels: [2, 3] },
  { target: 400, levels: [3, 3] },
  { target: 500, levels: [3, 4] },
];
const PRIZES = [80, 200, 400, 1000];

/** The Express Cup: four matches in a row, finish first in each to go on. */
export class CupScene extends BaseScene {
  constructor() {
    super('Cup');
  }

  create(data: { result?: { won: boolean } }): void {
    menuBackground(this, 6);
    topBar(this, t('cup'), () => this.go('Modes', {}, 'cup_back'));
    let st = save.data.cupState;
    if (data.result && st && !st.done) {
      const won = data.result.won;
      data.result = undefined;
      if (won) {
        st.stage++;
        if (st.stage >= CUP_STAGES.length) {
          st.done = true;
          save.data.cup.wins++;
          track('cup', 1);
          this.time.delayedCall(300, () => rewardPopup(this, t('cupWin'), { coins: PRIZES[3], boosters: { lucky: 1, xray: 1 } }, () => this.scene.restart({}), { x2: 'cup_x2' }));
        }
      } else {
        st.out = true;
        st.done = true;
        if (st.stage > 0) grant({ coins: PRIZES[st.stage - 1] });
      }
      save.save();
    }
    st = save.data.cupState;
    if (!st || st.done) this.entry(st?.done ? st : null);
    else this.ladder();
    this.setupScene();
  }

  private entry(last: { out: boolean; stage: number } | null): void {
    const W = this.W;
    const port = this.portrait;
    const pw = Math.min(W - 60, 920);
    const py = port ? 300 : 190;
    panel(this, W / 2 - pw / 2, py, pw, 860);
    ribbon(this, W / 2, py, 560, t('cup'), 0x6a5a8c);
    this.add.image(W / 2, py + 220, 'i_trophy').setDisplaySize(220, 220);
    txt(this, W / 2, py + 380, t('cup_d'), 32, '#ffffff', { wordWrap: { width: pw - 80 } });
    CUP_STAGES.forEach((s, i) => txt(this, W / 2, py + 450 + i * 44, `${t('stageN', { n: i + 1 })}: ${t('target', { n: s.target })} · +${PRIZES[i]}`, 26, UI.gold));
    if (last) txt(this, W / 2, py + 640, last.out ? t('cupOut', { n: last.stage + 1 }) : t('cupWin'), 30, last.out ? '#ff9a9a' : '#9ff0c8');
    const start = () => {
      const rng = new Rng(Date.now());
      save.data.cupState = { stage: 0, seeds: CUP_STAGES.map(() => rng.int(1, 1e9)), out: false, done: false };
      save.data.cup.played++;
      save.save();
      audio.play('whistle');
      this.scene.restart({});
    };
    new Button(this, W / 2 - 200, py + 760, { w: 360, h: 130, color: 'gold', label: String(ENTRY), icon: 'i_coin', sub: t('entry'), size: 40 }).onClick(() => {
      if (!spendCoins(ENTRY)) return toast(this, t('notEnough'), '#ff8a8a');
      start();
    });
    new Button(this, W / 2 + 200, py + 760, { w: 360, h: 130, color: 'green', label: t('free'), sub: t('entry'), size: 40, ad: true }).onClick(() => watchAd(this, 'cup_entry', start));
  }

  private ladder(): void {
    const st = save.data.cupState!;
    const W = this.W;
    const H = this.H;
    const port = this.portrait;
    const top = port ? 260 : 190;
    const rowH = port ? 260 : 170;
    CUP_STAGES.forEach((s, i) => {
      const y = top + i * rowH + rowH / 2;
      const done = i < st.stage;
      const cur = i === st.stage;
      const g = this.add.graphics();
      const w = Math.min(W - 60, 1100);
      g.fillStyle(cur ? 0x1f6b45 : done ? 0x5a4a1c : UI.inkN, 0.88).fillRoundedRect(W / 2 - w / 2, y - rowH / 2 + 10, w, rowH - 20, 24);
      txt(this, W / 2 - w / 2 + 40, y - 20, t('stageN', { n: i + 1 }), 34, cur ? UI.gold : '#ffffff').setOrigin(0, 0.5);
      txt(this, W / 2 - w / 2 + 40, y + 24, `${t('target', { n: s.target })} · +${PRIZES[i]}`, 24, '#cfd6e6', { strokeThickness: 0 }).setOrigin(0, 0.5);
      const opps = randomOpponents(2, st.seeds[i], getLang(), s.levels);
      opps.forEach((o, k) => {
        const x = W / 2 + w / 2 - 260 + k * 150;
        this.add.image(x, y - 10, faceTex(this.textures, `cup_${i}_${k}_${o.name}`, o.face, done ? 'sad' : 'neutral')).setDisplaySize(port ? 120 : 100, port ? 120 : 100).setAlpha(i > st.stage ? 0.5 : 1);
        const nm = txt(this, x, y + (port ? 70 : 58), o.name, 22, '#ffffff');
        if (nm.width > 140) nm.setScale(140 / nm.width);
      });
      if (done) this.add.image(W / 2 - 40, y, 'i_check').setDisplaySize(80, 80);
    });
    const s = CUP_STAGES[st.stage];
    new Button(this, W / 2, H - (port ? 180 : 100), { w: 560, h: 140, color: 'green', label: t('stageN', { n: st.stage + 1 }), sub: t('target', { n: s.target }), size: 48 }).onClick(() => {
      audio.play('whistle');
      this.go('Game', {
        mode: 'cup',
        rules: { ...DEFAULT_RULES, target: s.target },
        opponents: randomOpponents(2, st.seeds[st.stage], getLang(), s.levels),
        world: 6,
        seed: st.seeds[st.stage],
        ctx: { stage: st.stage },
      });
    });
  }
}
