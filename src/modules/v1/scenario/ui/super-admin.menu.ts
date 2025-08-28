import { Markup } from 'telegraf';
import { T, Lang } from './translations';

export function getSuperAdminMenu(lang: Lang) {
  const tr = T[lang];
  return Markup.inlineKeyboard([
    [Markup.button.callback(tr.managerPendingBtn, 'mgr_pending')],
    [Markup.button.callback(tr.managerUnverifiedBtn, 'mgr_workers_pending')],
    [
      Markup.button.callback(
        tr.superAdminUnverifiedManagersBtn,
        'mgr_managers_pending',
      ),
    ],
    [Markup.button.callback(tr.viewWorkersBtn, 'mgr_view_workers')],
  ]);
}
