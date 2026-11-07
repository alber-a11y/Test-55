import { ICON_SETS } from '../src/art/icons';
import { iconSvg } from '../src/art/svg';

const root = document.getElementById('root')!;
const only = new URLSearchParams(location.search).get('set');
for (const [name, set] of Object.entries(ICON_SETS)) {
  if (only && only !== name) continue;
  const row = document.createElement('div');
  row.className = 'set';
  for (const fn of set) {
    const t = document.createElement('div');
    t.className = 'tile';
    t.innerHTML = iconSvg(fn, 104);
    row.appendChild(t);
  }
  root.appendChild(row);
}

import { bgSvg, BG_IDS } from '../src/art/backgrounds';
import { SKIN_IDS, tileSvg } from '../src/art/skins';
import { UI_ICONS } from '../src/art/ui';
const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'bg') {
  root.innerHTML = '';
  root.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:6px';
  for (const id of BG_IDS) {
    const d = document.createElement('div');
    d.innerHTML = bgSvg(id, 216, 384);
    root.appendChild(d);
  }
}
if (mode === 'skins') {
  root.innerHTML = '';
  root.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;padding:10px';
  for (const id of [...SKIN_IDS, 'hidden']) {
    const d = document.createElement('div');
    d.style.position = 'relative';
    d.innerHTML = tileSvg(id === 'hidden' ? 'skin_classic' : id, id === 'hidden' ? 'hidden' : 'normal');
    const ic = document.createElement('div');
    ic.style.cssText = 'position:absolute;left:16px;top:16px';
    ic.innerHTML = id === 'hidden' ? iconSvg(UI_ICONS.question, 118) : iconSvg(ICON_SETS.icons_garden[0], 118);
    d.appendChild(ic);
    root.appendChild(d);
  }
  const ui = document.createElement('div');
  ui.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;background:#3a8ad0;padding:8px;width:100%';
  for (const k of Object.keys(UI_ICONS)) ui.innerHTML += `<div title="${k}">${iconSvg(UI_ICONS[k], 64)}</div>`;
  root.appendChild(ui);
}
