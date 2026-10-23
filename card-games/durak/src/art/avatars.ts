import type Phaser from 'phaser';
import { renderAvatar, faceFromSeed, type Emotion, type FaceParams } from './faces';

/** Texture key of a face with an emotion, generated on demand. */
export function faceTex(textures: Phaser.Textures.TextureManager, key: string, p: FaceParams, emo: Emotion = 'neutral'): string {
  const k = `face_${key}_${emo}`;
  if (!textures.exists(k)) textures.addCanvas(k, renderAvatar(p, emo, 220));
  return k;
}

/** The 12 avatars the player can choose from. */
export const PLAYER_FACES: FaceParams[] = Array.from({ length: 12 }, (_, i) => faceFromSeed(9000 + i * 37, i % 2 === 1));
