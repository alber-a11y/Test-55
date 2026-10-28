import { darken, lighten, makeCanvas, starPath, type Ctx } from '@shared/cards/draw';
import { Rng } from '@shared/core/rng';

/** Procedural cartoon faces for opponents and the player (emotions animate reactions). */
export interface FaceParams {
  skin: string;
  hair: string;
  /** 0 bald, 1 short, 2 long, 3 bun, 4 curly, 5 spiky */
  hairStyle: number;
  /** 0 none, 1 cap, 2 ushanka, 3 beret, 4 captain, 5 kerchief, 6 crown, 7 top hat, 8 bandana */
  hat: number;
  hatColor: string;
  /** 0 none, 1 mustache, 2 beard, 3 stubble */
  beard: number;
  /** 0 none, 1 round, 2 sunglasses */
  glasses: number;
  shirt: string;
  bg: string;
  old: boolean;
  female: boolean;
}

export type Emotion = 'neutral' | 'happy' | 'angry' | 'sad' | 'smug' | 'surprised';
export const EMOTIONS: Emotion[] = ['neutral', 'happy', 'angry', 'sad', 'smug', 'surprised'];

const SKINS = ['#f6d7b8', '#eec39a', '#d9a066', '#b97a4c', '#8d5a3a', '#f2c6a0'];
const HAIRS = ['#2b1d14', '#5a3a22', '#8a5a2b', '#c98c3a', '#e8d27a', '#9aa0a8', '#e9e9e9', '#a83a2a'];
const CLOTH = ['#3b5bdb', '#e03131', '#2f9e44', '#f08c00', '#7048e8', '#495057', '#0c8599', '#c2255c', '#5c940d'];
const BGS = ['#ffd8a8', '#c5f6fa', '#d3f9d8', '#e5dbff', '#ffe3e3', '#fff3bf', '#d0ebff', '#f3d9fa'];

export function faceFromSeed(seed: number, female?: boolean): FaceParams {
  const r = new Rng(seed * 2654435761 + 7);
  const fem = female ?? r.chance(0.4);
  const old = r.chance(0.3);
  return {
    skin: r.pick(SKINS),
    hair: old ? r.pick(['#9aa0a8', '#e9e9e9', '#5a3a22']) : r.pick(HAIRS),
    hairStyle: fem ? r.pick([2, 3, 4]) : r.pick([0, 1, 1, 4, 5]),
    hat: r.chance(0.45) ? r.pick(fem ? [5, 3, 8] : [1, 2, 3, 8, 7]) : 0,
    hatColor: r.pick(CLOTH),
    beard: fem ? 0 : r.pick([0, 0, 1, 2, 3]),
    glasses: r.chance(0.25) ? r.pick([1, 2]) : 0,
    shirt: r.pick(CLOTH),
    bg: r.pick(BGS),
    old,
    female: fem,
  };
}

