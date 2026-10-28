import { audio } from '@shared/audio/audio';
import { t } from '@shared/core/i18n';
import { BaseScene } from '@shared/ui/base';
import { Button, ribbon, txt, UI } from '@shared/ui/widgets';
import type { Reward } from '../data/meta';
import { grant, levelUpReward } from '../progress';
import { save } from '../save';
import { faceTex, PLAYER_FACES } from '../art/avatars';
import { LEAGUES, leagueOf } from '../data/meta';
import { menuBackground } from '../ui/bg';
import { rewardRow, watchAd } from '../ui/common';

interface Next {
  key: string;
  data: any;
  ad?: string;
}

/**
 * Shared layout: big title, art, reward row, ×2 / claim buttons, then `next`.
 * Portrait stacks art over the reward; landscape puts them side by side. `art` gets its centre and max width.
 */
function rewardScreen(scene: BaseScene, title: string, art: (x: number, cy: number, maxW: number) => void, reward: Reward, next: Next, x2: string): void {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const port = scene.portrait;
  ribbon(scene, W / 2, port ? H * 0.16 : 120, Math.min(W - 200, 700), title, 0x8e2de2, 56);
  const col = Math.min(W / 2, 760);
  art(port ? W / 2 : W / 2 - col / 2, port ? H * 0.38 : H * 0.47, port ? W - 80 : col - 40);
  const rx = port ? W / 2 : W / 2 + col / 2;
  txt(scene, rx, port ? H * 0.62 : H * 0.38, t('reward'), 40, UI.gold);
  scene.add.existing(rewardRow(scene, rx, port ? H * 0.69 : H * 0.52, reward, 120));
  let done = false;
  const finish = (mult: number) => {
    if (done) return;
    done = true;
    grant(reward);
    if (mult > 1) grant(reward);
    audio.play('coins');
    scene.go(next.key, next.data, next.ad);
  };
  const by = scene.portrait ? H * 0.84 : H - 110;
  new Button(scene, W / 2 - 220, by, { w: 380, h: 140, color: 'green', label: t('x2'), size: 40, ad: true }).onClick(() => watchAd(scene, x2, () => finish(2)));
  new Button(scene, W / 2 + 220, by, { w: 380, h: 140, color: 'gold', label: t('claim'), size: 44 }).onClick(() => finish(1));
}

export class LevelUpScene extends BaseScene {
  constructor() {
    super('LevelUp');
  }

  create(data: { next: Next }): void {
    menuBackground(this);
    audio.play('levelup');
    const lv = save.data.plevel;
    rewardScreen(this, t('levelUp'), (ax, cy, maxW) => {
      const rays = this.add.image(ax, cy, 'i_sparkle').setDisplaySize(620, 620).setAlpha(0.3);
      this.tweens.add({ targets: rays, angle: 360, duration: 10000, repeat: -1 });
      this.add.image(ax, cy, faceTex(this.textures, `me${save.data.avatar}`, PLAYER_FACES[save.data.avatar % PLAYER_FACES.length], 'happy')).setDisplaySize(300, 300);
      const lt = txt(this, ax, cy + 190, `${t('playerLevel')} ${lv}`, 60, '#ffffff');
      const k = Math.min(1, maxW / lt.width);
      lt.setScale(k);
      this.tweens.add({ targets: lt, scale: k * 1.1, duration: 500, yoyo: true, repeat: -1 });
    }, levelUpReward(lv), data.next, 'levelup_x2');
    this.setupScene();
  }
}

export class LeagueUpScene extends BaseScene {
  constructor() {
    super('LeagueUp');
  }

  create(data: { next: Next }): void {
    menuBackground(this, 7);
    audio.play('levelup');
    const lg = leagueOf(save.data.rating);
    rewardScreen(this, t('leagueUp'), (ax, cy, maxW) => {
      const rays = this.add.image(ax, cy, 'i_sparkle').setDisplaySize(620, 620).setAlpha(0.3);
      this.tweens.add({ targets: rays, angle: 360, duration: 10000, repeat: -1 });
      this.add.image(ax, cy, 'i_medal').setDisplaySize(280, 280);
      const lt = txt(this, ax, cy + 190, `${t('league')}: ${t('lg_' + LEAGUES[lg].id)}`, 56, '#ffd166');
      const k = Math.min(1, maxW / lt.width);
      lt.setScale(k);
      this.tweens.add({ targets: lt, scale: k * 1.1, duration: 500, yoyo: true, repeat: -1 });
    }, { coins: 200 + lg * 150, boosters: { shield: 1 } }, data.next, 'league_x2');
    this.setupScene();
  }
}
