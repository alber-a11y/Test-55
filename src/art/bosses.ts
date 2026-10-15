import { OUTLINE as O } from './color';

const S = `stroke="${O}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
const wrap = (b: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">${b}</svg>`;

const angryEyes = (y: number, c: string, dx = 0) => `
  <circle cx="${78 + dx}" cy="${y}" r="13" fill="${c}" ${S}/><circle cx="${122 + dx}" cy="${y}" r="13" fill="${c}" ${S}/>
  <circle cx="${81 + dx}" cy="${y + 1}" r="5" fill="${O}"/><circle cx="${125 + dx}" cy="${y + 1}" r="5" fill="${O}"/>
  <path d="M60,${y - 22} L92,${y - 10} M140,${y - 22} L108,${y - 10}" stroke="${O}" stroke-width="8" stroke-linecap="round"/>`;

export const BOSS_SVG: Record<string, string> = {
  golem: wrap(`
    <ellipse cx="44" cy="120" rx="30" ry="40" fill="#7d8597" ${S}/><ellipse cx="156" cy="120" rx="30" ry="40" fill="#7d8597" ${S}/>
    <circle cx="36" cy="160" r="22" fill="#5c677d" ${S}/><circle cx="164" cy="160" r="22" fill="#5c677d" ${S}/>
    <rect x="66" y="160" width="26" height="30" rx="8" fill="#5c677d" ${S}/><rect x="108" y="160" width="26" height="30" rx="8" fill="#5c677d" ${S}/>
    <path d="M40,90 Q36,30 100,22 Q164,30 160,90 L150,168 Q100,182 50,168 Z" fill="#979dac" ${S}/>
    <path d="M60,40 Q80,28 104,30 L96,48 Q76,44 60,52 Z" fill="#80b918"/>
    <path d="M118,32 Q142,36 150,56 L136,52 Z" fill="#80b918"/>
    <path d="M70,120 L86,132 L80,150 M128,110 L118,128 L132,140" stroke="#5c677d" stroke-width="5" fill="none"/>
    <rect x="70" y="98" width="60" height="20" rx="6" fill="#33415c" ${S}/>
    <path d="M78,104 L86,112 L94,104 L102,112 L110,104 L118,112 L124,104" stroke="#ffba08" stroke-width="4" fill="none"/>
    ${angryEyes(72, '#ffba08')}`),
  wasp: wrap(`
    <ellipse cx="44" cy="70" rx="40" ry="22" fill="#bde0fe" opacity="0.85" ${S} transform="rotate(-25 44 70)"/>
    <ellipse cx="156" cy="70" rx="40" ry="22" fill="#bde0fe" opacity="0.85" ${S} transform="rotate(25 156 70)"/>
    <ellipse cx="100" cy="140" rx="44" ry="50" fill="#ffd60a" ${S}/>
    <path d="M60,128 Q100,140 140,128 L144,146 Q100,158 56,146 Z M66,164 Q100,174 134,164 L124,180 Q100,188 76,180 Z" fill="#1b1530"/>
    <path d="M92,186 L100,200 L108,186 Z" fill="#1b1530"/>
    <circle cx="100" cy="76" r="42" fill="#ffd60a" ${S}/>
    <path d="M70,32 Q60,10 48,14 M130,32 Q140,10 152,14" stroke="${O}" stroke-width="5" fill="none"/>
    <circle cx="48" cy="14" r="6" fill="#ff006e"/><circle cx="152" cy="14" r="6" fill="#ff006e"/>
    <path d="M72,40 L76,18 L90,32 L100,12 L110,32 L124,18 L128,40 Z" fill="#ff006e" ${S}/>
    ${angryEyes(78, '#ff006e')}
    <path d="M86,104 L94,112 L100,104 L106,112 L114,104" stroke="${O}" stroke-width="4" fill="none"/>`),
  mech: wrap(`
    <rect x="6" y="80" width="46" height="70" rx="14" fill="#6c757d" ${S}/><rect x="0" y="140" width="38" height="22" rx="6" fill="#343a40" ${S}/>
    <rect x="148" y="80" width="46" height="70" rx="14" fill="#6c757d" ${S}/><rect x="162" y="140" width="38" height="22" rx="6" fill="#343a40" ${S}/>
    <circle cx="19" cy="151" r="6" fill="#ff006e"/><circle cx="181" cy="151" r="6" fill="#ff006e"/>
    <rect x="60" y="160" width="30" height="34" rx="8" fill="#495057" ${S}/><rect x="110" y="160" width="30" height="34" rx="8" fill="#495057" ${S}/>
    <rect x="40" y="62" width="120" height="108" rx="26" fill="#f77f00" ${S}/>
    <rect x="58" y="128" width="84" height="26" rx="8" fill="#343a40" ${S}/>
    <circle cx="74" cy="141" r="5" fill="#ffd60a"/><circle cx="100" cy="141" r="5" fill="#06d6a0"/><circle cx="126" cy="141" r="5" fill="#ff006e"/>
    <path d="M56,70 Q100,4 144,70 Z" fill="#9be7ff" opacity="0.8" ${S}/>
    <circle cx="100" cy="64" r="22" fill="#ffdbac" ${S}/>
    <path d="M88,60 L96,62 M112,60 L104,62" stroke="${O}" stroke-width="4"/>
    <rect x="84" y="56" width="32" height="10" rx="4" fill="#1b1530" opacity="0.8"/><circle cx="92" cy="61" r="3" fill="#ff006e"/><circle cx="108" cy="61" r="3" fill="#ff006e"/>
    <path d="M90,74 Q100,70 110,74" stroke="${O}" stroke-width="4" fill="none"/>
    <path d="M100,26 L100,10" stroke="${O}" stroke-width="5"/><circle cx="100" cy="8" r="7" fill="#ff006e" ${S}/>`),
  pyro: wrap(`
    <path d="M100,6 Q130,40 120,60 Q150,40 140,20 Q180,60 150,100 Z" fill="#ff7b00" opacity="0.8"/>
    <path d="M30,192 Q40,100 60,80 Q100,50 140,80 Q160,100 170,192 Z" fill="#9d0208" ${S}/>
    <path d="M80,100 L100,192 L120,100 Z" fill="#370617" opacity="0.6"/>
    <path d="M50,150 Q100,170 150,150" stroke="#ffba08" stroke-width="6" fill="none"/>
    <path d="M52,52 Q48,10 100,6 Q152,10 148,52 L150,96 Q100,110 50,96 Z" fill="#6a040f" ${S}/>
    <ellipse cx="100" cy="72" rx="34" ry="30" fill="#1b1530"/>
    <circle cx="86" cy="70" r="7" fill="#ffba08"/><circle cx="114" cy="70" r="7" fill="#ffba08"/>
    <circle cx="86" cy="70" r="3" fill="#fff"/><circle cx="114" cy="70" r="3" fill="#fff"/>
    <path d="M24,190 L40,56" stroke="${O}" stroke-width="12" stroke-linecap="round"/><path d="M24,190 L40,56" stroke="#6c584c" stroke-width="6"/>
    <path d="M40,58 Q18,30 40,8 Q38,30 56,24 Q66,46 40,58 Z" fill="#ff7b00" ${S}/><path d="M40,52 Q32,36 42,24 Q44,36 50,36 Q52,48 40,52 Z" fill="#ffee32"/>`),
  phantom: wrap(`
    <path d="M30,80 Q30,10 100,10 Q170,10 170,80 L176,190 L150,170 L126,192 L100,170 L74,192 L50,170 L24,190 Z" fill="#5a189a" ${S}/>
    <path d="M50,80 Q50,30 100,28 Q150,30 150,80 L146,150 Q100,166 54,150 Z" fill="#240046" opacity="0.8"/>
    <path d="M70,62 L92,72 L70,80 Z M130,62 L108,72 L130,80 Z" fill="#00f5d4"/>
    <path d="M78,112 Q100,128 122,112 Q100,120 78,112 Z" fill="#00f5d4" opacity="0.8"/>
    <path d="M20,120 Q0,100 10,80 M180,120 Q200,100 190,80" stroke="#c77dff" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M10,80 L4,64 L18,70 Z M190,80 L196,64 L182,70 Z" fill="#dee2e6" ${S} stroke-width="3"/>
    <circle cx="60" cy="30" r="4" fill="#c77dff" opacity="0.7"/><circle cx="150" cy="44" r="3" fill="#c77dff" opacity="0.7"/>`),
  slime: wrap(`
    <path d="M10,180 Q0,90 50,50 Q100,10 150,50 Q200,90 190,180 Q150,196 100,188 Q50,196 10,180 Z" fill="#70e000" ${S}/>
    <path d="M40,80 Q60,50 90,46" stroke="#ccff33" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.8"/>
    <circle cx="140" cy="140" r="12" fill="#38b000" opacity="0.6"/><circle cx="56" cy="150" r="8" fill="#38b000" opacity="0.6"/>
    <path d="M62,40 L68,14 L82,30 L100,8 L118,30 L132,14 L138,40 Z" fill="#ffd60a" ${S}/>
    ${angryEyes(98, '#ffffff')}
    <path d="M70,134 Q100,160 130,134 Q100,146 70,134 Z" fill="#1b1530" ${S} stroke-width="4"/>
    <path d="M118,142 L120,160" stroke="#9ef01a" stroke-width="6" stroke-linecap="round"/>`),
};
