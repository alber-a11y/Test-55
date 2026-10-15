import type { CharLook, EnemyDef } from '../data/types';
import type { SkinDef } from '../data/shop';
import { OUTLINE as O, shade } from './color';

const S = `stroke="${O}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

function svg(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

/* ---------------------------------------------------------------- heroes */

function hairBack(l: CharLook): string {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'pony':
      return `<ellipse cx="86" cy="34" rx="11" ry="20" fill="${c}" ${S} transform="rotate(25 86 34)"/>`;
    case 'long':
      return `<path d="M18,46 Q14,10 52,10 Q90,10 86,46 L92,94 Q52,104 12,94 Z" fill="${shade(c, -0.12)}" ${S}/>`;
    case 'bun':
      return `<circle cx="52" cy="11" r="11" fill="${c}" ${S}/>`;
    default:
      return '';
  }
}

function hairFront(l: CharLook): string {
  const c = l.hair;
  const hl = shade(c, 0.35);
  switch (l.hairStyle) {
    case 'spiky':
      return `<path d="M21,42 L24,18 L33,27 L38,8 L47,22 L55,5 L61,22 L70,10 L73,27 L84,20 L83,42 Q52,26 21,42 Z" fill="${c}" ${S}/>
        <path d="M40,16 L45,24" stroke="${hl}" stroke-width="3" stroke-linecap="round"/>`;
    case 'pony':
    case 'bun':
    case 'cap':
      return `<path d="M21,44 Q21,13 52,13 Q83,13 83,44 Q72,28 56,30 Q48,24 40,32 Q30,32 21,44 Z" fill="${c}" ${S}/>
        <path d="M36,20 Q44,16 52,17" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'bob':
      return `<path d="M19,60 Q14,13 52,12 Q90,13 85,60 L76,60 Q78,32 58,28 Q44,36 28,34 Q26,46 28,60 Z" fill="${c}" ${S}/>
        <path d="M34,20 Q44,15 54,16" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'mohawk':
      return `<path d="M42,24 L42,4 L50,14 L54,0 L59,13 L66,4 L64,26 Q53,20 42,24 Z" fill="${c}" ${S}/>`;
    case 'long':
      return `<path d="M21,44 Q24,12 52,12 Q80,12 83,44 Q70,26 58,26 Q50,34 36,30 Q28,34 21,44 Z" fill="${c}" ${S}/>
        <path d="M36,19 Q44,15 52,16" stroke="${hl}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'bald':
      return `<ellipse cx="40" cy="24" rx="9" ry="5" fill="#ffffff" opacity="0.35"/>`;
    default:
      return '';
  }
}

function headgear(l: CharLook): string {
  const a = l.accent;
  switch (l.headgear) {
    case 'helmet':
      return `<path d="M19,40 Q19,8 52,8 Q85,8 85,40 Z" fill="${a}" ${S}/>
        <path d="M14,40 L90,40 L90,47 L14,47 Z" fill="${shade(a, -0.25)}" ${S}/>
        <path d="M46,9 L46,40 M58,9 L58,40" stroke="${shade(a, -0.25)}" stroke-width="4"/>`;
    case 'goggles':
      return `<path d="M20,30 L84,30 L84,38 L20,38 Z" fill="#3a3a3a" ${S}/>
        <circle cx="40" cy="31" r="9" fill="#9be7ff" ${S}/><circle cx="64" cy="31" r="9" fill="#9be7ff" ${S}/>
        <circle cx="37" cy="28" r="3" fill="#ffffff"/><circle cx="61" cy="28" r="3" fill="#ffffff"/>`;
    case 'hood':
      return `<path d="M14,64 Q8,6 52,6 Q96,6 90,64 L80,64 Q82,26 52,24 Q22,26 24,64 Z" fill="${l.outfit}" ${S}/>
        <path d="M30,14 Q52,4 74,14" stroke="${shade(l.outfit, 0.3)}" stroke-width="3" fill="none"/>`;
    case 'bandana':
      return `<path d="M21,30 Q52,18 83,30 L83,39 Q52,28 21,39 Z" fill="${a}" ${S}/>
        <path d="M82,32 L96,26 L93,38 Z M82,35 L94,44 L84,44 Z" fill="${a}" ${S}/>
        <circle cx="40" cy="30" r="2" fill="#fff"/><circle cx="58" cy="28" r="2" fill="#fff"/>`;
    case 'horns':
      return `<path d="M28,24 Q14,14 18,0 Q26,12 36,16 Z" fill="#f1faee" ${S}/>
        <path d="M76,24 Q90,14 86,0 Q78,12 68,16 Z" fill="#f1faee" ${S}/>`;
    default:
      return '';
  }
}

