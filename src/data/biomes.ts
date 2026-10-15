import type { BiomeDef } from './types';

export const BIOMES: BiomeDef[] = [
  {
    id: 'desert', floorA: '#e9c46a', floorB: '#e2b95c', wallTop: '#e07a5f', wallSide: '#b5543e', wallDark: '#7f3524',
    crateA: '#d4a373', crateB: '#a47148', bush: '#f4a259', bushDark: '#c96f2b', water: '#3d8bd4', waterLight: '#8ecae6',
    bg: '#c98a3d', deco: '#cfa25a', wallStyle: 'rock', transpose: 0,
  },
  {
    id: 'forest', floorA: '#8bc34a', floorB: '#7fb53f', wallTop: '#a8b2c1', wallSide: '#76839a', wallDark: '#4a5568',
    crateA: '#e9a464', crateB: '#b5713a', bush: '#2e9e4a', bushDark: '#1b6e31', water: '#3a9bdc', waterLight: '#9bdcff',
    bg: '#4c7a2b', deco: '#9bd35a', wallStyle: 'brick', transpose: 2,
  },
  {
    id: 'mine', floorA: '#8a6676', floorB: '#7e5b6b', wallTop: '#f4a259', wallSide: '#c9733a', wallDark: '#7f4525',
    crateA: '#7a6f8a', crateB: '#544a66', bush: '#f2b134', bushDark: '#c88a12', water: '#4a3b6b', waterLight: '#7d6aa8',
    bg: '#3f2a3a', deco: '#6f4f5f', wallStyle: 'crystal', transpose: -2,
  },
  {
    id: 'candy', floorA: '#ffc8dd', floorB: '#f9b9d0', wallTop: '#ff70a6', wallSide: '#d6457f', wallDark: '#9b2c5a',
    crateA: '#fff3b0', crateB: '#e0c060', bush: '#7ae5c3', bushDark: '#3fb594', water: '#8b5a2b', waterLight: '#c08552',
    bg: '#c86b98', deco: '#ffdeeb', wallStyle: 'candy', transpose: 5,
  },
  {
    id: 'haunted', floorA: '#465a6b', floorB: '#3f5262', wallTop: '#aab4c0', wallSide: '#7b8794', wallDark: '#4b5563',
    crateA: '#8d6e63', crateB: '#5d4037', bush: '#7b2cbf', bushDark: '#4c1a7a', water: '#2b9348', waterLight: '#80ed99',
    bg: '#1f2a33', deco: '#576b7c', wallStyle: 'tomb', transpose: -3,
  },
  {
    id: 'ice', floorA: '#dcefff', floorB: '#cfe6fa', wallTop: '#a9dcff', wallSide: '#6fb1e0', wallDark: '#3d7cb0',
    crateA: '#bfa58a', crateB: '#8a7158', bush: '#2d8a6e', bushDark: '#1b5e4a', water: '#2a6fb5', waterLight: '#7cc4ff',
    bg: '#8fb8de', deco: '#ffffff', wallStyle: 'ice', transpose: 3,
  },
  {
    id: 'neon', floorA: '#28244f', floorB: '#221f45', wallTop: '#f72585', wallSide: '#7209b7', wallDark: '#3a0ca3',
    crateA: '#4361ee', crateB: '#3a0ca3', bush: '#4cc9f0', bushDark: '#277da1', water: '#00b4a6', waterLight: '#72efdd',
    bg: '#110f26', deco: '#3a3570', wallStyle: 'neon', transpose: 1,
  },
];

export const biomeForLevel = (level: number): BiomeDef => BIOMES[Math.floor((level - 1) / 5) % BIOMES.length];
