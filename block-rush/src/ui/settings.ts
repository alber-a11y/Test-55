import { audio } from '../audio/audio';
import { getLang, setLang, t } from '../core/i18n';
import { persist, resetSave, save } from '../core/save';
import { btn, h, openModal } from './dom';
import { ICONS } from './icons';

function toggle(on: boolean, change: (v: boolean) => void): HTMLElement {
  const el = h('button', { class: `toggle ${on ? 'on' : ''}` }, [h('i')]);
  el.addEventListener('click', () => {
    on = !on;
    el.classList.toggle('on', on);
    audio.play('click');
    change(on);
  });
  return el;
}

function slider(value: number, change: (v: number) => void): HTMLElement {
  const el = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(value * 100)), class: 'slider' }) as HTMLInputElement;
  el.addEventListener('input', () => change(Number(el.value) / 100));
  el.addEventListener('change', () => audio.play('click'));
  return el;
}

export function applyAudioSettings(): void {
  const st = save.settings;
  audio.musicOn = st.music;
  audio.sfxOn = st.sfx;
  audio.musicVol = st.musicVol;
  audio.sfxVol = st.sfxVol;
  audio.vibroOn = st.vibro;
  audio.applyVolumes();
}

/** Sound rows shared by the settings window and the pause menu. */
export function settingsRows(withLang: boolean): HTMLElement[] {
  const st = save.settings;
  const set = () => {
    applyAudioSettings();
    persist();
  };
  const rows: HTMLElement[] = [
    h('div', { class: 'set-row' }, [
      h('span', { class: 'set-icon', html: ICONS.music }),
      h('span', { class: 'set-label', text: t('settings.music') }),
      slider(st.musicVol, (v) => ((st.musicVol = v), set())),
      toggle(st.music, (v) => ((st.music = v), set())),
    ]),
    h('div', { class: 'set-row' }, [
      h('span', { class: 'set-icon', html: ICONS.sound }),
      h('span', { class: 'set-label', text: t('settings.sfx') }),
      slider(st.sfxVol, (v) => ((st.sfxVol = v), set())),
      toggle(st.sfx, (v) => ((st.sfx = v), set())),
    ]),
    h('div', { class: 'set-row' }, [
      h('span', { class: 'set-icon', html: ICONS.vibro }),
      h('span', { class: 'set-label', text: t('settings.vibro') }),
      h('span', { class: 'grow' }),
      toggle(st.vibro, (v) => ((st.vibro = v), set())),
    ]),
  ];
  if (withLang) {
    const seg = h('div', { class: 'seg' });
    for (const l of ['ru', 'en'] as const) {
      const b = h('button', { class: getLang() === l ? 'on' : '', text: l.toUpperCase() });
      b.addEventListener('click', () => {
        audio.play('click');
        st.lang = l;
        persist();
        setLang(l);
      });
      seg.appendChild(b);
    }
    rows.unshift(
      h('div', { class: 'set-row' }, [
        h('span', { class: 'set-icon', html: ICONS.globe }),
        h('span', { class: 'set-label', text: t('settings.lang') }),
        h('span', { class: 'grow' }),
        seg,
      ]),
    );
  }
  return rows;
}

export function openSettings(): void {
  const m = openModal(
    [
      ...settingsRows(true),
      h('div', { class: 'modal-buttons' }, [
        btn(
          t('settings.reset'),
          () => {
            const c = openModal(
              [
                h('p', { class: 'modal-text', text: t('settings.resetConfirm') }),
                h('div', { class: 'modal-buttons row' }, [
                  btn(t('common.yes'), () => {
                    resetSave();
                    c.close();
                    m.close();
                    location.reload();
                  }, { variant: 'pink', small: true }),
                  btn(t('common.no'), () => c.close(), { variant: 'ghost', small: true }),
                ]),
              ],
              { title: t('settings.reset') },
            );
          },
          { variant: 'ghost', small: true },
        ),
      ]),
    ],
    { title: t('settings.title'), closable: true },
  );
}
