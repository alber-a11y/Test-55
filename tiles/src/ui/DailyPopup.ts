import type Phaser from 'phaser';
import { music } from '../audio/music';
import { econ } from '../core/economy';
import { t } from '../core/i18n';
import { BOOSTER_ICON, DAILY } from '../data/catalog';
import { BTN, THEMES } from '../data/themes';
import { store } from '../core/save';
import { ads } from '../platform/ads';
import { panelTexture } from '../art/textures';
import { Button } from './Button';
import { Popup } from './Popup';
import { label, plain } from './text';
import { flyCoins, toast, type CoinCounter } from './widgets';

/** 7-day login gift ladder; the reward can be doubled with a rewarded ad. */
export function openDaily(scene: Phaser.Scene, coins: CoinCounter): void {
  const th = THEMES[store.data.equipped.theme] ?? THEMES.theme_sky;
  const available = econ.dailyAvailable();
  const idx = econ.dailyIndex();
  const p = new Popup(scene, { w: 960, h: 880, title: t('daily'), theme: th, closable: true, backdropCloses: true });
  const cellW = 210;
  const cellH = 250;
  DAILY.forEach((d, i) => {
    const row = i < 4 ? 0 : 1;
    const col = row === 0 ? i : i - 4;
    const n = row === 0 ? 4 : 3;
    const x = (col - (n - 1) / 2) * (cellW + 16);
    const y = -230 + row * (cellH + 30);
    const done = i < idx || (!available && i === idx);
    const cur = i === idx && available;
    const big = i === 6;
    const c = scene.add.container(x, y);
    const colors = cur ? BTN.gold : done ? BTN.green : (['#ffffff', '#e8eef6', '#b8c4d4'] as [string, string, string]);
    c.add(scene.add.image(0, 0, panelTexture(scene.textures, big ? cellW + 40 : cellW, cellH, colors[0], colors[1], colors[2], 30, 6)));
    c.add(plain(scene, 0, -cellH / 2 + 36, t('dailyDay', { n: i + 1 }), 34, cur || done ? '#ffffff' : th.panel.text, { weight: '900' }));
    c.add(scene.add.image(d.booster ? -34 : 0, 6, 'ui_coin').setDisplaySize(84, 84));
    if (d.booster) c.add(scene.add.image(44, 6, BOOSTER_ICON[d.booster]).setDisplaySize(76, 76));
    c.add(label(scene, 0, 82, `${d.coins}`, 44, { stroke: '#7a4a08' }));
    if (done) c.add(scene.add.image(cellW / 2 - 30, -cellH / 2 + 30, 'ui_check').setDisplaySize(60, 60));
    if (cur) scene.tweens.add({ targets: c, scale: 1.06, yoyo: true, repeat: -1, duration: 600 });
    p.content.add(c);
  });

  const claim = (mult: number) => {
    const i = econ.claimDaily();
    const d = DAILY[i];
    if (d.booster) econ.addBooster(d.booster, mult);
    music.jingle('chest');
    p.close(() => flyCoins(scene, { x: scene.scale.width / 2, y: scene.scale.height / 2 }, coins.iconPos(), d.coins * mult));
  };
  if (available) {
    p.content.add(new Button(scene, -220, 300, { w: 380, h: 140, colors: BTN.green, text: t('claim'), fontSize: 56, onClick: () => claim(1) }));
    const adB = new Button(scene, 220, 300, { w: 380, h: 140, colors: BTN.gold, text: t('dailyX2'), icon: 'ui_ad', fontSize: 60, onClick: async () => {
      if (await ads.rewarded('daily_x2')) claim(2);
      else toast(scene, t('adFailed'));
    } });
    adB.pulse();
    p.content.add(adB);
  } else {
    p.content.add(plain(scene, 0, 300, t('dailyClaimed'), 40, th.panel.text, { wrap: 820 }));
  }
}
