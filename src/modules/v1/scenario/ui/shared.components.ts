import { Markup } from 'telegraf';
import { T, Lang } from './translations';

export function backKeyboard(lang: Lang, action = 'back_to_menu') {
  const tr = T[lang];
  return Markup.inlineKeyboard([[Markup.button.callback(tr.backBtn, action)]]);
}

export function mainMenuKeyboard(lang: Lang) {
  const tr = T[lang];
  return Markup.inlineKeyboard([
    [Markup.button.callback(tr.mainMenuBtn, 'mgr_back_to_menu')],
  ]);
}
