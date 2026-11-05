import { audio } from '../audio/audio';
import { heroPortrait, type Mood } from '../art/heroes';
import { BOOSTER_ICON, icon } from '../art/icons';
import { track } from '../core/analytics';
import { CONFIG } from '../core/config';
import { formatNum, formatTime, getLang, setLang, t, tr } from '../core/i18n';
import { save } from '../core/save';
import { boosterDef, type BoosterId } from '../meta/boosters';
import { adProgress, buyWithCoins, cooldownLeft, countAdView, infiniteLives, nextLifeIn, refillLives, spendCoins, type ChestReward } from '../meta/economy';
import { bumpGoal, claimGoal, dailyGoals, goalProgress } from '../meta/goals';
import { heroById } from '../meta/heroes';
import { shopItem, type ShopItem } from '../meta/shop';
import { ads } from '../platform/AdManager';
import { h, svgEl } from './dom';
import { go } from './router';
import { button, iconEl, modal, toast } from './widgets';

/** Watch one rewarded ad towards a shop item. Returns true if the item was granted. */
export async function watchFor(item: ShopItem, placement: string): Promise<boolean> {
  if (cooldownLeft(item.id) > 0) {
    toast(t('ready', { t: formatTime(cooldownLeft(item.id)) }));
    return false;
  }
  const ok = await ads.rewarded(placement);
  if (!ok) {
    toast(t('adNotReady'), 'bad');
    return false;
  }
  bumpGoal('ads');
  const granted = countAdView(item);
  if (granted) {
    audio.play('buy');
    toast(t('rewardGot'), 'good');
  } else if ('ads' in item.price) {
    toast(t('oneMore', { n: item.price.ads - adProgress(item.id) }));
  }
  return granted;
}