function ell(c: Ctx, x: number, y: number, rx: number, ry: number, col: string): void {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

export function renderAvatar(p: FaceParams, emo: Emotion = 'neutral', size = 200, ring = '#1a1426'): HTMLCanvasElement {
  const [cv, c] = makeCanvas(size, size);
  const s = size / 200;
  c.save();
  c.scale(s, s);
  // Background disc
  c.save();
  c.beginPath();
  c.arc(100, 100, 96, 0, Math.PI * 2);
  c.fillStyle = p.bg;
  c.fill();
  c.clip();
  // Shoulders
  ell(c, 100, 205, 80, 55, p.shirt);
  c.fillStyle = darken(p.shirt, 0.15);
  c.beginPath();
  c.moveTo(80, 158);
  c.lineTo(100, 185);
  c.lineTo(120, 158);
  c.fill();
  // Neck
  c.fillStyle = darken(p.skin, 0.1);
  c.fillRect(86, 130, 28, 30);
  // Long hair behind
  if (p.hairStyle === 2 && p.hat !== 2) {
    c.fillStyle = p.hair;
    c.beginPath();
    c.ellipse(100, 112, 58, 66, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Ears
  ell(c, 52, 100, 10, 14, darken(p.skin, 0.05));
  ell(c, 148, 100, 10, 14, darken(p.skin, 0.05));
  if (p.female) {
    ell(c, 52, 116, 4, 4, '#ffd43b');
    ell(c, 148, 116, 4, 4, '#ffd43b');
  }
  // Head
  ell(c, 100, 96, 48, 56, p.skin);
  // Hair on top
  c.fillStyle = p.hair;
  if (p.hairStyle === 1) {
    c.beginPath();
    c.ellipse(100, 62, 48, 26, 0, Math.PI, Math.PI * 2);
    c.fill();
  } else if (p.hairStyle === 2 || p.hairStyle === 3) {
    c.beginPath();
    c.ellipse(100, 64, 50, 30, 0, Math.PI, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(56, 66);
    c.quadraticCurveTo(80, 80, 104, 52);
    c.quadraticCurveTo(120, 78, 146, 70);
    c.lineTo(146, 60);
    c.lineTo(56, 56);
    c.fill();
    if (p.hairStyle === 3) ell(c, 100, 32, 20, 16, p.hair);
  } else if (p.hairStyle === 4) {
    for (let i = 0; i < 9; i++) ell(c, 58 + i * 10.5, 52 + Math.abs(4 - i) * 2.5, 12, 12, p.hair);
  } else if (p.hairStyle === 5) {
    c.beginPath();
    c.moveTo(56, 70);
    for (let i = 0; i <= 8; i++) c.lineTo(56 + i * 11, i % 2 ? 30 : 56);
    c.lineTo(146, 70);
    c.fill();
  }
  if (p.old) {
    c.strokeStyle = darken(p.skin, 0.25);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(80, 70);
    c.lineTo(96, 68);
    c.moveTo(104, 68);
    c.lineTo(120, 70);
    c.stroke();
  }
  // Eyes + brows by emotion
  const eyeY = 94;
  const browTilt = emo === 'angry' ? 6 : emo === 'sad' ? -5 : emo === 'surprised' ? -2 : 0;
  const browY = emo === 'surprised' ? 72 : 78;
  c.strokeStyle = darken(p.hair, 0.2);
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(70, browY - browTilt);
  c.lineTo(90, browY + browTilt);
  c.moveTo(110, browY + browTilt);
  c.lineTo(130, browY - browTilt);
  c.stroke();
  if (emo === 'happy' || emo === 'smug') {
    c.strokeStyle = '#2b2b38';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(80, eyeY + 4, 8, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    if (emo === 'happy') {
      c.beginPath();
      c.arc(120, eyeY + 4, 8, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    } else {
      ell(c, 120, eyeY, 8, 9, '#ffffff');
      ell(c, 122, eyeY + 1, 4.5, 5, '#2b2b38');
    }
  } else {
    const er = emo === 'surprised' ? 11 : 9;
    ell(c, 80, eyeY, er - 1, er, '#ffffff');
    ell(c, 120, eyeY, er - 1, er, '#ffffff');
    const py = emo === 'sad' ? 3 : 1;
    ell(c, 81, eyeY + py, 4.5, 5, '#2b2b38');
    ell(c, 121, eyeY + py, 4.5, 5, '#2b2b38');
  }
  // Glasses
  if (p.glasses) {
    c.strokeStyle = '#1a1426';
    c.lineWidth = 3.5;
    if (p.glasses === 2) {
      c.fillStyle = 'rgba(20,20,30,0.85)';
      c.beginPath();
      c.roundRect?.(64, 84, 32, 22, 6);
      c.roundRect?.(104, 84, 32, 22, 6);
      c.fill();
    } else {
      c.beginPath();
      c.arc(80, eyeY, 14, 0, Math.PI * 2);
      c.moveTo(134, eyeY);
      c.arc(120, eyeY, 14, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(94, eyeY - 2);
    c.lineTo(106, eyeY - 2);
    c.stroke();
  }
  // Nose
  c.fillStyle = darken(p.skin, 0.12);
  c.beginPath();
  c.ellipse(100, 112, 7, 9, 0, 0, Math.PI * 2);
  c.fill();
  // Cheeks
  c.fillStyle = 'rgba(240,110,110,0.3)';
  ell(c, 70, 118, 9, 6, 'rgba(240,110,110,0.3)');
  ell(c, 130, 118, 9, 6, 'rgba(240,110,110,0.3)');
  // Beard under the mouth
  if (p.beard === 2) {
    c.fillStyle = p.hair;
    c.beginPath();
    c.moveTo(56, 104);
    c.quadraticCurveTo(60, 162, 100, 168);
    c.quadraticCurveTo(140, 162, 144, 104);
    c.quadraticCurveTo(122, 132, 100, 130);
    c.quadraticCurveTo(78, 132, 56, 104);
    c.fill();
  } else if (p.beard === 3) {
    c.fillStyle = 'rgba(60,40,30,0.25)';
    c.beginPath();
    c.ellipse(100, 136, 34, 18, 0, 0, Math.PI);
    c.fill();
  }
  // Mouth
  c.strokeStyle = '#7a2b2b';
  c.fillStyle = '#7a2b2b';
  c.lineWidth = 4;
  c.beginPath();
  switch (emo) {
    case 'happy':
      c.moveTo(82, 128);
      c.quadraticCurveTo(100, 150, 118, 128);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffffff';
      c.fillRect(88, 128, 24, 5);
      break;
    case 'angry':
      c.moveTo(84, 138);
      c.quadraticCurveTo(100, 128, 116, 138);
      c.stroke();
      break;
    case 'sad':
      c.moveTo(86, 140);
      c.quadraticCurveTo(100, 130, 114, 140);
      c.stroke();
      break;
    case 'smug':
      c.moveTo(86, 132);
      c.quadraticCurveTo(104, 138, 118, 126);
      c.stroke();
      break;
    case 'surprised':
      ell(c, 100, 136, 8, 10, '#7a2b2b');
      break;
    default:
      c.moveTo(86, 132);
      c.quadraticCurveTo(100, 140, 114, 132);
      c.stroke();
  }
  if (p.female) {
    c.strokeStyle = '#e64980';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(88, 133);
    c.quadraticCurveTo(100, 138, 112, 133);
    c.stroke();
  }
  if (p.beard === 1) {
    c.fillStyle = p.hair;
    c.beginPath();
    c.moveTo(72, 128);
    c.quadraticCurveTo(100, 112, 128, 128);
    c.quadraticCurveTo(100, 122, 72, 128);
    c.fill();
  }
  // Hats
  const hc = p.hatColor;
  switch (p.hat) {
    case 1: // cap
      c.fillStyle = hc;
      c.beginPath();
      c.ellipse(100, 58, 50, 30, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.fillStyle = darken(hc, 0.2);
      c.beginPath();
      c.ellipse(118, 58, 40, 9, 0, 0, Math.PI * 2);
      c.fill();
      break;
    case 2: // ushanka
      c.fillStyle = '#6d4c41';
      c.beginPath();
      c.ellipse(100, 56, 56, 32, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.fillStyle = '#8d6e63';
      c.fillRect(44, 54, 112, 14);
      ell(c, 48, 92, 12, 26, '#8d6e63');
      ell(c, 152, 92, 12, 26, '#8d6e63');
      starPath(c, 100, 42, 9);
      c.fillStyle = '#e03131';
      c.fill();
      break;
    case 3: // beret
      ell(c, 92, 50, 52, 18, hc);
      ell(c, 92, 34, 6, 6, darken(hc, 0.2));
      break;
    case 4: // captain
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.ellipse(100, 46, 54, 20, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1c2a4a';
      c.fillRect(54, 48, 92, 14);
      c.fillStyle = '#ffd43b';
      ell(c, 100, 48, 9, 7, '#ffd43b');
      c.fillStyle = '#111';
      c.beginPath();
      c.ellipse(100, 64, 44, 7, 0, 0, Math.PI);
      c.fill();
      break;
    case 5: // kerchief
      c.fillStyle = hc;
      c.beginPath();
      c.moveTo(46, 100);
      c.quadraticCurveTo(48, 30, 100, 30);
      c.quadraticCurveTo(152, 30, 154, 100);
      c.quadraticCurveTo(100, 60, 46, 100);
      c.fill();
      c.fillStyle = lighten(hc, 0.5);
      for (let i = 0; i < 6; i++) ell(c, 70 + i * 12, 46 + (i % 2) * 8, 3, 3, lighten(hc, 0.5));
      break;
    case 6: // crown
      c.fillStyle = '#ffc531';
      c.beginPath();
      c.moveTo(60, 56);
      c.lineTo(56, 22);
      c.lineTo(78, 40);
      c.lineTo(100, 14);
      c.lineTo(122, 40);
      c.lineTo(144, 22);
      c.lineTo(140, 56);
      c.closePath();
      c.fill();
      ell(c, 100, 44, 6, 6, '#e03131');
      break;
    case 7: // top hat
      c.fillStyle = '#212529';
      c.fillRect(66, 10, 68, 44);
      c.beginPath();
      c.ellipse(100, 54, 54, 10, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hc;
      c.fillRect(66, 40, 68, 8);
      break;
    case 8: // bandana
      c.fillStyle = hc;
      c.beginPath();
      c.ellipse(100, 60, 50, 24, 0, Math.PI, Math.PI * 2);
      c.fill();
      c.fillRect(50, 56, 100, 10);
      for (let i = 0; i < 5; i++) ell(c, 68 + i * 16, 50, 3, 3, '#ffffff');
      break;
  }
  c.restore();
  c.lineWidth = 7;
  c.strokeStyle = ring;
  c.beginPath();
  c.arc(100, 100, 96, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  return cv;
}
