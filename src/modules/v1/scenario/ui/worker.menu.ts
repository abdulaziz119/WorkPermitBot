import { Markup } from 'telegraf';
import { UserEntity } from '../../../../entity/user.entity';
import { UserRoleEnum } from '../../../../utils/enum/user.enum';
import { T, Lang } from './translations';

export function getWorkerMenu(lang: Lang, isVerified: boolean, worker?: UserEntity) {
  const tr = T[lang];
  const buttons = [] as any[];

  if (isVerified) {
    buttons.push([Markup.button.callback(tr.btnCheckIn, 'check_in')]);
    buttons.push([Markup.button.callback(tr.btnCheckOut, 'check_out')]);
    buttons.push([
      Markup.button.callback(tr.btnRequestLeave, 'request_leave'),
    ]);
    buttons.push([Markup.button.callback(tr.btnMyRequests, 'my_requests')]);
    buttons.push([Markup.button.callback(tr.btnLateComment, 'late_comment')]);

    // Add Project Manager specific button if the role matches
    if (worker && worker.role === UserRoleEnum.PROJECT_MANAGER) {
      buttons.push([
        Markup.button.callback(tr.viewWorkersBtn, 'worker_view_workers'),
      ]);
    }
  } else {
    buttons.push([Markup.button.callback(tr.btnWaiting, 'noop')]);
  }

  return Markup.inlineKeyboard(buttons);
}
