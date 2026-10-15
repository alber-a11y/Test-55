import type { EnemyDef } from './types';

export const ENEMIES: EnemyDef[] = [
  {
    id: 'grunt', hp: 1700, speed: 175, radius: 24, ai: 'rusher', prefRange: 1, coin: 2, minLevel: 1,
    attack: { kind: 'melee', dmg: 420, range: 1.3, spread: 1.4, reload: 1.0, sfx: 'slash', charge: 0 },
    look: { body: '#ef476f', dark: '#9d0208', eye: '#ffd166', shape: 'round', gear: 'fists' },
  },
  {
    id: 'shooter', hp: 1800, speed: 150, radius: 24, ai: 'gunner', prefRange: 5, coin: 2, minLevel: 1,
    attack: { kind: 'shot', dmg: 460, range: 6.5, speed: 760, reload: 1.7, sfx: 'shoot', proj: 'e_bullet', charge: 0 },
    look: { body: '#4895ef', dark: '#1d3557', eye: '#f1faee', shape: 'box', gear: 'blaster' },
  },
  {
    id: 'bomber', hp: 1500, speed: 140, radius: 24, ai: 'artillery', prefRange: 5.5, coin: 3, minLevel: 3,
    attack: { kind: 'lob', dmg: 650, range: 6.5, radius: 1.0, reload: 2.3, sfx: 'throw', proj: 'e_bomb', charge: 0 },
    look: { body: '#f4a261', dark: '#9c6644', eye: '#264653', shape: 'tall', gear: 'bomb' },
  },
  {
    id: 'kamikaze', hp: 900, speed: 240, radius: 22, ai: 'kamikaze', prefRange: 0.9, coin: 2, minLevel: 5,
    attack: { kind: 'slam', dmg: 1250, range: 0.2, radius: 1.5, reload: 1, sfx: 'explosion', charge: 0 },
    look: { body: '#ffd166', dark: '#e76f51', eye: '#d00000', shape: 'spike', gear: 'fuse' },
  },
  {
    id: 'sniper', hp: 1300, speed: 130, radius: 24, ai: 'sniper', prefRange: 8, coin: 3, minLevel: 7,
    attack: { kind: 'shot', dmg: 1150, range: 10.5, speed: 1450, reload: 2.9, sfx: 'laser', proj: 'e_laser', charge: 0 },
    look: { body: '#6a994e', dark: '#386641', eye: '#ff006e', shape: 'tall', gear: 'scope' },
  },
  {
    id: 'medic', hp: 1700, speed: 150, radius: 24, ai: 'support', prefRange: 5, coin: 3, minLevel: 9,
    attack: { kind: 'shot', dmg: 320, range: 5.5, speed: 700, reload: 1.6, sfx: 'shoot', proj: 'e_bullet', charge: 0 },
    look: { body: '#f1faee', dark: '#e63946', eye: '#1d3557', shape: 'round', gear: 'cross' },
  },
  {
    id: 'brute', hp: 4300, speed: 120, radius: 30, ai: 'rusher', prefRange: 2.5, coin: 4, minLevel: 11,
    attack: { kind: 'spread', dmg: 360, range: 3.6, speed: 820, count: 3, spread: 0.45, reload: 1.6, sfx: 'shotgun', proj: 'e_bullet', charge: 0 },
    look: { body: '#7f5539', dark: '#432818', eye: '#ffba08', shape: 'box', gear: 'shield' },
  },
  {
    id: 'summoner', hp: 2200, speed: 130, radius: 26, ai: 'summoner', prefRange: 6, coin: 4, minLevel: 13,
    attack: { kind: 'shot', dmg: 360, range: 6.5, speed: 720, reload: 1.9, sfx: 'shoot', proj: 'e_orb', charge: 0 },
    look: { body: '#9b5de5', dark: '#5a189a', eye: '#00f5d4', shape: 'blob', gear: 'staff' },
  },
  {
    id: 'mini', hp: 600, speed: 215, radius: 17, ai: 'rusher', prefRange: 1, coin: 0, minLevel: 999,
    attack: { kind: 'melee', dmg: 240, range: 1.0, spread: 1.4, reload: 0.9, sfx: 'slash', charge: 0 },
    look: { body: '#c77dff', dark: '#7b2cbf', eye: '#ffffff', shape: 'blob', gear: 'none' },
  },
  {
    id: 'drone', hp: 900, speed: 190, radius: 20, ai: 'gunner', prefRange: 4, coin: 0, minLevel: 999,
    attack: { kind: 'shot', dmg: 280, range: 5.5, speed: 800, reload: 1.3, sfx: 'shoot', proj: 'e_bullet', charge: 0 },
    look: { body: '#adb5bd', dark: '#495057', eye: '#ff006e', shape: 'drone', gear: 'none' },
  },
  {
    id: 'slimelet', hp: 1400, speed: 160, radius: 24, ai: 'rusher', prefRange: 1, coin: 1, minLevel: 999,
    attack: { kind: 'melee', dmg: 350, range: 1.2, spread: 1.4, reload: 1.0, sfx: 'hit', charge: 0 },
    look: { body: '#70e000', dark: '#38b000', eye: '#003049', shape: 'blob', gear: 'none' },
  },
];

export const enemyById = (id: string): EnemyDef => ENEMIES.find((e) => e.id === id) ?? ENEMIES[0];

export const BOSS_IDS = ['golem', 'wasp', 'mech', 'pyro', 'phantom', 'slime'] as const;
export type BossId = (typeof BOSS_IDS)[number];

export interface BossDef {
  id: BossId;
  hp: number;
  speed: number;
  radius: number;
  contact: number;
}

export const BOSSES: Record<BossId, BossDef> = {
  golem: { id: 'golem', hp: 19000, speed: 105, radius: 58, contact: 500 },
  wasp: { id: 'wasp', hp: 15000, speed: 170, radius: 50, contact: 400 },
  mech: { id: 'mech', hp: 17000, speed: 115, radius: 56, contact: 400 },
  pyro: { id: 'pyro', hp: 16000, speed: 130, radius: 50, contact: 450 },
  phantom: { id: 'phantom', hp: 14500, speed: 150, radius: 48, contact: 400 },
  slime: { id: 'slime', hp: 21000, speed: 95, radius: 62, contact: 550 },
};