function eyes(l: CharLook): string {
  if (l.eyes === 'visor') {
    return `<path d="M26,42 Q52,36 78,42 L78,54 Q52,48 26,54 Z" fill="#1b1530" ${S}/>
      <path d="M34,46 L46,45 M58,45 L70,46" stroke="${l.accent}" stroke-width="4" stroke-linecap="round"/>`;
  }
  let out = `<ellipse cx="41" cy="49" rx="7.5" ry="9" fill="#fff" ${S} stroke-width="3"/>
    <ellipse cx="63" cy="49" rx="7.5" ry="9" fill="#fff" ${S} stroke-width="3"/>
    <circle cx="43.5" cy="50" r="4.2" fill="${O}"/><circle cx="65.5" cy="50" r="4.2" fill="${O}"/>
    <circle cx="45" cy="48" r="1.5" fill="#fff"/><circle cx="67" cy="48" r="1.5" fill="#fff"/>`;
  if (l.eyes === 'angry') {
    out += `<path d="M32,37 L48,42 M72,37 L57,42" stroke="${O}" stroke-width="4.5" stroke-linecap="round"/>`;
  } else if (l.eyes === 'happy') {
    out += `<path d="M33,38 Q41,33 48,37 M56,37 Q63,33 71,38" stroke="${O}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="60" rx="5" ry="3" fill="#ff8fab" opacity="0.7"/><ellipse cx="73" cy="60" rx="5" ry="3" fill="#ff8fab" opacity="0.7"/>`;
  } else {
    out += `<path d="M34,38 L47,38 M57,38 L70,38" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  return out;
}

function mouth(l: CharLook): string {
  if (l.eyes === 'angry') return `<path d="M45,63 L60,63 L58,68 L47,68 Z" fill="#fff" ${S} stroke-width="2.5"/>`;
  if (l.eyes === 'happy') return `<path d="M45,61 Q53,61 60,61 Q58,70 52,70 Q46,70 45,61 Z" fill="#8c1c3a" ${S} stroke-width="2.5"/>`;
  return `<path d="M46,63 Q53,67 59,62" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

function weapon(l: CharLook): string {
  const a = l.accent;
  switch (l.weapon) {
    case 'shotgun':
      return `<rect x="58" y="82" width="20" height="16" rx="4" fill="#8d5524" ${S}/>
        <rect x="68" y="76" width="46" height="9" rx="3" fill="#495057" ${S}/>
        <rect x="68" y="84" width="44" height="8" rx="3" fill="#343a40" ${S}/>
        <rect x="80" y="74" width="10" height="20" rx="2" fill="${a}" ${S}/>`;
    case 'rifle':
      return `<rect x="56" y="84" width="18" height="12" rx="4" fill="${shade(a, -0.3)}" ${S}/>
        <rect x="64" y="80" width="54" height="7" rx="3" fill="#495057" ${S}/>
        <rect x="76" y="70" width="22" height="8" rx="3" fill="${a}" ${S}/>
        <circle cx="98" cy="74" r="3" fill="#9be7ff"/>`;
    case 'bomb':
      return `<circle cx="96" cy="88" r="15" fill="#2b2d42" ${S}/>
        <circle cx="91" cy="83" r="4" fill="#ffffff" opacity="0.45"/>
        <rect x="92" y="68" width="8" height="7" fill="#6c757d" ${S} stroke-width="2.5"/>
        <path d="M96,68 Q100,58 108,60" stroke="#8d5524" stroke-width="3" fill="none"/>
        <path d="M108,52 L111,58 L117,58 L112,62 L114,68 L108,64 L103,68 L105,62 L100,58 L106,58 Z" fill="${a}" ${S} stroke-width="2"/>`;
    case 'staff':
      return `<path d="M94,118 L94,54" stroke="${O}" stroke-width="10" stroke-linecap="round"/>
        <path d="M94,118 L94,54" stroke="#a5743f" stroke-width="5" stroke-linecap="round"/>
        <circle cx="94" cy="46" r="12" fill="${l.hair}" ${S}/>
        <circle cx="90" cy="42" r="4" fill="#fff" opacity="0.7"/>
        <path d="M80,40 Q86,30 94,32 M108,40 Q102,30 94,32" stroke="#57cc99" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'claws':
      return `<path d="M82,82 L116,70 M84,88 L118,86 M82,94 L114,102" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
        <path d="M82,82 L116,70 M84,88 L118,86 M82,94 L114,102" stroke="#dee2e6" stroke-width="4" stroke-linecap="round"/>
        <rect x="72" y="80" width="14" height="18" rx="4" fill="${a}" ${S}/>`;
    case 'nailgun':
      return `<rect x="62" y="74" width="38" height="22" rx="6" fill="${l.outfit}" ${S}/>
        <rect x="98" y="80" width="16" height="9" rx="2" fill="#6c757d" ${S}/>
        <rect x="70" y="66" width="20" height="10" rx="4" fill="${a}" ${S}/>
        <path d="M70,96 L66,108 L76,108 L80,96" fill="#495057" ${S}/>
        <circle cx="76" cy="85" r="4" fill="#ffd166" ${S} stroke-width="2"/>`;
    case 'flamer':
      return `<rect x="60" y="78" width="40" height="13" rx="5" fill="#6c757d" ${S}/>
        <path d="M100,76 L114,72 L114,97 L100,93 Z" fill="#343a40" ${S}/>
        <path d="M116,80 Q124,84 116,90 Q120,85 116,80 Z" fill="${a}"/>
        <rect x="66" y="90" width="10" height="14" rx="3" fill="${shade(a, -0.2)}" ${S}/>`;
    case 'hammer':
      return `<path d="M72,110 L98,58" stroke="${O}" stroke-width="11" stroke-linecap="round"/>
        <path d="M72,110 L98,58" stroke="#8d5524" stroke-width="6" stroke-linecap="round"/>
        <g transform="rotate(27 100 52)"><rect x="80" y="38" width="42" height="28" rx="6" fill="#adb5bd" ${S}/>
        <rect x="80" y="38" width="10" height="28" rx="3" fill="${a}" ${S}/><rect x="112" y="38" width="10" height="28" rx="3" fill="${a}" ${S}/></g>`;
    case 'daggers':
      return `<path d="M80,84 L112,72 L116,76 L84,90 Z" fill="#dee2e6" ${S} stroke-width="3"/>
        <path d="M80,94 L114,94 L114,99 L80,100 Z" fill="#dee2e6" ${S} stroke-width="3"/>
        <rect x="72" y="80" width="10" height="24" rx="3" fill="${a}" ${S}/>`;
    case 'coil':
      return `<rect x="62" y="80" width="28" height="16" rx="5" fill="#495057" ${S}/>
        <path d="M88,88 L108,88" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
        <ellipse cx="96" cy="88" rx="3" ry="9" fill="${a}" ${S} stroke-width="2"/><ellipse cx="104" cy="88" rx="3" ry="9" fill="${a}" ${S} stroke-width="2"/>
        <circle cx="112" cy="88" r="7" fill="#9be7ff" ${S}/>
        <path d="M114,76 L110,84 L116,84 L112,92" stroke="${a}" stroke-width="3" fill="none"/>`;
  }
  return '';
}

function accessory(acc: SkinDef['accessory'] | undefined, l: CharLook): string {
  switch (acc) {
    case 'crown':
      return `<path d="M30,18 L34,0 L44,12 L52,-2 L60,12 L70,0 L74,18 Z" fill="#ffd60a" ${S}/>
        <circle cx="52" cy="10" r="3.5" fill="#e63946"/><circle cx="38" cy="12" r="2.5" fill="#4cc9f0"/><circle cx="66" cy="12" r="2.5" fill="#4cc9f0"/>`;
    case 'shades':
      return `<path d="M30,43 L50,43 L48,55 L33,55 Z M55,43 L75,43 L72,55 L57,55 Z" fill="#111" ${S} stroke-width="2.5"/>
        <path d="M50,46 L55,46" stroke="${O}" stroke-width="3"/><path d="M34,46 L40,46 M59,46 L65,46" stroke="#4cc9f0" stroke-width="2.5"/>`;
    case 'pirate':
      return `<path d="M12,30 Q52,-12 92,30 Q52,18 12,30 Z" fill="#1b1b1b" ${S}/>
        <circle cx="52" cy="16" r="5" fill="#fff"/><path d="M47,24 L57,24" stroke="#fff" stroke-width="2"/>`;
    case 'halo':
      return `<ellipse cx="52" cy="4" rx="22" ry="6" fill="none" stroke="#ffd60a" stroke-width="5"/>
        <ellipse cx="52" cy="4" rx="22" ry="6" fill="none" stroke="#fff3b0" stroke-width="2"/>`;
    case 'horns':
      return `<path d="M30,22 Q20,10 26,0 Q30,12 38,16 Z" fill="#d00000" ${S} stroke-width="2.5"/>
        <path d="M74,22 Q84,10 78,0 Q74,12 66,16 Z" fill="#d00000" ${S} stroke-width="2.5"/>`;
    case 'cap':
      return `<path d="M22,30 Q22,6 52,6 Q82,6 82,30 Z" fill="${l.accent}" ${S}/>
        <path d="M70,28 L104,26 Q102,34 80,34 Z" fill="${shade(l.accent, -0.25)}" ${S}/>
        <circle cx="52" cy="7" r="3" fill="${l.outfit}"/>`;
    case 'tiara':
      return `<path d="M28,24 Q52,14 76,24 L74,28 Q52,20 30,28 Z" fill="#ffd60a" ${S} stroke-width="2.5"/>
        <path d="M52,20 L48,12 L52,6 L56,12 Z" fill="#c77dff" ${S} stroke-width="2"/>`;
    case 'mask':
      return `<path d="M24,56 Q52,50 82,56 L80,72 Q52,82 26,72 Z" fill="${l.outfit}" ${S}/>`;
    default:
      return '';
  }
}

export function heroSvg(base: CharLook, skin?: SkinDef): string {
  const l: CharLook = { ...base, ...(skin?.palette ?? {}) };
  const bw = l.build === 'big' ? 52 : l.build === 'slim' ? 34 : 42;
  const bx = 52 - bw / 2;
  const dark = shade(l.outfit, -0.35);
  const parts = [
    // legs + shoes
    `<rect x="${52 - 13}" y="100" width="11" height="17" rx="4" fill="${dark}" ${S}/>`,
    `<rect x="${52 + 2}" y="100" width="11" height="17" rx="4" fill="${dark}" ${S}/>`,
    `<ellipse cx="${52 - 9}" cy="119" rx="9" ry="5.5" fill="#2b2d42" ${S} stroke-width="3"/>`,
    `<ellipse cx="${52 + 9}" cy="119" rx="9" ry="5.5" fill="#2b2d42" ${S} stroke-width="3"/>`,
    hairBack(l),
    // left arm
    `<ellipse cx="${bx - 1}" cy="84" rx="7.5" ry="11" fill="${l.outfit}" ${S}/>`,
    `<circle cx="${bx - 2}" cy="95" r="6.5" fill="${l.skin}" ${S} stroke-width="3"/>`,
    // torso
    `<rect x="${bx}" y="66" width="${bw}" height="40" rx="14" fill="${l.outfit}" ${S}/>`,
    `<path d="M${bx + 6},70 Q52,82 ${bx + bw - 6},70" stroke="${shade(l.outfit, 0.25)}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<rect x="${bx + 2}" y="92" width="${bw - 4}" height="6" fill="${l.accent}" stroke="${O}" stroke-width="2.5"/>`,
    `<rect x="47" y="90" width="10" height="10" rx="2" fill="${shade(l.accent, -0.2)}" stroke="${O}" stroke-width="2.5"/>`,
    // head
    `<circle cx="22" cy="48" r="6.5" fill="${l.skin}" ${S}/>`,
    `<circle cx="82" cy="48" r="6.5" fill="${l.skin}" ${S}/>`,
    `<circle cx="52" cy="44" r="30" fill="${l.skin}" ${S}/>`,
    `<ellipse cx="62" cy="62" rx="16" ry="7" fill="${shade(l.skin, -0.12)}" opacity="0.35"/>`,
    hairFront(l),
    eyes(l),
    mouth(l),
    headgear(l),
    accessory(skin?.accessory, l),
    weapon(l),
    // gripping hand
    `<circle cx="76" cy="90" r="7.5" fill="${l.skin}" ${S} stroke-width="3"/>`,
  ];
  if (skin?.shiny) {
    parts.unshift(`<circle cx="52" cy="60" r="56" fill="#ffd60a" opacity="0.18"/>`);
  }
  return svg(124, 130, `<g transform="translate(2,4)">${parts.join('')}</g>`);
}

/* ---------------------------------------------------------------- enemies (robots) */

export function enemySvg(look: EnemyDef['look']): string {
  const b = look.body;
  const d = look.dark;
  const e = look.eye;
  const lite = shade(b, 0.35);
  let body = '';
  let feet = `<ellipse cx="36" cy="100" rx="10" ry="6" fill="${d}" ${S} stroke-width="3"/><ellipse cx="64" cy="100" rx="10" ry="6" fill="${d}" ${S} stroke-width="3"/>`;
  let visorY = 44;
  switch (look.shape) {
    case 'round':
      body = `<path d="M50,16 L50,6" stroke="${O}" stroke-width="4"/><circle cx="50" cy="5" r="5" fill="${e}" ${S} stroke-width="2.5"/>
        <circle cx="50" cy="56" r="38" fill="${b}" ${S}/><ellipse cx="50" cy="72" rx="22" ry="14" fill="${lite}" opacity="0.6"/>`;
      break;
    case 'box':
      body = `<path d="M36,22 L30,8 M64,22 L70,8" stroke="${O}" stroke-width="4"/><circle cx="30" cy="8" r="4" fill="${e}"/><circle cx="70" cy="8" r="4" fill="${e}"/>
        <rect x="12" y="20" width="76" height="74" rx="16" fill="${b}" ${S}/><rect x="24" y="66" width="52" height="18" rx="6" fill="${d}" opacity="0.6"/>
        <circle cx="34" cy="75" r="3" fill="${e}"/><circle cx="46" cy="75" r="3" fill="${e}"/>`;
      break;
    case 'tall':
      body = `<rect x="22" y="8" width="56" height="88" rx="24" fill="${b}" ${S}/><rect x="30" y="62" width="40" height="22" rx="8" fill="${lite}" opacity="0.55"/>`;
      visorY = 34;
      break;
    case 'blob':
      body = `<path d="M10,90 Q4,48 28,28 Q50,8 72,28 Q96,48 90,90 Q70,100 50,94 Q30,100 10,90 Z" fill="${b}" ${S}/>
        <ellipse cx="34" cy="38" rx="9" ry="6" fill="#fff" opacity="0.45"/>`;
      feet = '';
      visorY = 46;
      break;
    case 'spike':
      body = `<g fill="${d}" ${S} stroke-width="3">
        <path d="M50,8 L58,26 L42,26 Z"/><path d="M92,56 L74,64 L74,48 Z"/><path d="M8,56 L26,48 L26,64 Z"/>
        <path d="M80,24 L72,40 L62,30 Z"/><path d="M20,24 L38,30 L28,40 Z"/></g>
        <circle cx="50" cy="58" r="32" fill="${b}" ${S}/>
        <path d="M50,26 Q54,14 64,12" stroke="#6c584c" stroke-width="3" fill="none"/>
        <circle cx="66" cy="11" r="5" fill="#ff7b00"/><circle cx="66" cy="11" r="2.5" fill="#ffee32"/>`;
      break;
    case 'drone':
      body = `<path d="M18,30 L40,40 M82,30 L60,40" stroke="${O}" stroke-width="5"/>
        <ellipse cx="16" cy="28" rx="16" ry="4" fill="${d}" ${S} stroke-width="2.5"/><ellipse cx="84" cy="28" rx="16" ry="4" fill="${d}" ${S} stroke-width="2.5"/>
        <ellipse cx="50" cy="60" rx="34" ry="26" fill="${b}" ${S}/><path d="M30,82 L24,94 M70,82 L76,94" stroke="${O}" stroke-width="4"/>`;
      feet = '';
      visorY = 50;
      break;
  }
  const visor = `<rect x="26" y="${visorY}" width="48" height="20" rx="10" fill="${O}"/>
    <circle cx="40" cy="${visorY + 10}" r="5" fill="${e}"/><circle cx="60" cy="${visorY + 10}" r="5" fill="${e}"/>
    <circle cx="40" cy="${visorY + 10}" r="2" fill="#fff"/><circle cx="60" cy="${visorY + 10}" r="2" fill="#fff"/>
    <path d="M30,${visorY - 4} L44,${visorY + 1} M70,${visorY - 4} L56,${visorY + 1}" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`;
  let gear = '';
  switch (look.gear) {
    case 'blaster':
      gear = `<rect x="70" y="66" width="30" height="12" rx="4" fill="#495057" ${S}/><rect x="70" y="72" width="10" height="14" rx="3" fill="${d}" ${S} stroke-width="2.5"/><circle cx="99" cy="72" r="3" fill="${e}"/>`;
      break;
    case 'bomb':
      gear = `<circle cx="86" cy="72" r="12" fill="#2b2d42" ${S}/><path d="M86,60 Q90,52 96,54" stroke="#8d5524" stroke-width="3" fill="none"/><circle cx="97" cy="53" r="3.5" fill="#ff7b00"/>`;
      break;
    case 'fists':
      gear = `<circle cx="12" cy="70" r="11" fill="${d}" ${S}/><circle cx="88" cy="70" r="11" fill="${d}" ${S}/>`;
      break;
    case 'scope':
      gear = `<rect x="58" y="70" width="44" height="7" rx="3" fill="#343a40" ${S} stroke-width="3"/><rect x="66" y="62" width="18" height="7" rx="3" fill="${e}" ${S} stroke-width="2.5"/>`;
      break;
    case 'cross':
      gear = `<path d="M44,70 L56,70 L56,64 M44,70 L44,64" stroke="none"/><rect x="45" y="66" width="10" height="24" rx="2" fill="#e63946"/><rect x="38" y="73" width="24" height="10" rx="2" fill="#e63946"/>
        <rect x="74" y="64" width="22" height="24" rx="5" fill="#f1faee" ${S} stroke-width="3"/><path d="M85,70 L85,82 M79,76 L91,76" stroke="#e63946" stroke-width="4"/>`;
      break;
    case 'shield':
      gear = `<path d="M0,46 Q14,40 26,46 L26,78 Q14,94 0,78 Z" fill="#adb5bd" ${S}/><path d="M13,52 L13,82" stroke="${d}" stroke-width="4"/>
        <rect x="74" y="68" width="24" height="10" rx="3" fill="#495057" ${S} stroke-width="3"/>`;
      break;
    case 'staff':
      gear = `<path d="M88,96 L88,40" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M88,96 L88,40" stroke="#6c584c" stroke-width="4"/>
        <circle cx="88" cy="34" r="10" fill="${e}" ${S}/><circle cx="85" cy="31" r="3" fill="#fff"/>`;
      break;
  }
  return svg(104, 110, `<g transform="translate(2,2)">${feet}${body}${visor}${gear}</g>`);
}
