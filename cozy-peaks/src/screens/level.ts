import { audio } from '../audio/audio';
import { cardBack, cardFace, wildFace } from '../art/cards';
import { BOOSTER_ICON, icon } from '../art/icons';
import { itemThumb, roomSvg } from '../art/rooms';
import { track } from '../core/analytics';
import { CONFIG } from '../core/config';
import { formatNum, t, tr } from '../core/i18n';
import { save } from '../core/save';
import { cardLabel, fullDeck, isRed, type Card } from '../game/cards';
import { INTRO } from '../game/generator';
import { getLevel, prefetch } from '../game/levels';
import { Game, STREAK_BONUS_AT, type GameEvent, type LevelData } from '../game/model';
import { boosterDef, LEVEL_BOOSTERS, START_BOOSTERS, type BoosterId } from '../meta/boosters';
import { addBooster, addCoins, boosterCount, chestStep, currentRoom, hasLife, loseLife, nextTask, playerLevel, spendCoins, useBooster } from '../meta/economy';
import { bumpGoal } from '../meta/goals';
import { ads } from '../platform/AdManager';
import { h, svgEl, wait } from '../ui/dom';
import { chestModal, goalsModal, heroSays, livesModal, rewardChip, rulesModal, settingsModal } from '../ui/dialogs';
import { hud } from '../ui/hud';
import { go, register, type Screen } from '../ui/router';
import { stage } from '../ui/stage';
import { button, confetti, flyIcons, floatText, iconEl, modal, ribbon, toast } from '../ui/widgets';
import { makeoverPlaque, roomState } from './common';

interface Params {
  n: number;
}

const ROW_STEP = 0.5;
const COL_STEP = 1.06;
const ASPECT = 1.4;

register('level', async (p: Params) => level(p));