/** Hero portrait with a speech bubble at the bottom of the screen. */
export function heroSays(key: string, mood: Mood = 'happy', ms = 3800): void {
  const hero = heroById(save.data.hero);
  const el = h('div', { class: 'hero-say' }, h('div', { class: 'hero-say-face', html: heroPortrait(hero, mood) }), h('div', { class: 'hero-say-bubble' }, h('b', { text: tr(hero.name) }), h('span', { text: t(key) })));
  document.getElementById('fx')!.append(el);
  el.addEventListener('click', () => el.remove());
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function livesModal(): void {
  const m = modal({ title: t('lives'), cls: 'm-lives' });
  const s = save.data;
  const n = h('div', { class: 'big-heart' }, svgEl(icon('heart')), h('span', { text: infiniteLives() ? '∞' : String(s.lives) }));
  const timer = h('div', { class: 'muted' });
  const tick = () => {
    const ms = nextLifeIn();
    timer.textContent = infiniteLives() ? formatTime(s.infiniteUntil - Date.now()) : ms ? t('nextLife', { t: formatTime(ms) }) : t('full');
    if (!m.el.isConnected) clearInterval(iv);
  };
  const iv = window.setInterval(tick, 1000);
  tick();
  const full = s.lives >= CONFIG.livesMax;
  const adItem = shopItem('lives_ad')!;
  const infItem = shopItem('inf_lives')!;
  m.body.append(
    n,
    timer,
    h('div', { class: 'muted small', text: t('livesInfo') }),
    h(
      'div',
      { class: 'row-btns' },
      button(t('refill'), {
        ad: true,
        variant: 'purple',
        disabled: full,
        onClick: async () => {
          if (await watchFor(adItem, 'lives_refill')) m.close();
        },
      }),
      button(t('refill'), {
        variant: 'gold',
        cost: { kind: 'coin', n: CONFIG.refillLivesPrice },
        disabled: full,
        onClick: () => {
          if (!spendCoins(CONFIG.refillLivesPrice)) return toast(t('notEnoughCoins'), 'bad');
          refillLives();
          audio.play('buy');
          m.close();
        },
      }),
    ),
    h(
      'div',
      { class: 'row-btns' },
      button(`${t('infinite')} 30 ${getLang() === 'ru' ? 'мин' : 'min'} · ${adProgress(infItem.id)}/2`, {
        ad: true,
        variant: 'blue',
        onClick: async () => {
          if (await watchFor(infItem, 'lives_infinite')) m.close();
        },
      }),
    ),
  );
}

export function rulesModal(): void {
  const m = modal({ title: t('rules'), cls: 'm-rules' });
  m.body.append(h('p', { class: 'rules-text', text: t('rulesText') }), h('p', { class: 'muted', text: t('tutWrap') }));
}

export function chestModal(reward?: ChestReward): void {
  const m = modal({ title: reward ? t('chestOpen') : t('chest'), cls: 'm-chest' });
  m.body.append(h('div', { class: 'chest-big' }, svgEl(icon('chest'))));
  if (!reward) {
    m.body.append(h('p', { text: t('chestHint', { a: save.data.chest, b: CONFIG.chestSize }) }));
    return;
  }
  audio.play('chest');
  const list = h('div', { class: 'reward-list' }, rewardChip('coin', `+${reward.coins}`));
  for (const [id, n] of Object.entries(reward.boosters)) list.append(rewardChip(BOOSTER_ICON[id], `+${n}`, tr(boosterDef(id as BoosterId).name)));
  if (reward.infiniteMin) list.append(rewardChip('heart', `∞ ${reward.infiniteMin}′`));
  m.body.append(list, button(t('claim'), { onClick: () => m.close() }));
}

export function rewardChip(ic: Parameters<typeof iconEl>[0], value: string, label = ''): HTMLElement {
  // Booster icons are white glyphs: put them on a purple ball.
  const boost = Object.values(BOOSTER_ICON).includes(ic);
  return h('div', { class: 'reward-chip' }, iconEl(ic, boost ? 'boost' : ''), h('b', { text: value }), label ? h('span', { text: label }) : null);
}

export function goalsModal(): void {
  const m = modal({ title: t('dailyGoals'), cls: 'm-goals' });
  const render = () => {
    m.body.replaceChildren();
    for (const g of dailyGoals()) {
      const p = goalProgress(g);
      const done = p >= g.target;
      const claimed = save.data.daily.claimed.includes(g.id);
      const reward = h('div', { class: 'goal-reward' });
      if (g.reward.coins) reward.append(rewardChip('coin', `+${g.reward.coins}`));
      if (g.reward.booster) reward.append(rewardChip(BOOSTER_ICON[g.reward.booster], '+1'));
      m.body.append(
        h(
          'div',
          { class: `goal-row ${claimed ? 'claimed' : ''}` },
          h('div', { class: 'goal-info' }, h('b', { text: tr(g.text) }), h('div', { class: 'bar' }, h('div', { class: 'bar-fill', style: `width:${(p / g.target) * 100}%` }), h('span', { text: `${p}/${g.target}` }))),
          reward,
          claimed
            ? h('div', { class: 'goal-done' }, iconEl('check'))
            : button(t('claim'), {
                small: true,
                disabled: !done,
                onClick: () => {
                  if (claimGoal(g)) {
                    audio.play('buy');
                    render();
                  }
                },
              }),
        ),
      );
    }
    m.body.append(h('div', { class: 'muted small', text: t('chestHint', { a: save.data.chest, b: CONFIG.chestSize }) }));
  };
  render();
}

export function settingsModal(onChange?: () => void): void {
  const m = modal({ title: t('settings'), cls: 'm-settings', pause: true });
  const s = save.data.settings;
  const slider = (label: string, ic: Parameters<typeof iconEl>[0], value: number, set: (v: number) => void) => {
    const input = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)) }) as HTMLInputElement;
    input.addEventListener('input', () => {
      set(+input.value / 100);
      audio.setVolumes(s.sound, s.music);
      save.commit();
    });
    input.addEventListener('change', () => audio.play('coin'));
    return h('label', { class: 'set-row' }, iconEl(ic), h('span', { text: label }), input);
  };
  const toggle = (label: string, on: boolean, set: (v: boolean) => void) => {
    const b = button(on ? t('on') : t('off'), {
      small: true,
      variant: on ? 'green' : 'cream',
      onClick: () => {
        set(!on);
        save.commit();
        m.close();
        settingsModal(onChange);
        onChange?.();
      },
    });
    return h('div', { class: 'set-row' }, iconEl('info'), h('span', { text: label }), b);
  };
  const langs = h(
    'div',
    { class: 'seg' },
    ...(['ru', 'en'] as const).map((l) =>
      button(l === 'ru' ? 'Русский' : 'English', {
        small: true,
        variant: getLang() === l ? 'green' : 'cream',
        onClick: () => {
          setLang(l);
          save.data.lang = l;
          save.commit();
          location.reload();
        },
      }),
    ),
  );
  m.body.append(
    slider(t('sound'), 'sound', s.sound, (v) => (s.sound = v)),
    slider(t('music'), 'music', s.music, (v) => (s.music = v)),
    h('div', { class: 'set-row' }, iconEl('globe'), h('span', { text: t('language') }), langs),
    toggle(t('hint'), s.hint, (v) => (s.hint = v)),
    h(
      'div',
      { class: 'row-btns' },
      button(t('changeHero'), {
        variant: 'blue',
        icon: 'user',
        onClick: () => {
          m.close();
          void go('heroes', { change: true });
        },
      }),
    ),
  );
}

/** Generic "buy with coins" confirmation used by small shop buttons. */
export function buyCoins(item: ShopItem): boolean {
  if (!buyWithCoins(item)) {
    toast(t('notEnoughCoins'), 'bad');
    audio.play('error');
    return false;
  }
  audio.play('buy');
  track('buy_coins', { id: item.id });
  toast(t('rewardGot'), 'good');
  return true;
}

export const fmt = formatNum;
