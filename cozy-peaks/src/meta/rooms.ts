import type { L10n } from './types';

/**
 * Rooms of the house. Scene coordinates are in a 1600×1000 box (see art/rooms):
 * landscape shows nearly all of it, portrait shows a vertical slice and lets the player pan.
 */
export interface TaskDef {
  id: string;
  name: L10n;
  /** Stars needed. */
  cost: number;
  /** Hotspot position in scene coordinates. */
  at: { x: number; y: number };
  /** Variant names; the last one is the premium (rewarded / shop) variant. */
  variants: L10n[];
}

export interface BonusDef {
  id: string;
  name: L10n;
  at: { x: number; y: number };
  /** Rewarded views needed (progress is kept), or a coin price when `coins` is set. */
  ads?: number;
  coins?: number;
}

export interface RoomDef {
  id: string;
  name: L10n;
  makeover: L10n;
  tasks: TaskDef[];
  /** Number of completed tasks that closes each of the three stages. */
  stages: [number, number, number];
  bonus: BonusDef[];
}

const v = (ru: string, en: string): L10n => ({ ru, en });
export const PREMIUM_VARIANT = 3;

export const ROOMS: RoomDef[] = [
  {
    id: 'garden',
    name: v('Сад', 'Garden'),
    makeover: v('Преображение сада', 'Garden Makeover'),
    stages: [3, 6, 8],
    tasks: [
      { id: 'path', name: v('Дорожка', 'Path'), cost: 2, at: { x: 900, y: 740 }, variants: [v('Камень', 'Stone'), v('Кирпич', 'Brick'), v('Плитка', 'Tiles'), v('Мрамор', 'Marble')] },
      { id: 'bench', name: v('Скамейка', 'Bench'), cost: 2, at: { x: 1270, y: 640 }, variants: [v('Дубовая', 'Oak'), v('Белая', 'White'), v('Кованая', 'Iron'), v('Королевская', 'Royal')] },
      { id: 'flowers', name: v('Клумбы', 'Flower beds'), cost: 3, at: { x: 330, y: 800 }, variants: [v('Розы', 'Roses'), v('Лаванда', 'Lavender'), v('Ромашки', 'Daisies'), v('Радуга', 'Rainbow')] },
      { id: 'fountain', name: v('Фонтан', 'Fountain'), cost: 3, at: { x: 1120, y: 420 }, variants: [v('Каменный', 'Stone'), v('Мраморный', 'Marble'), v('Медный', 'Copper'), v('Золотой', 'Golden')] },
      { id: 'lamps', name: v('Фонари', 'Lanterns'), cost: 4, at: { x: 960, y: 560 }, variants: [v('Чёрные', 'Black'), v('Бронза', 'Bronze'), v('Белые', 'White'), v('Хрустальные', 'Crystal')] },
      { id: 'arch', name: v('Арка', 'Arch'), cost: 4, at: { x: 520, y: 330 }, variants: [v('Розовая', 'Rose'), v('Белая', 'White'), v('Глициния', 'Wisteria'), v('Сказочная', 'Fairy')] },
      { id: 'fence', name: v('Забор', 'Fence'), cost: 5, at: { x: 780, y: 360 }, variants: [v('Решётка', 'Lattice'), v('Штакетник', 'Picket'), v('Живая изгородь', 'Hedge'), v('Резной', 'Carved')] },
      { id: 'lights', name: v('Гирлянда', 'String lights'), cost: 5, at: { x: 1330, y: 250 }, variants: [v('Тёплая', 'Warm'), v('Цветная', 'Colorful'), v('Фонарики', 'Lanterns'), v('Звёзды', 'Stars')] },
    ],
    bonus: [
      { id: 'gnome', name: v('Садовый гном', 'Garden gnome'), at: { x: 640, y: 780 }, ads: 2 },
      { id: 'birdhouse', name: v('Скворечник', 'Birdhouse'), at: { x: 1470, y: 330 }, ads: 3 },
      { id: 'gardenCat', name: v('Рыжий кот', 'Ginger cat'), at: { x: 1120, y: 790 }, coins: 1500 },
    ],
  },
  {
    id: 'living',
    name: v('Гостиная', 'Living Room'),
    makeover: v('Преображение гостиной', 'Living Room Makeover'),
    stages: [3, 6, 8],
    tasks: [
      { id: 'walls', name: v('Стены', 'Walls'), cost: 3, at: { x: 560, y: 200 }, variants: [v('Шалфей', 'Sage'), v('Персик', 'Peach'), v('Небо', 'Sky'), v('Дамаск', 'Damask')] },
      { id: 'sofa', name: v('Диван', 'Sofa'), cost: 3, at: { x: 800, y: 600 }, variants: [v('Бежевый', 'Beige'), v('Синий', 'Blue'), v('Зелёный', 'Green'), v('Бархат', 'Velvet')] },
      { id: 'rug', name: v('Ковёр', 'Rug'), cost: 3, at: { x: 760, y: 860 }, variants: [v('Восточный', 'Oriental'), v('Полосатый', 'Striped'), v('Круглый', 'Round'), v('Шёлковый', 'Silk')] },
      { id: 'table', name: v('Столик', 'Table'), cost: 4, at: { x: 1130, y: 760 }, variants: [v('Орех', 'Walnut'), v('Белый', 'White'), v('Стекло', 'Glass'), v('Мрамор', 'Marble')] },
      { id: 'lamp', name: v('Торшер', 'Floor lamp'), cost: 4, at: { x: 1090, y: 360 }, variants: [v('Классика', 'Classic'), v('Латунь', 'Brass'), v('Ротанг', 'Rattan'), v('Тиффани', 'Tiffany')] },
      { id: 'curtains', name: v('Шторы', 'Curtains'), cost: 4, at: { x: 1380, y: 260 }, variants: [v('Льняные', 'Linen'), v('Розовые', 'Rose'), v('Бирюза', 'Teal'), v('Королевские', 'Royal')] },
      { id: 'art', name: v('Картины', 'Wall art'), cost: 5, at: { x: 790, y: 250 }, variants: [v('Пейзаж', 'Landscape'), v('Море', 'Seascape'), v('Цветы', 'Flowers'), v('Шедевр', 'Masterpiece')] },
      { id: 'shelf', name: v('Стеллаж', 'Bookcase'), cost: 5, at: { x: 300, y: 420 }, variants: [v('Дерево', 'Wood'), v('Белый', 'White'), v('Тёмный', 'Dark'), v('Антиквариат', 'Antique')] },
    ],
    bonus: [
      { id: 'livingCat', name: v('Котик на подушке', 'Cat on a cushion'), at: { x: 520, y: 820 }, ads: 2 },
      { id: 'aquarium', name: v('Аквариум', 'Aquarium'), at: { x: 1490, y: 690 }, ads: 3 },
      { id: 'guitar', name: v('Гитара', 'Guitar'), at: { x: 150, y: 680 }, coins: 1800 },
    ],
  },
  {
    id: 'bedroom',
    name: v('Спальня', 'Bedroom'),
    makeover: v('Преображение спальни', 'Bedroom Makeover'),
    stages: [3, 6, 8],
    tasks: [
      { id: 'walls', name: v('Стены', 'Walls'), cost: 3, at: { x: 560, y: 200 }, variants: [v('Лаванда', 'Lavender'), v('Крем', 'Cream'), v('Мята', 'Mint'), v('Розы', 'Roses')] },
      { id: 'bed', name: v('Кровать', 'Bed'), cost: 4, at: { x: 800, y: 600 }, variants: [v('Розовая', 'Pink'), v('Голубая', 'Blue'), v('Белая', 'White'), v('Принцесса', 'Princess')] },
      { id: 'rug', name: v('Ковёр', 'Rug'), cost: 3, at: { x: 800, y: 900 }, variants: [v('Пушистый', 'Fluffy'), v('Плетёный', 'Woven'), v('Узорный', 'Patterned'), v('Звёздный', 'Starry')] },
      { id: 'lamp', name: v('Ночник', 'Bedside lamp'), cost: 4, at: { x: 1150, y: 520 }, variants: [v('Классика', 'Classic'), v('Шар', 'Globe'), v('Тюльпан', 'Tulip'), v('Кружево', 'Lace')] },
      { id: 'curtains', name: v('Шторы', 'Curtains'), cost: 4, at: { x: 1380, y: 260 }, variants: [v('Кремовые', 'Cream'), v('Розовые', 'Pink'), v('Синие', 'Navy'), v('Шёлк', 'Silk')] },
      { id: 'wardrobe', name: v('Шкаф', 'Wardrobe'), cost: 5, at: { x: 290, y: 430 }, variants: [v('Дуб', 'Oak'), v('Белый', 'White'), v('Мятный', 'Mint'), v('Резной', 'Carved')] },
      { id: 'painting', name: v('Картина', 'Painting'), cost: 5, at: { x: 800, y: 230 }, variants: [v('Пионы', 'Peonies'), v('Горы', 'Mountains'), v('Луна', 'Moon'), v('Портрет', 'Portrait')] },
      { id: 'chandelier', name: v('Люстра', 'Chandelier'), cost: 6, at: { x: 800, y: 110 }, variants: [v('Фонарь', 'Lantern'), v('Плафон', 'Dome'), v('Цветок', 'Flower'), v('Хрусталь', 'Crystal')] },
    ],
    bonus: [
      { id: 'teddy', name: v('Мишка', 'Teddy bear'), at: { x: 640, y: 560 }, ads: 2 },
      { id: 'puppy', name: v('Щенок в лежанке', 'Puppy bed'), at: { x: 1260, y: 870 }, ads: 3 },
      { id: 'plant', name: v('Монстера', 'Monstera'), at: { x: 520, y: 760 }, coins: 1200 },
    ],
  },
];

export const roomById = (id: string): RoomDef => ROOMS.find((r) => r.id === id) ?? ROOMS[0];
