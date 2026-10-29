import type { FaceParams } from '../art/faces';

export const NAMES_M_RU = ['Виктор', 'Семён', 'Дядя Паша', 'Аркадий', 'Толя', 'Геннадий', 'Лёва', 'Миша', 'Пётр Ильич', 'Савелий', 'Яков', 'Борис', 'Илья', 'Фёдор', 'Тимофей', 'Роман', 'Остап', 'Глеб', 'Захар', 'Эдик'];
export const NAMES_F_RU = ['Тётя Шура', 'Варвара', 'Люда', 'Нина', 'Римма', 'Ольга', 'Катя', 'Зина', 'Даша', 'Алла', 'Вера', 'Тамара', 'Соня', 'Лиза', 'Жанна'];
export const NAMES_M_EN = ['Victor', 'Simon', 'Uncle Paul', 'Arkady', 'Tolya', 'Gennady', 'Leo', 'Misha', 'Peter', 'Saveliy', 'Jacob', 'Boris', 'Ilya', 'Fyodor', 'Timothy', 'Roman', 'Ostap', 'Gleb', 'Zakhar', 'Eddie'];
export const NAMES_F_EN = ['Aunt Shura', 'Barbara', 'Lucy', 'Nina', 'Rimma', 'Olga', 'Kate', 'Zina', 'Dasha', 'Alla', 'Vera', 'Tamara', 'Sonya', 'Liza', 'Jeanne'];

/** Character traits (i18n "trait_<key>"); they nudge the bot's bidding. */
export const TRAITS = ['careful', 'bold', 'marriages', 'calm', 'lucky', 'chatty'];

const F = (p: Partial<FaceParams>): FaceParams => ({
  skin: '#f6d7b8',
  hair: '#5a3a22',
  hairStyle: 1,
  hat: 0,
  hatColor: '#c92a2a',
  beard: 0,
  glasses: 0,
  shirt: '#1f2f5c',
  bg: '#e7dcc4',
  old: false,
  female: false,
  ...p,
});

/** Fixed looks of the route bosses (one per world). */
export const BOSS_FACES: FaceParams[] = [
  F({ old: true, hair: '#9aa0a8', beard: 1, hat: 9, hatColor: '#2f9e44', glasses: 1, shirt: '#2b4a3a', bg: '#d8ecd0' }),
  F({ female: true, hair: '#c98c3a', hairStyle: 3, hat: 9, hatColor: '#c92a2a', shirt: '#1f2f5c', bg: '#ffe3c2' }),
  F({ old: true, hair: '#e9e9e9', hairStyle: 0, beard: 2, glasses: 1, shirt: '#5a3a22', bg: '#e5dbff' }),
  F({ hair: '#2b1d14', beard: 1, hat: 10, shirt: '#f1f3f5', bg: '#ffd8a8', skin: '#d9a066' }),
  F({ old: true, hair: '#5a3a22', beard: 3, hat: 1, hatColor: '#364fc7', shirt: '#364fc7', bg: '#d0ebff' }),
  F({ hair: '#2b1d14', beard: 2, hat: 2, glasses: 2, shirt: '#495057', bg: '#e3fafc' }),
  F({ female: true, hair: '#2b1d14', hairStyle: 2, hat: 11, hatColor: '#862e9c', shirt: '#862e9c', bg: '#f3d9fa' }),
  F({ hair: '#111111', beard: 1, hat: 7, hatColor: '#c92a2a', glasses: 0, shirt: '#212529', bg: '#2b3d78' }),
];

/** Bot reactions (i18n "say_<key>"). */
export const PHRASES = {
  bidBig: ['bid1', 'bid2', 'bid3'],
  pass: ['pass1', 'pass2'],
  marriage: ['marr1', 'marr2', 'marr3'],
  made: ['made1', 'made2'],
  failed: ['fail1', 'fail2', 'fail3'],
  win: ['win1', 'win2'],
  lose: ['lose1', 'lose2'],
  bolt: ['bolt1', 'bolt2'],
};