async function level({ n }: Params): Promise<Screen> {
  const data: LevelData = await getLevel(n);
  prefetch(n + 1);
  const game = new Game(data);
  const resumed = save.data.current?.n === n;
  if (resumed) game.restore(save.data.current!.state);
  const room = currentRoom();

  /* ---------- DOM ---------- */
  const el = h('div', { class: 'scr-level' });
  const bg = h('div', { class: 'bg-room', html: roomSvg(room.id, roomState(room)) });
  const dim = h('div', { class: 'bg-dim' });
  const cardsLayer = h('div', { class: 'cards-layer' });
  const board = h('div', { class: 'board' });
  const stockSlot = h('div', { class: 'slot stock-slot' });
  const wasteSlot = h('div', { class: 'slot waste-slot' });
  const stockPile = h('div', { class: 'stock-pile', onclick: () => onStock() });
  const stockCount = h('div', { class: 'stock-count' });
  const swap = svgEl(icon('swap'), 'swap-ico');
  const chipCard = h('b');
  const chip = h('div', { class: 'current-chip' }, h('span', { text: t('currentCard') }), chipCard, h('button', { text: '×', onclick: () => ((save.data.settings.hint = false), save.commit(), updateChip()) }));
  const boostersEl = h('div', { class: 'boosters' });
  const goalPanel = h('div', { class: 'panel goal-panel' });
  const strip = h('div', { class: 'panel meta-strip' });
  const bigBtn = h('div', { class: 'big-cta' });

  let paused = false;
  let ended = false;
  let hammerMode = false;
  let plusFiveUsed = 0;
  let plusFiveAdUsed = false;
  let doubleCoins = false;
  let idleTimer = 0;

  const pauseMenu = () => {
    const m = modal({ title: t('pause'), cls: 'm-pause', pause: true });
    paused = true;
    m.closed.then(() => (paused = false));
    m.body.append(
      button(t('continue'), { onClick: () => m.close() }),
      button(t('settings'), { variant: 'blue', icon: 'gear', onClick: () => (m.close(), settingsModal(updateChip)) }),
      button(t('quit'), { variant: 'red', onClick: () => (m.close(), quit()) }),
      game.canUndo || game.remaining < data.tableau.length ? h('div', { class: 'muted small', text: t('quitWarn') }) : '',
    );
  };

  const quit = (to: 'home' | 'rooms' = 'home') => {
    const started = game.remaining < data.tableau.length || game.stockCount < data.stock.length;
    if (started && !ended) {
      loseLife();
      save.data.losses++;
      track('level_fail', { n, reason: 'quit' });
    }
    save.data.current = null;
    save.commit();
    void go(to, {}, 'to_home');
  };

  el.append(
    bg,
    dim,
    hud(
      {
        lives: livesModal,
        coins: () => toast(t('shop')),
        chest: () => chestModal(),
        info: rulesModal,
        settings: pauseMenu,
        goals: goalsModal,
        rooms: pauseMenu,
      },
      { side: true },
    ),
    makeoverPlaque(room),
    board,
    stockSlot,
    wasteSlot,
    swap,
    chip,
    boostersEl,
    goalPanel,
    strip,
    bigBtn,
    cardsLayer,
  );
  cardsLayer.append(stockPile);
  stockPile.append(stockCount);

  /* ---------- side panels ---------- */

  const renderGoal = () => {
    goalPanel.replaceChildren(ribbon(t('levelN', { n })), h('div', { class: 'goal-h', text: t('goal') }));
    const gt = game.goldTotal;
    goalPanel.append(h('div', { class: 'goal-t' }, iconEl(gt ? 'coin' : 'plusCard'), h('span', { text: gt ? `${t('goalClear')} ${t('goalGold', { a: game.goldCollected, b: gt })}` : t('goalClear') })));
    if (data.tier === 'hard' || data.tier === 'superhard') goalPanel.append(h('span', { class: `tier-tag tier-${data.tier}`, text: `${t(data.tier)} · ${t('rewardX2')}` }));
  };

  const renderStrip = () => {
    const task = nextTask(room);
    strip.replaceChildren();
    bigBtn.replaceChildren();
    if (!task) {
      strip.append(h('div', { class: 'ms-text' }, h('b', { text: t('soon') })));
      return;
    }
    const chosen = save.data.rooms[room.id].tasks[task.id] ?? 0;
    const variants = h('div', { class: 'variants' });
    [0, 1, 2].forEach((v) => variants.append(h('div', { class: `variant ${v === chosen ? 'sel' : ''}`, html: itemThumb(room.id, task.id, v) }, v === chosen ? iconEl('check', 'v-check') : null)));
    strip.append(
      h('div', { class: 'ms-ico', html: itemThumb(room.id, task.id, -1) }),
      h('div', { class: 'ms-text' }, h('small', { text: stage.portrait ? t('afterWin') : t('afterLevel') }), h('b', { text: t('chooseNew', { item: tr(task.name) }) })),
      svgEl(icon('arrowR'), 'ms-arrow'),
      variants,
    );
    const cta = button(stage.portrait ? t('winDecorate') : t('decorate'), {
      big: stage.portrait,
      cost: stage.portrait ? undefined : { kind: 'star', n: task.cost },
      icon: stage.portrait ? 'star' : undefined,
      onClick: () => heroSays('needStarsLine', 'think'),
    });
    if (stage.portrait) bigBtn.append(cta);
    else strip.append(cta);
  };

  const renderBoosters = () => {
    boostersEl.replaceChildren();
    for (const b of LEVEL_BOOSTERS) {
      const locked = n < b.unlockAt;
      // Boosters appear once unlocked (fewer buttons for new players).
      if (locked) continue;
      const count = boosterCount(b.id);
      const badge = locked ? h('div', { class: 'booster-n ad' }, svgEl(icon('lock'))) : count > 0 ? h('div', { class: 'booster-n', text: String(count) }) : h('div', { class: 'booster-n ad' }, svgEl(icon('ad')));
      const btn = h(
        'button',
        { class: `booster ${locked ? 'locked' : ''} ${b.id === 'hammer' && hammerMode ? 'active' : ''}`, 'data-b': b.id, onclick: () => onBooster(b.id, locked) },
        h('div', { class: 'booster-ball' }, iconEl(BOOSTER_ICON[b.id])),
        badge,
        h('div', { class: 'booster-label', text: tr(b.name) }),
      );
      boostersEl.append(btn);
    }
  };

  const updateChip = () => {
    const top = game.top;
    chip.style.display = save.data.settings.hint && n <= 30 ? '' : 'none';
    chipCard.textContent = top.wild ? '★' : cardLabel(top);
    chipCard.className = !top.wild && isRed(top.s) ? 'red' : '';
  };

  /* ---------- geometry ---------- */

  let cw = 100;
  let ch = 140;
  const slotPos: { x: number; y: number }[] = [];
  let wastePos = { x: 0, y: 0 };
  let stockPos = { x: 0, y: 0 };

  const layout = () => {
    const W = stage.w;
    const H = stage.h;
    const L = data.layout;
    const P = stage.portrait;
    const set = (e: HTMLElement, css: Record<string, string | number>) => Object.assign(e.style, Object.fromEntries(Object.entries(css).map(([k, v]) => [k, typeof v === 'number' ? `${v}px` : v])));
    // Board area.
    const bx = P ? 20 : W * 0.17;
    const bw = P ? W - 40 : W * 0.66;
    const by = P ? Math.max(330, H * 0.21) : 210;
    // Landscape: extra height (4:3 screens) goes mostly to the board.
    const extraH = P ? 0 : Math.max(0, H - 900);
    const bh = P ? H * 0.33 : 355 + extraH * 0.6;
    cw = Math.min(bw / ((L.cols - 1) * COL_STEP + 1), bh / (ASPECT * (ROW_STEP * (L.rows - 1) + 1)), P ? 120 : 118 + extraH * 0.08);
    ch = cw * ASPECT;
    const totalW = (L.cols - 1) * COL_STEP * cw + cw;
    const totalH = ch * (ROW_STEP * (L.rows - 1) + 1);
    const x0 = bx + (bw - totalW) / 2;
    const y0 = by + (bh - totalH) / 2;
    set(board, { left: bx, top: by, width: bw, height: bh });
    L.slots.forEach((s, i) => (slotPos[i] = { x: x0 + s.x * COL_STEP * cw, y: y0 + s.row * ROW_STEP * ch }));
    // Stock, waste, boosters row.
    const pw = P ? Math.min(118, cw * 1.05) : Math.min(124, Math.max(cw, 104));
    const phh = pw * ASPECT;
    const rowY = P ? by + bh + 70 : 610 + extraH * 0.6;
    if (P) {
      stockPos = { x: 34, y: rowY };
      wastePos = { x: 34 + pw + 52, y: rowY };
      set(boostersEl, { left: wastePos.x + pw + 14, top: rowY + 4, right: 8 });
      set(goalPanel, { left: 24, top: rowY + phh + 44 });
      set(strip, { left: 16, right: 16, top: Math.min(H - 290, rowY + phh + 250), height: 170 });
      set(bigBtn, { left: 0, right: 0, top: H - 118 });
    } else {
      stockPos = { x: W / 2 - 330, y: rowY };
      wastePos = { x: W / 2 - 140, y: rowY };
      set(boostersEl, { left: W / 2 + 20, top: rowY + 8, right: 'auto' });
      set(goalPanel, { left: 24, top: rowY + 8 });
      set(strip, { left: 26, right: 26, top: H - 110, height: 100 });
      set(bigBtn, { display: 'none' });
    }
    set(stockSlot, { left: stockPos.x, top: stockPos.y, width: pw, height: phh });
    set(wasteSlot, { left: wastePos.x, top: wastePos.y, width: pw, height: phh });
    set(swap, { left: (stockPos.x + pw + wastePos.x) / 2 - 37, top: rowY + phh / 2 - 37 });
    set(chip, { left: wastePos.x + pw / 2, top: rowY - 52, transform: 'translateX(-50%)' });
    set(stockPile, { left: 0, top: 0, width: pw, height: phh, transform: `translate(${stockPos.x}px, ${stockPos.y}px)` });
    pileW = pw;
    pileH = phh;
    renderAll();
  };
  let pileW = 110;
  let pileH = 154;

  /* ---------- card elements ---------- */

  const slotEls: (HTMLElement | null)[] = data.tableau.map(() => null);
  let wasteEl: HTMLElement | null = null;
  const back = () => cardBack(save.data.cardBack);

  const makeCard = (c: Card | null, faceUp: boolean): HTMLElement => {
    const e = h('div', { class: `card ${faceUp ? '' : 'down'}` }, h('div', { class: 'ci' }, h('div', { class: 'cf face', html: c ? cardFace(c) : wildFace() }), h('div', { class: 'cf back', html: back() })), h('div', { class: 'ov' }));
    cardsLayer.append(e);
    return e;
  };

  const put = (e: HTMLElement, x: number, y: number, w: number, hh: number, z: number, animate = true) => {
    if (!animate) e.style.transition = 'none';
    e.style.width = `${w}px`;
    e.style.height = `${hh}px`;
    e.style.transform = `translate(${x}px, ${y}px)`;
    e.style.zIndex = String(z);
    if (!animate) {
      void e.offsetWidth;
      e.style.transition = '';
    }
  };

  const overlay = (i: number, e: HTMLElement) => {
    const ov = e.querySelector('.ov') as HTMLElement;
    const sp = data.specials[i];
    ov.replaceChildren();
    if (!sp) return;
    const open = game.isOpen(i);
    if (sp.kind === 'gold') ov.append(h('div', { class: 'gold-ring' }), svgEl(icon('coin'), 'gold-coin'));
    if (sp.kind === 'key' && open) ov.append(svgEl(icon('key'), 'key-badge'));
    if (sp.kind === 'lock' && game.isLocked(i)) ov.append(h('div', { class: 'lock-ov' }, svgEl(icon('lock'))));
    if (sp.kind === 'ice' && game.iceHp(i) > 0)
      ov.append(h('div', { class: `ice-ov hp${game.iceHp(i)}`, html: `<svg viewBox="0 0 100 140"><path d="M20 30 l25 30 l-10 25 l30 30 M45 60 l30 -14" stroke="#fff" stroke-width="3" fill="none"/></svg>` }));
  };

  const placeSlot = (i: number, animate = true) => {
    let e = slotEls[i];
    if (!e) {
      e = makeCard(data.tableau[i], game.isOpen(i));
      e.classList.add('tcard');
      e.addEventListener('click', () => onCard(i));
      slotEls[i] = e;
      put(e, slotPos[i].x, slotPos[i].y, cw, ch, 10 + data.layout.slots[i].row, false);
    }
    put(e, slotPos[i].x, slotPos[i].y, cw, ch, 10 + data.layout.slots[i].row, animate);
    e.classList.toggle('down', !game.isOpen(i));
    overlay(i, e);
  };

  const renderStock = () => {
    const n = game.stockCount;
    stockPile.querySelectorAll('.sp').forEach((s) => s.remove());
    const layers = Math.min(4, n);
    for (let k = 0; k < Math.max(1, layers); k++)
      stockPile.insertBefore(h('div', { class: 'sp', html: back(), style: `transform: translate(${-k * 5}px, ${-k * 3}px)` }), stockCount);
    stockPile.classList.toggle('empty', n === 0);
    stockCount.textContent = String(n);
  };

  const renderWaste = () => {
    if (wasteEl) wasteEl.remove();
    const top = game.top;
    wasteEl = makeCard(top.wild ? null : top, true);
    put(wasteEl, wastePos.x, wastePos.y, pileW, pileH, 60, false);
  };

  function renderAll(): void {
    for (let i = 0; i < data.tableau.length; i++) {
      if (game.isRemoved(i)) {
        slotEls[i]?.remove();
        slotEls[i] = null;
      } else placeSlot(i, false);
    }
    renderWaste();
    renderStock();
    updateChip();
  }

  /** Move an element to the waste pile and make it the new top. */
  const toWaste = (e: HTMLElement) => {
    const old = wasteEl;
    wasteEl = e;
    e.classList.remove('down', 'hint', 'tcard', 'shake');
    e.style.zIndex = '80';
    requestAnimationFrame(() => put(e, wastePos.x, wastePos.y, pileW, pileH, 80));
    setTimeout(() => {
      old?.remove();
      if (wasteEl === e) e.style.zIndex = '60';
    }, 360);
  };

  /* ---------- feedback ---------- */

  const center = (e: HTMLElement) => {
    const r = stage.rect(e);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  };

  const handle = (ev: GameEvent | null) => {
    if (!ev) return;
    resetIdle();
    switch (ev.type) {
      case 'play': {
        const e = slotEls[ev.slot]!;
        slotEls[ev.slot] = null;
        toWaste(e);
        audio.play('card', { rate: 1 + Math.min(ev.combo, 14) * 0.04, throttleMs: 0 });
        for (const r of ev.revealed) {
          placeSlot(r);
          audio.play('flip', { vol: 0.6 });
        }
        for (const k of [...ev.unlocked, ...ev.iceCracked]) placeSlot(k);
        if (ev.unlocked.length) audio.play('unlock');
        if (ev.iceCracked.length) audio.play('ice');
        const at = { x: wastePos.x + pileW / 2, y: wastePos.y - 10 };
        if (ev.combo >= 3) {
          floatText(t('combo', { n: ev.combo }), at.x, at.y - 30);
          if (ev.combo % 3 === 0) audio.play('combo', { rate: 1 + ev.combo * 0.03 });
        }
        if (ev.gold) {
          audio.play('gold');
          flyIcons('coin', at, '#hud-coins', 4);
          renderGoal();
        }
        if (ev.peak) {
          audio.play('peak');
          const p = slotPos[ev.slot];
          const burst = h('div', { class: 'burst', style: `left:${p.x + cw / 2}px;top:${p.y + ch / 2}px` });
          document.getElementById('fx')!.append(burst);
          setTimeout(() => burst.remove(), 800);
          floatText(t('peak'), p.x + cw / 2, p.y, 'gold big');
          save.data.stats.peaks++;
          bumpGoal('peaks');
        }
        if (STREAK_BONUS_AT.includes(ev.combo) && !game.won) {
          // Long streak bonus: a wild card lands on the waste.
          setTimeout(() => {
            floatText(t('bonusCard'), at.x, at.y - 80, 'gold');
            handle(game.wild());
          }, 380);
        }
        break;
      }
      case 'draw': {
        const e = makeCard(ev.card, false);
        put(e, stockPos.x, stockPos.y, pileW, pileH, 85, false);
        toWaste(e);
        renderStock();
        audio.play('draw');
        break;
      }
      case 'wild': {
        const e = makeCard(null, true);
        const b = boostersEl.querySelector('[data-b="wild"]') as HTMLElement | null;
        const from = b ? stage.rect(b) : { x: wastePos.x, y: wastePos.y - 200 };
        put(e, from.x, from.y, pileW, pileH, 85, false);
        toWaste(e);
        audio.play('wild');
        break;
      }
      case 'addCard':
        renderStock();
        audio.play('pop');
        break;
      case 'remove':
        slotEls[ev.slot]?.animate([{ transform: slotEls[ev.slot]!.style.transform + ' scale(1)', opacity: 1 }, { transform: slotEls[ev.slot]!.style.transform + ' scale(.2) rotate(40deg)', opacity: 0 }], { duration: 300, fill: 'forwards' });
        {
          const e = slotEls[ev.slot];
          setTimeout(() => e?.remove(), 320);
        }
        slotEls[ev.slot] = null;
        for (const r of [...ev.revealed, ...ev.unlocked]) placeSlot(r);
        audio.play('hammer');
        break;
      case 'undo':
        renderAll();
        audio.play('undo');
        break;
    }
    updateChip();
    persist();
    checkEnd();
  };

  const persist = () => {
    if (ended) return;
    save.data.current = { n, state: game.serialize(), boosters: [] };
    save.commit();
  };

  /* ---------- input ---------- */

  const onCard = (i: number) => {
    if (paused || ended || ads.isBusy) return;
    if (hammerMode) {
      if (!game.isOpen(i)) return;
      hammerMode = false;
      document.querySelectorAll('.card.pickable').forEach((c) => c.classList.remove('pickable'));
      handle(game.remove(i));
      renderBoosters();
      return;
    }
    if (!game.isOpen(i)) return;
    const ev = game.play(i);
    if (!ev) {
      const e = slotEls[i]!;
      e.classList.remove('shake');
      void e.offsetWidth;
      e.classList.add('shake');
      audio.play('error');
      if (game.isLocked(i)) toast(t('introLock'));
      else if (game.iceHp(i) > 0) toast(t('introIce'));
      return;
    }
    handle(ev);
  };

  const onStock = () => {
    if (paused || ended || ads.isBusy || hammerMode) return;
    if (game.stockCount === 0) {
      audio.play('error');
      return;
    }
    handle(game.draw());
  };

  const applyBooster = (id: BoosterId) => {
    switch (id) {
      case 'undo':
        handle(game.undo());
        break;
      case 'wild':
        handle(game.wild());
        break;
      case 'plusCard':
        handle(game.addCard(game.helpfulCard(Math.random)));
        break;
      case 'hammer':
        hammerMode = true;
        toast(t('hammerPick'));
        for (let i = 0; i < data.tableau.length; i++) if (game.isOpen(i)) slotEls[i]?.classList.add('pickable');
        break;
      case 'peek':
        showPeek();
        break;
      default:
        break;
    }
    bumpGoal('booster');
  };

  const onBooster = async (id: BoosterId, locked: boolean) => {
    if (paused || ended || ads.isBusy) return;
    audio.play('click');
    if (locked) {
      toast(`${tr(boosterDef(id).name)}: ${t('levelN', { n: boosterDef(id).unlockAt })}`);
      return;
    }
    if (id === 'undo' && !game.canUndo) {
      audio.play('error');
      return;
    }
    if (id === 'hammer' && hammerMode) {
      hammerMode = false;
      document.querySelectorAll('.card.pickable').forEach((c) => c.classList.remove('pickable'));
      renderBoosters();
      return;
    }
    if (boosterCount(id) <= 0) {
      // Out of this booster: one more for a rewarded ad, used right away.
      const ok = await ads.rewarded(`booster_${id}`);
      if (!ok) return toast(t('adNotReady'), 'bad');
      bumpGoal('ads');
      addBooster(id, 1);
    }
    if (!useBooster(id)) return;
    applyBooster(id);
    renderBoosters();
  };

  const showPeek = () => {
    const next = game.peekStock(3);
    const box = h('div', { class: 'peek-box panel' }, h('b', { text: t('peekShow') }), h('div', { class: 'peek-row' }, ...next.map((c) => h('div', { class: 'peek-card', html: cardFace(c) }))));
    box.style.left = `${stockPos.x}px`;
    box.style.top = `${stockPos.y - pileH - 60}px`;
    el.append(box);
    audio.play('peek');
    setTimeout(() => box.classList.add('out'), 3500);
    setTimeout(() => box.remove(), 3900);
  };

  /* ---------- hints ---------- */

  // Tutorial hand that taps the suggested card (first levels only).
  const hand = svgEl(icon('hand'), 'tut-hand');
  hand.style.display = 'none';
  cardsLayer.append(hand);
  const showHand = (x: number, y: number) => {
    hand.style.display = '';
    hand.style.transform = `translate(${x}px, ${y}px)`;
  };

  const resetIdle = () => {
    clearTimeout(idleTimer);
    document.querySelectorAll('.card.hint').forEach((c) => c.classList.remove('hint'));
    stockPile.classList.remove('hint');
    hand.style.display = 'none';
    if (ended || !save.data.settings.hint) return;
    idleTimer = window.setTimeout(showHint, n <= 3 ? 2500 : 8000);
  };

  const showHint = () => {
    if (ended || paused) return;
    const moves = game.playable();
    if (moves.length) {
      moves.slice(0, 2).forEach((i) => slotEls[i]?.classList.add('hint'));
      if (n <= 3) showHand(slotPos[moves[0]].x + cw * 0.45, slotPos[moves[0]].y + ch * 0.55);
    } else if (game.stockCount > 0) {
      stockPile.classList.add('hint');
      if (n <= 3) {
        toast(t('tapStock'));
        showHand(stockPos.x + pileW * 0.45, stockPos.y + pileH * 0.55);
      }
    }
  };

  // Keyboard: Space/Enter/↓ draw, Z/Backspace undo, 1–5 boosters, Esc/P pause.
  const onKey = (e: KeyboardEvent) => {
    if (ended || document.querySelector('.modal-back')) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'enter' || k === 'arrowdown') onStock();
    else if (k === 'z' || k === 'backspace' || k === 'я') void onBooster('undo', false);
    else if (k === 'escape' || k === 'p' || k === 'з') pauseMenu();
    else if (/^[1-5]$/.test(k)) {
      const b = LEVEL_BOOSTERS.filter((x) => n >= x.unlockAt)[+k - 1];
      if (b) void onBooster(b.id, false);
    } else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);

  /* ---------- start ---------- */

  const begin = (chosen: BoosterId[]) => {
    ads.setGameplay(true);
    track('level_start', { n, tier: data.tier, layout: data.layoutId, boosters: chosen.join(',') });
    save.data.stats.played++;
    for (const b of chosen) {
      if (!useBooster(b)) continue;
      if (b === 'lucky') {
        game.clearRandomFree(3, Math.random);
        audio.play('wild');
      }
      if (b === 'startWild') game.wild();
      if (b === 'plus3') {
        const used = new Set([...data.tableau, ...data.stock, data.start].map((c) => `${c.r}_${c.s}`));
        game.addStock(fullDeck().filter((c) => !used.has(`${c.r}_${c.s}`)).slice(0, 3));
      }
      if (b === 'doubleCoins') doubleCoins = true;
    }
    renderAll();
    persist();
    resetIdle();
    for (const b of LEVEL_BOOSTERS) if (n === b.unlockAt && n > 1) setTimeout(() => toast(t('unlockedBooster', { b: tr(b.name) }), 'good'), 900);
    if (n === 1) setTimeout(() => toast(t('tutPlay')), 400);
    if (n === 2) setTimeout(() => toast(t('tutWrap')), 400);
    if (n === INTRO.gold) setTimeout(() => toast(t('introGold')), 400);
    if (n === INTRO.lock) setTimeout(() => toast(t('introLock')), 400);
    if (n === INTRO.ice) setTimeout(() => toast(t('introIce')), 400);
  };

  const preLevel = () => {
    const m = modal({ title: t('levelN', { n }), cls: 'm-pre', closable: true, onClose: () => !started && void go('home', {}, 'to_home') });
    let started = false;
    const chosen = new Set<BoosterId>();
    const list = h('div', { class: 'pre-boosters' });
    const render = () => {
      list.replaceChildren();
      for (const b of START_BOOSTERS) {
        const locked = n < b.unlockAt;
        const count = boosterCount(b.id);
        const on = chosen.has(b.id);
        list.append(
          h(
            'button',
            {
              class: `pre-b ${on ? 'on' : ''} ${locked ? 'locked' : ''}`,
              onclick: async () => {
                if (locked) return toast(t('levelN', { n: b.unlockAt }));
                audio.play('click');
                if (on) chosen.delete(b.id);
                else if (count > 0) chosen.add(b.id);
                else {
                  const ok = await ads.rewarded(`start_${b.id}`);
                  if (!ok) return toast(t('adNotReady'), 'bad');
                  bumpGoal('ads');
                  addBooster(b.id, 1);
                  chosen.add(b.id);
                }
                render();
              },
            },
            h('div', { class: 'booster-ball' }, iconEl(BOOSTER_ICON[b.id])),
            locked ? h('div', { class: 'booster-n ad' }, svgEl(icon('lock'))) : count > 0 ? h('div', { class: 'booster-n', text: String(count) }) : h('div', { class: 'booster-n ad' }, svgEl(icon('ad'))),
            on ? iconEl('check', 'pre-check') : null,
            h('div', { class: 'booster-label', text: tr(b.name) }),
          ),
        );
      }
    };
    render();
    const tag = data.tier === 'hard' || data.tier === 'superhard' ? h('span', { class: `tier-tag tier-${data.tier}`, text: `${t(data.tier)} · ${t('rewardX2')}` }) : null;
    m.body.append(
      h('div', { class: 'pre-goal' }, iconEl('plusCard'), h('span', { text: t('goalClear') })),
      tag ?? '',
      h('div', { class: 'muted', text: t('startBoosters') }),
      list,
      button(t('play'), {
        big: true,
        onClick: () => {
          if (!hasLife()) return livesModal();
          started = true;
          m.close();
          begin([...chosen]);
        },
      }),
    );
  };

  /* ---------- end of level ---------- */

  function checkEnd(): void {
    if (ended) return;
    if (game.won) {
      ended = true;
      setTimeout(win, 450);
    } else if (game.stuck) {
      setTimeout(() => !ended && game.stuck && outOfCards(), 500);
    }
  }

  const outOfCards = () => {
    ads.setGameplay(false);
    const price = CONFIG.plusFivePrices[Math.min(plusFiveUsed, CONFIG.plusFivePrices.length - 1)];
    const m = modal({ title: t('outOfCards'), cls: 'm-fail', closable: false });
    const rescue = () => {
      m.close();
      const used = new Set<string>();
      const cards: Card[] = [];
      const deck = fullDeck().sort(() => Math.random() - 0.5);
      cards.push(game.helpfulCard(Math.random));
      for (const c of deck) {
        if (cards.length >= 5) break;
        if (used.has(`${c.r}_${c.s}`)) continue;
        used.add(`${c.r}_${c.s}`);
        cards.push(c);
      }
      game.addStock(cards.reverse());
      renderStock();
      audio.play('buy');
      ads.setGameplay(true);
      persist();
    };
    m.body.append(
      h('div', { class: 'fail-cards' }, h('div', { class: 'fail-plus', text: '+5' }), h('div', { class: 'fail-deck', html: back() })),
      h('p', { text: t('outOfCardsSub', { n: game.remaining }) }),
      h(
        'div',
        { class: 'row-btns' },
        button(t('plusFive'), {
          variant: 'gold',
          cost: { kind: 'coin', n: price },
          onClick: () => {
            if (!spendCoins(price)) return toast(t('notEnoughCoins'), 'bad');
            plusFiveUsed++;
            track('plus_five', { n, by: 'coins', price });
            rescue();
          },
        }),
        plusFiveAdUsed
          ? null
          : button(t('plusFive'), {
              ad: true,
              variant: 'purple',
              onClick: async () => {
                const ok = await ads.rewarded('plus_five');
                if (!ok) return toast(t('adNotReady'), 'bad');
                plusFiveAdUsed = true;
                bumpGoal('ads');
                track('plus_five', { n, by: 'ad' });
                rescue();
              },
            }),
      ),
      button(t('giveUp'), { variant: 'red', small: true, onClick: () => (m.close(), fail()) }),
      h('div', { class: 'muted small', text: t('lostLife') }),
    );
  };

  const fail = () => {
    ended = true;
    clearTimeout(idleTimer);
    loseLife();
    save.data.losses++;
    save.data.current = null;
    save.commit();
    audio.play('lose');
    track('level_fail', { n, remaining: game.remaining });
    const m = modal({ title: t('failed'), cls: 'm-failed', closable: false });
    m.body.append(
      h('div', { class: 'big-heart broken' }, svgEl(icon('heart')), h('span', { text: '−1' })),
      h(
        'div',
        { class: 'row-btns' },
        button(t('home'), { variant: 'cream', icon: 'house', onClick: () => (m.close(), void go('home', {}, 'to_home')) }),
        button(t('retry'), {
          onClick: () => {
            if (!hasLife()) return livesModal();
            m.close();
            void go('level', { n }, 'level_retry');
          },
        }),
      ),
    );
  };

  const win = async () => {
    clearTimeout(idleTimer);
    ads.setGameplay(false);
    save.data.current = null;
    audio.play('win');
    confetti(70);
    // Leftover stock turns into coins.
    const left = game.stockCount;
    for (let k = 0; k < Math.min(left, 12); k++) {
      floatText(`+${CONFIG.coinsPerStockCard}`, stockPos.x + pileW / 2, stockPos.y + 20, 'gold');
      audio.play('coin', { throttleMs: 0, rate: 1 + k * 0.05 });
      await wait(70);
    }
    const tierMul = data.tier === 'hard' || data.tier === 'superhard' ? 2 : 1;
    // Onboarding levels give at least 2 stars so the first decor task is affordable right away.
    const stars = Math.max(n <= 10 ? 2 : 1, 1 + (game.maxCombo >= 7 ? 1 : 0) + (left >= 5 ? 1 : 0)) * tierMul;
    let coins = CONFIG.winCoinsBase + game.coinsEarned + left * CONFIG.coinsPerStockCard;
    if (doubleCoins) coins *= 2;
    const s = save.data;
    const before = playerLevel().level;
    s.stars += stars;
    s.xp += 50 + stars * 10;
    s.wins++;
    s.level = Math.max(s.level, n + 1);
    s.stats.bestCombo = Math.max(s.stats.bestCombo, game.maxCombo);
    addCoins(coins);
    bumpGoal('win');
    bumpGoal('combo', game.maxCombo);
    bumpGoal('gold', game.goldCollected);
    const chest = chestStep();
    save.commit();
    track('level_win', { n, stars, coins, combo: game.maxCombo, stockLeft: left });
    const levelUp = playerLevel().level > before;
    showResult(stars, coins, levelUp);
    if (chest) setTimeout(() => chestModal(chest), 900);
  };

  const showResult = (stars: number, coins: number, levelUp: boolean) => {
    const m = modal({ title: t('victory'), cls: 'm-win', closable: false });
    const starsRow = h('div', { class: 'win-stars' });
    for (let k = 0; k < 3; k++) {
      const st = svgEl(icon('star'), `win-star ${k < Math.min(3, stars) ? 'on' : ''}`);
      st.style.animationDelay = `${0.2 + k * 0.25}s`;
      starsRow.append(st);
      if (k < stars) setTimeout(() => audio.play('star', { rate: 1 + k * 0.12 }), 250 + k * 250);
    }
    const coinsChip = rewardChip('coin', `+${formatNum(coins)}`, t('coins'));
    let doubled = false;
    const x2 = button(t('x2coins'), {
      ad: true,
      variant: 'purple',
      onClick: async () => {
        if (doubled) return;
        const ok = await ads.rewarded('win_x2');
        if (!ok) return toast(t('adNotReady'), 'bad');
        doubled = true;
        bumpGoal('ads');
        addCoins(coins);
        (coinsChip.querySelector('b') as HTMLElement).textContent = `+${formatNum(coins * 2)}`;
        x2.disabled = true;
        flyIcons('coin', center(coinsChip), '#hud-coins', 8);
        audio.play('buy');
      },
    });
    const task = nextTask(room);
    const canDecorate = task && save.data.stars >= task.cost;
    m.body.append(
      h('div', { class: 'win-title', text: t('levelComplete', { n }) }),
      starsRow,
      h('div', { class: 'reward-list' }, coinsChip, rewardChip('star', `+${stars}`, t('stars'))),
      levelUp ? h('div', { class: 'tier-tag tier-superhard', text: t('levelUp') }) : '',
      x2,
      h(
        'div',
        { class: 'row-btns' },
        button(t('home'), { variant: 'cream', icon: 'house', onClick: () => (m.close(), void go('home', {}, 'to_home')) }),
        canDecorate
          ? button(t('decorate'), { cost: { kind: 'star', n: task!.cost }, onClick: () => (m.close(), void go('room', { room: room.id, task: task!.id }, 'to_room')) })
          : null,
        button(t('next'), { variant: canDecorate ? 'blue' : 'green', onClick: () => (m.close(), void go('level', { n: n + 1 }, 'level_next')) }),
      ),
    );
    setTimeout(() => flyIcons('star', center(starsRow), '#hud-stars', Math.min(6, stars * 2)), 900);
  };

  /* ---------- mount ---------- */

  renderGoal();
  renderStrip();
  renderBoosters();
  requestAnimationFrame(() => {
    layout();
    if (resumed) {
      ads.setGameplay(true);
      resetIdle();
    } else preLevel();
  });

  return {
    el,
    music: 'level',
    resize: () => {
      layout();
      renderStrip();
    },
    destroy: () => {
      clearTimeout(idleTimer);
      window.removeEventListener('keydown', onKey);
      ended = true;
    },
  };
}
