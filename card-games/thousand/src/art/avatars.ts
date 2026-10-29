import type Phaser from 'phaser';
import { faceFromSeed, renderAvatar, type Emotion, type FaceParams } from './faces';

/** Texture key of a face with an emotion, generated on demand. */
export function faceTex(textures: Phaser.Textures.TextureManager, key: string, p: FaceParams, emo: Emotion = 'neutral'): string {
  const k = `face_${key}_${emo}`;
  if (!textures.exists(k)) textures.addCanvas(k, renderAvatar(p, emo, 220));
  return k;
}

/** The 12 avatars the player can choose from (passengers of the express). */
export const PLAYER_FACES: FaceParams[] = Array.from({ length: 12 }, (_, i) => {
  const f = faceFromSeed(5100 + i * 41, i % 2 === 1);
  if (i === 0) return { ...f, hat: 9, hatColor: '#c92a2a', bg: '#e7dcc4' };
  if (i === 3) return { ...f, hat: 4 };
  return f;
});
