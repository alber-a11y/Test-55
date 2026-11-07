import type { IconFn } from '../svg';
import { animals } from './animals';
import { garden } from './garden';
import { holiday } from './holiday';
import { sea } from './sea';
import { space } from './space';
import { sweets } from './sweets';

export const ICON_SETS: Record<string, IconFn[]> = {
  icons_garden: garden,
  icons_sweets: sweets,
  icons_sea: sea,
  icons_animals: animals,
  icons_holiday: holiday,
  icons_space: space,
};
