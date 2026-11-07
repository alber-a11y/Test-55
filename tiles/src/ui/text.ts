import type Phaser from 'phaser';

export const FONT = 'Nunito, "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';

export interface TextOpts {
  color?: string;
  stroke?: string;
  strokeW?: number;
  shadow?: boolean;
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  weight?: '700' | '800' | '900';
  originX?: number;
  originY?: number;
  lineSpacing?: number;
}

/** Chunky casual-game label: heavy rounded font, outline, soft drop shadow. */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, o: TextOpts = {}): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontStyle: o.weight ?? '900',
    fontSize: `${size}px`,
    color: o.color ?? '#ffffff',
    stroke: o.stroke ?? '#1f4f80',
    strokeThickness: o.strokeW ?? (o.stroke === 'none' ? 0 : Math.max(2, Math.round(size * 0.16))),
    align: o.align ?? 'center',
    lineSpacing: o.lineSpacing ?? 0,
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    padding: { x: 6, y: 4 },
  });
  if (o.shadow !== false && o.stroke !== 'none') t.setShadow(0, Math.max(2, size * 0.07), 'rgba(0,0,0,.28)', 0, true, false);
  t.setOrigin(o.originX ?? 0.5, o.originY ?? 0.5);
  return t;
}

/** Plain readable text for panels (dark on light, no outline). */
export function plain(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string, o: TextOpts = {}): Phaser.GameObjects.Text {
  return label(scene, x, y, text, size, { ...o, color, stroke: 'none', strokeW: 0, shadow: false, weight: o.weight ?? '800' });
}
