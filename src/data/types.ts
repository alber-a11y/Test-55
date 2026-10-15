export const TILE = 64;

export type AttackKind = 'spread' | 'shot' | 'lob' | 'wave' | 'chain' | 'melee' | 'burst' | 'flame' | 'slam' | 'twin';
export type SuperKind = 'charge' | 'beam' | 'megabomb' | 'healzone' | 'stunfield' | 'dash' | 'turret' | 'firewall' | 'quake' | 'stealth';

export interface AttackSpec {
  kind: AttackKind;
  dmg: number;
  /** Range in tiles. */
  range: number;
  /** Projectile speed, px/s. */
  speed?: number;
  count?: number;
  /** Total spread angle, radians. */
  spread?: number;
  /** AoE radius in tiles. */
  radius?: number;
  /** Seconds to reload one ammo bar. */
  reload: number;
  pierce?: boolean;
  burn?: number;
  stun?: number;
  slow?: number;
  /** Heal self per hit. */
  lifesteal?: number;
  proj?: string;
  sfx: string;
  /** Super charge gained per hit (0..1). */
  charge: number;
}

export interface SuperSpec {
  kind: SuperKind;
  dmg: number;
  range: number;
  radius?: number;
  duration?: number;
  stun?: number;
  /** Is super aimed (joystick) or instantly cast on self. */
  aimed: boolean;
}

export type UnlockRule = { type: 'start' } | { type: 'coins'; price: number } | { type: 'ads'; count: number } | { type: 'level'; level: number };

export interface HeroDef {
  id: string;
  role: string;
  hp: number;
  speed: number;
  attack: AttackSpec;
  super: SuperSpec;
  unlock: UnlockRule;
  /** Art description used by the SVG builder. */
  look: CharLook;
}

export interface CharLook {
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
  hairStyle: 'spiky' | 'pony' | 'bob' | 'mohawk' | 'bald' | 'long' | 'bun' | 'cap';
  headgear?: 'helmet' | 'goggles' | 'hood' | 'bandana' | 'beanie' | 'horns' | 'none';
  weapon: 'shotgun' | 'rifle' | 'bomb' | 'staff' | 'claws' | 'nailgun' | 'flamer' | 'hammer' | 'daggers' | 'coil';
  eyes?: 'normal' | 'angry' | 'happy' | 'visor';
  build?: 'big' | 'normal' | 'slim';
}

export interface EnemyDef {
  id: string;
  hp: number;
  speed: number;
  radius: number;
  attack: AttackSpec;
  ai: 'rusher' | 'gunner' | 'artillery' | 'kamikaze' | 'sniper' | 'support' | 'summoner' | 'turret';
  prefRange: number;
  coin: number;
  look: { body: string; dark: string; eye: string; shape: 'round' | 'box' | 'tall' | 'blob' | 'spike' | 'drone'; gear: string };
  minLevel: number;
}

export interface BiomeDef {
  id: string;
  floorA: string;
  floorB: string;
  wallTop: string;
  wallSide: string;
  wallDark: string;
  crateA: string;
  crateB: string;
  bush: string;
  bushDark: string;
  water: string;
  waterLight: string;
  bg: string;
  deco: string;
  wallStyle: 'rock' | 'brick' | 'crystal' | 'candy' | 'tomb' | 'ice' | 'neon';
  transpose: number;
}
