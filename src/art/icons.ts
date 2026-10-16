import { OUTLINE as O } from './color';

const svg = (w: number, h: number, b: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${b}</svg>`;
const S = `stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

/** Projectiles: drawn pointing right (+x). */
export const PROJECTILES: Record<string, string> = {
  p_pellet: svg(18, 18, `<circle cx="9" cy="9" r="6.5" fill="#ffe066" ${S} stroke-width="2.5"/><circle cx="7" cy="7" r="2" fill="#fff"/>`),
  p_bolt: svg(46, 16, `<path d="M2,8 Q20,1 44,8 Q20,15 2,8 Z" fill="#7df9ff" ${S} stroke-width="2.5"/><path d="M12,8 L38,8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
  p_bomb: svg(32, 34, `<circle cx="16" cy="19" r="12" fill="#2b2d42" ${S}/><circle cx="12" cy="15" r="3" fill="#fff" opacity="0.5"/><path d="M16,7 Q18,2 24,3" stroke="#8d5524" stroke-width="3" fill="none"/><circle cx="25" cy="3" r="3" fill="#ffba08"/>`),
  p_wave: svg(34, 56, `<path d="M6,4 Q34,28 6,52 Q20,28 6,4 Z" fill="#80ed99" ${S} stroke-width="2.5"/><path d="M12,14 Q22,28 12,42" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  p_nail: svg(30, 10, `<path d="M2,2 L6,2 L6,4 L24,4 L29,5 L24,6 L6,6 L6,8 L2,8 Z" fill="#ced4da" stroke="${O}" stroke-width="1.5"/>`),
  p_flame: svg(34, 34, `<circle cx="17" cy="17" r="14" fill="#ff7b00" opacity="0.85"/><circle cx="17" cy="17" r="9" fill="#ffba08"/><circle cx="17" cy="17" r="4" fill="#fff3b0"/>`),
  p_dagger: svg(36, 14, `<path d="M2,7 L8,3 L8,11 Z" fill="#c77dff" ${S} stroke-width="2"/><path d="M8,4 L30,5 L35,7 L30,9 L8,10 Z" fill="#e9ecef" ${S} stroke-width="2"/>`),
  e_bullet: svg(20, 20, `<circle cx="10" cy="10" r="7.5" fill="#ff4d6d" ${S} stroke-width="2.5"/><circle cx="8" cy="8" r="2.5" fill="#ffccd5"/>`),
  e_bomb: svg(30, 32, `<circle cx="15" cy="18" r="11" fill="#9d0208" ${S}/><circle cx="11" cy="14" r="3" fill="#fff" opacity="0.5"/><path d="M15,7 Q17,2 22,3" stroke="#8d5524" stroke-width="3" fill="none"/><circle cx="23" cy="3" r="3" fill="#ffba08"/>`),
  e_laser: svg(48, 12, `<rect x="2" y="2" width="44" height="8" rx="4" fill="#ff006e" ${S} stroke-width="2"/><rect x="8" y="5" width="32" height="2" fill="#fff"/>`),
  e_orb: svg(26, 26, `<circle cx="13" cy="13" r="10" fill="#9b5de5" ${S} stroke-width="2.5"/><circle cx="13" cy="13" r="5" fill="#00f5d4"/>`),
  b_rock: svg(44, 44, `<path d="M6,22 L12,8 L28,4 L40,14 L38,32 L24,40 L10,36 Z" fill="#979dac" ${S}/><path d="M16,18 L24,14" stroke="#fff" stroke-width="3" opacity="0.5"/>`),
  b_sting: svg(32, 12, `<path d="M2,6 L12,1 L30,6 L12,11 Z" fill="#ffd60a" ${S} stroke-width="2"/><path d="M6,4 L6,8" stroke="${O}" stroke-width="2"/>`),
  b_fire: svg(36, 36, `<circle cx="18" cy="18" r="15" fill="#d00000" ${S} stroke-width="2.5"/><circle cx="18" cy="18" r="10" fill="#ff7b00"/><circle cx="18" cy="18" r="5" fill="#ffee32"/>`),
  b_missile: svg(40, 16, `<path d="M4,3 L28,3 Q38,8 28,13 L4,13 Z" fill="#e9ecef" ${S} stroke-width="2.5"/><path d="M4,3 L0,0 L0,16 L4,13 Z" fill="#e63946"/><rect x="18" y="3" width="4" height="10" fill="#e63946"/>`),
  b_shadow: svg(40, 20, `<path d="M2,10 Q20,0 38,10 Q20,20 2,10 Z" fill="#7b2cbf" ${S} stroke-width="2.5"/><path d="M10,10 L32,10" stroke="#00f5d4" stroke-width="3" stroke-linecap="round"/>`),
  b_slime: svg(34, 30, `<path d="M4,22 Q2,6 17,4 Q32,6 30,22 Q17,30 4,22 Z" fill="#70e000" ${S}/><circle cx="12" cy="12" r="3" fill="#fff" opacity="0.6"/>`),
};

export const FX: Record<string, string> = {
  spark: svg(16, 16, `<circle cx="8" cy="8" r="7" fill="#fff"/>`),
  soft: svg(64, 64, `<defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/>`),
  smoke: svg(40, 40, `<circle cx="20" cy="20" r="18" fill="#fff" opacity="0.9"/>`),
  debris: svg(12, 12, `<rect x="1" y="1" width="10" height="10" rx="2" fill="#fff"/>`),
  star4: svg(24, 24, `<path d="M12,0 L15,9 L24,12 L15,15 L12,24 L9,15 L0,12 L9,9 Z" fill="#fff"/>`),
  ring: svg(128, 128, `<circle cx="64" cy="64" r="60" fill="none" stroke="#fff" stroke-width="6"/>`),
  disc: svg(128, 128, `<circle cx="64" cy="64" r="64" fill="#fff"/>`),
  shadow: svg(64, 24, `<ellipse cx="32" cy="12" rx="30" ry="11" fill="#000" opacity="0.28"/>`),
  aim_arrow: svg(40, 40, `<path d="M4,8 L36,20 L4,32 L12,20 Z" fill="#fff"/>`),
  turret: svg(100, 100, `<path d="M20,94 L40,62 M80,94 L60,62 M50,96 L50,62" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
    <path d="M20,94 L40,62 M80,94 L60,62 M50,96 L50,62" stroke="#6c757d" stroke-width="4" stroke-linecap="round"/>
    <rect x="22" y="30" width="56" height="36" rx="12" fill="#f77f00" ${S}/>
    <rect x="70" y="40" width="28" height="12" rx="4" fill="#495057" ${S}/>
    <rect x="34" y="38" width="22" height="14" rx="6" fill="${O}"/><circle cx="45" cy="45" r="4" fill="#4cc9f0"/>
    <path d="M50,30 L50,16" stroke="${O}" stroke-width="4"/><circle cx="50" cy="14" r="5" fill="#ef233c" ${S}/>`),
};

export const PICKUPS: Record<string, string> = {
  coin: svg(36, 36, `<circle cx="18" cy="18" r="15" fill="#ffd60a" ${S}/><circle cx="18" cy="18" r="10" fill="#ffc300" stroke="#e09f00" stroke-width="2"/><path d="M15,11 L15,25 M21,11 L21,25" stroke="#fff3b0" stroke-width="3" stroke-linecap="round"/>`),
  heart: svg(40, 36, `<path d="M20,34 Q2,22 3,11 Q4,2 13,2 Q18,2 20,8 Q22,2 27,2 Q36,2 37,11 Q38,22 20,34 Z" fill="#ef233c" ${S}/><circle cx="12" cy="11" r="3.5" fill="#fff" opacity="0.7"/>`),
  shroom: svg(40, 40, `<rect x="14" y="20" width="12" height="16" rx="4" fill="#fff3e0" ${S}/><path d="M3,22 Q4,4 20,3 Q36,4 37,22 Z" fill="#06d6a0" ${S}/><circle cx="13" cy="13" r="3.5" fill="#fff"/><circle cx="26" cy="10" r="3" fill="#fff"/><circle cx="29" cy="18" r="2.5" fill="#fff"/>`),
};

/** UI icons, 64x64. */
export const ICONS: Record<string, string> = {
  i_coin: PICKUPS.coin.replace('width="36" height="36"', 'width="64" height="64"'),
  i_star: svg(64, 64, `<path d="M32,4 L40,23 L61,24 L45,38 L50,59 L32,48 L14,59 L19,38 L3,24 L24,23 Z" fill="#ffd60a" ${S} stroke-width="4"/><path d="M26,24 L32,12" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  i_star_empty: svg(64, 64, `<path d="M32,4 L40,23 L61,24 L45,38 L50,59 L32,48 L14,59 L19,38 L3,24 L24,23 Z" fill="#3a3f5c" ${S} stroke-width="4"/>`),
  i_lock: svg(64, 64, `<path d="M20,28 L20,20 Q20,6 32,6 Q44,6 44,20 L44,28" stroke="${O}" stroke-width="10" fill="none"/><path d="M20,28 L20,20 Q20,6 32,6 Q44,6 44,20 L44,28" stroke="#adb5bd" stroke-width="5" fill="none"/><rect x="12" y="26" width="40" height="32" rx="8" fill="#ffd166" ${S} stroke-width="4"/><circle cx="32" cy="40" r="5" fill="${O}"/><rect x="30" y="40" width="4" height="10" fill="${O}"/>`),
  i_ad: svg(64, 64, `<rect x="4" y="12" width="56" height="40" rx="10" fill="#7209b7" ${S} stroke-width="4"/><path d="M26,22 L42,32 L26,42 Z" fill="#fff"/>`),
  i_heart: PICKUPS.heart.replace('width="40" height="36"', 'width="64" height="58"'),
  i_shield: svg(64, 64, `<path d="M32,4 L56,12 Q56,44 32,60 Q8,44 8,12 Z" fill="#4cc9f0" ${S} stroke-width="4"/><path d="M32,12 L48,17 Q48,40 32,51 Z" fill="#fff" opacity="0.35"/>`),
  i_damage: svg(64, 64, `<path d="M10,54 L18,46 M14,58 L6,50" stroke="${O}" stroke-width="8" stroke-linecap="round"/><path d="M16,48 L50,8 L58,6 L56,14 L18,50 Z" fill="#e9ecef" ${S} stroke-width="4"/><path d="M8,40 L26,58" stroke="#e63946" stroke-width="8" stroke-linecap="round"/><path d="M8,40 L26,58" stroke="${O}" stroke-width="2" stroke-linecap="round" opacity="0.4"/>`),
  i_speed: svg(64, 64, `<path d="M14,8 L40,8 L36,30 L52,30 L50,56 L12,56 Q8,40 18,32 Z" fill="#06d6a0" ${S} stroke-width="4"/><path d="M2,22 L12,22 M0,34 L10,34 M4,46 L12,46" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  i_super: svg(64, 64, `<circle cx="32" cy="32" r="28" fill="#ffd60a" ${S} stroke-width="4"/><path d="M36,8 L18,36 L30,36 L26,56 L46,26 L34,26 Z" fill="#fff" ${S} stroke-width="3"/>`),
  i_life: svg(64, 64, `<path d="M32,58 Q4,40 5,18 Q6,4 20,4 Q28,4 32,14 Q36,4 44,4 Q58,4 59,18 Q60,40 32,58 Z" fill="#ef233c" ${S} stroke-width="4"/><path d="M32,18 L32,42 M20,30 L44,30" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`),
  i_sound: svg(64, 64, `<path d="M8,24 L20,24 L34,10 L34,54 L20,40 L8,40 Z" fill="#fff" ${S} stroke-width="4"/><path d="M42,22 Q50,32 42,42 M48,14 Q62,32 48,50" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`),
  i_music: svg(64, 64, `<path d="M22,46 L22,12 L52,6 L52,40" stroke="#fff" stroke-width="6" fill="none"/><circle cx="16" cy="48" r="9" fill="#fff" ${S}/><circle cx="46" cy="42" r="9" fill="#fff" ${S}/>`),
  i_pause: svg(64, 64, `<rect x="14" y="10" width="13" height="44" rx="4" fill="#fff" ${S}/><rect x="37" y="10" width="13" height="44" rx="4" fill="#fff" ${S}/>`),
  i_cross: svg(64, 64, `<path d="M16,16 L48,48 M48,16 L16,48" stroke="${O}" stroke-width="14" stroke-linecap="round"/><path d="M16,16 L48,48 M48,16 L16,48" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`),
  i_skull: svg(64, 64, `<path d="M8,30 Q8,4 32,4 Q56,4 56,30 Q56,42 46,46 L46,58 L18,58 L18,46 Q8,42 8,30 Z" fill="#f1faee" ${S} stroke-width="4"/><circle cx="22" cy="30" r="7" fill="${O}"/><circle cx="42" cy="30" r="7" fill="${O}"/><path d="M28,48 L28,56 M36,48 L36,56" stroke="${O}" stroke-width="3"/>`),
  i_play: svg(64, 64, `<path d="M18,8 L54,32 L18,56 Z" fill="#fff" ${S} stroke-width="4"/>`),
  i_arrow: svg(64, 64, `<path d="M24,8 L48,32 L24,56" stroke="${O}" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24,8 L48,32 L24,56" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  i_up: svg(64, 64, `<path d="M32,6 L58,34 L42,34 L42,58 L22,58 L22,34 L6,34 Z" fill="#06d6a0" ${S} stroke-width="4"/>`),
  i_check: svg(64, 64, `<path d="M10,34 L26,50 L56,14" stroke="${O}" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10,34 L26,50 L56,14" stroke="#06d6a0" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  i_gift: svg(64, 64, `<rect x="8" y="26" width="48" height="32" rx="4" fill="#e63946" ${S} stroke-width="4"/><rect x="4" y="16" width="56" height="14" rx="4" fill="#ff6b6b" ${S} stroke-width="4"/><rect x="28" y="16" width="8" height="42" fill="#ffd60a"/><path d="M32,16 Q20,2 14,10 Q12,16 32,16 Q44,2 50,10 Q52,16 32,16" stroke="${O}" stroke-width="3" fill="#ffd60a"/>`),
  i_globe: svg(64, 64, `<circle cx="32" cy="32" r="26" fill="#4cc9f0" ${S} stroke-width="4"/><path d="M6,32 L58,32 M32,6 Q16,32 32,58 Q48,32 32,6" stroke="${O}" stroke-width="3" fill="none"/>`),
  i_gear: svg(64, 64, `<path d="M28,4 L36,4 L38,12 Q42,13 45,15 L52,10 L58,16 L53,23 Q55,26 56,30 L64,32 L64,36 L56,38 Q55,42 53,45 L58,52 L52,58 L45,53 Q42,55 38,56 L36,64 L28,64 L26,56 Q22,55 19,53 L12,58 L6,52 L11,45 Q9,42 8,38 L0,36 L0,28 L8,26 Q9,22 11,19 L6,12 L12,6 L19,11 Q22,9 26,8 Z" transform="translate(2,-2) scale(0.94)" fill="#e9ecef" ${S} stroke-width="4"/><circle cx="32" cy="32" r="10" fill="#5c677d" ${S} stroke-width="4"/>`),
  i_trophy: svg(64, 64, `<path d="M16,8 L48,8 L46,30 Q32,44 18,30 Z" fill="#ffd60a" ${S} stroke-width="4"/><path d="M16,12 Q4,12 8,24 Q12,30 18,30 M48,12 Q60,12 56,24 Q52,30 46,30" stroke="${O}" stroke-width="4" fill="none"/><rect x="28" y="38" width="8" height="12" fill="#ffc300" ${S}/><rect x="18" y="50" width="28" height="8" rx="3" fill="#8d5524" ${S}/>`),
};
