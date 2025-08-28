import { Markup } from 'telegraf';
import { T, Lang } from './translations';
import { UserEntity } from '../../../../entity/user.entity';

// Enhanced Admin menu: includes worker actions + admin actions + super admin actions
export function getAdminMenu(lang: Lang, admin?: UserEntity) {
  const tr = T[lang];
  const rows: any[] = [];

  // Worker-style actions (show for admin)
  rows.push([Markup.button.callback(tr.btnCheckIn, 'check_in')]);
  rows.push([Markup.button.callback(tr.btnCheckOut, 'check_out')]);
  rows.push([Markup.button.callback(tr.btnRequestLeave, 'request_leave')]);
  rows.push([Markup.button.callback(tr.btnMyRequests, 'my_requests')]);
  rows.push([Markup.button.callback(tr.btnLateComment, 'late_comment')]);

  // Admin-specific actions
  rows.push([Markup.button.callback(tr.managerPendingBtn, 'mgr_pending')]);
  rows.push([
    Markup.button.callback(tr.managerUnverifiedBtn, 'mgr_workers_pending'),
  ]);
  rows.push([Markup.button.callback(tr.viewWorkersBtn, 'mgr_view_workers')]);

  // Super admin actions (include in admin menu as requested)
  rows.push([
    Markup.button.callback(
      tr.superAdminUnverifiedManagersBtn,
      'mgr_managers_pending',
    ),
  ]);

  return Markup.inlineKeyboard(rows);
}
