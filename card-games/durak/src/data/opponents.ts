import type { FaceParams } from '../art/faces';

export const NAMES_M_RU = ['Вован', 'Лёха', 'Дядя Миша', 'Серёга', 'Толик', 'Профессор', 'Гоша', 'Санёк', 'Петрович', 'Жека', 'Колян', 'Борис', 'Витёк', 'Фёдор', 'Тимур', 'Артём', 'Макс', 'Стёпа', 'Игорь', 'Рустам'];
export const NAMES_F_RU = ['Тётя Валя', 'Светка', 'Маринка', 'Люся', 'Ирина', 'Оля', 'Катюша', 'Нина', 'Даша', 'Алла', 'Вика', 'Зоя', 'Таня', 'Лена', 'Юля'];
export const NAMES_M_EN = ['Vovan', 'Lyokha', 'Uncle Misha', 'Seryoga', 'Tolik', 'Professor', 'Gosha', 'Sanya', 'Petrovich', 'Zheka', 'Kolyan', 'Boris', 'Vitek', 'Fyodor', 'Timur', 'Artyom', 'Max', 'Styopa', 'Igor', 'Rustam'];
export const NAMES_F_EN = ['Aunt Valya', 'Svetka', 'Marinka', 'Lyusya', 'Irina', 'Olya', 'Katya', 'Nina', 'Dasha', 'Alla', 'Vika', 'Zoya', 'Tanya', 'Lena', 'Julia'];

/** Character trait keys (i18n "trait_<key>"). */
export const TRAITS = ['careful', 'bold', 'sly', 'chatty', 'calm', 'lucky'];

const F = (p: Partial<FaceParams>): FaceParams => ({
  skin: '#f6d7b8',
  hair: '#5a3a22',
  hairStyle: 1,
  hat: 0,
  hatColor: '#e03131',
  beard: 0,
  glasses: 0,
  shirt: '#3b5bdb',
  bg: '#fff3bf',
  old: false,
  female: false,
  ...p,
});

/** Fixed looks of the location bosses. */
export const BOSS_FACES: FaceParams[] = [
  F({ female: true, old: true, hair: '#e9e9e9', hairStyle: 3, hat: 5, hatColor: '#c2255c', glasses: 1, shirt: '#5c940d', bg: '#ffd8a8' }),
  F({ female: true, hair: '#a83a2a', hairStyle: 3, hat: 4, shirt: '#1c2a4a', bg: '#d0ebff' }),
  F({ hair: '#e8d27a', hairStyle: 5, glasses: 2, shirt: '#e03131', bg: '#c5f6fa', skin: '#d9a066' }),
  F({ female: true, old: true, hair: '#9aa0a8', hairStyle: 3, glasses: 1, shirt: '#495057', bg: '#e5dbff' }),
  F({ old: true, hair: '#e9e9e9', beard: 2, hat: 2, shirt: '#5c940d', bg: '#d3f9d8' }),
  F({ old: true, hair: '#e9e9e9', beard: 2, hat: 4, shirt: '#1c2a4a', bg: '#d0ebff' }),
  F({ hair: '#2b1d14', beard: 1, hat: 7, hatColor: '#c2255c', shirt: '#212529', bg: '#f3d9fa' }),
  F({ hair: '#2b1d14', beard: 3, hat: 6, glasses: 2, shirt: '#7048e8', bg: '#ffe3e3' }),
];

/** Phrases (i18n keys "say_<key>") bots use as reactions. */
export const PHRASES = {
  win: ['win1', 'win2', 'win3'],
  lose: ['lose1', 'lose2', 'lose3'],
  take: ['take1', 'take2'],
  beat: ['beat1', 'beat2'],
  caught: ['caught1', 'caught2'],
  catch: ['catch1', 'catch2'],
};
