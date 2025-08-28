import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Markup, Context, Telegraf } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { UsersService } from '../users/users.service';
import { RequestsService } from '../requests/requests.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ScenarioNotificationService } from './scenario.notification.service';
import { WorkersExcelService } from '../../../utils/workers.excel';
import { language, UserRoleEnum } from '../../../utils/enum/user.enum';
import { UserEntity } from '../../../entity/user.entity';
import { RequestEntity } from '../../../entity/requests.entity';
import { AttendanceEntity } from '../../../entity/attendance.entity';
import {
  RequestsStatusEnum,
  RequestTypeEnum,
  HourlyRequestTypeEnum,
} from '../../../utils/enum/requests.enum';
import { formatUzbekistanTime } from '../../../utils/time/uzbekistan-time';
import { T, Lang } from './ui/translations';
import { getAdminMenu } from './ui/admin.menu';
import { getSuperAdminMenu } from './ui/super-admin.menu';
import { mainMenuKeyboard } from './ui/shared.components';

type Ctx = Context & { session?: Record<string, any> };

@Injectable()
export class ScenarioDashboardService implements OnModuleInit {
  private readonly logger: Logger = new Logger(ScenarioDashboardService.name);
  private readonly bot: Telegraf<Ctx>;

  constructor(
    // private readonly managers: ManagersService,
    // private readonly workers: WorkersService,
    private readonly users: UsersService,
    private readonly requests: RequestsService,
    private readonly attendance: AttendanceService,
    private readonly notificationService: ScenarioNotificationService,
    private readonly excel: WorkersExcelService,
  ) {
    this.bot = getBot();
  }

  onModuleInit() {
    this.registerHandlers();
    ensureBotLaunched(this.logger).catch(() => void 0);
  }

  private async getLang(ctx: Ctx): Promise<Lang> {
    const sessLang = ctx.session?.lang as Lang | undefined;
    if (sessLang) return sessLang === language.RU ? language.RU : language.UZ;
    const tgId: number = Number(ctx.from?.id);
    if (tgId) {
      const m: UserEntity = await this.users.findByTelegramId(tgId);
      if (m?.language)
        return m.language === language.RU ? language.RU : language.UZ;
    }
    return language.UZ;
  }

  private managerMenu(lang: Lang) {
    return getAdminMenu(lang);
  }

  private superAdminMenu(lang: Lang) {
    return getSuperAdminMenu(lang);
  }

  private backToMenuKeyboard(lang: Lang) {
    return mainMenuKeyboard(lang);
  }

  // Quick helper to show main menu after actions
  private async showManagerMenuShortcut(
    ctx: Ctx,
    lang: Lang,
    telegramId: number,
  ): Promise<void> {
    try {
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(telegramId);
      const menu = isSuperAdmin
        ? this.superAdminMenu(lang)
        : this.managerMenu(lang);
      await ctx.reply(
        lang === language.RU ? 'Главное меню' : 'Asosiy menyu',
        menu,
      );
    } catch (e) {
      // ignore navigation errors
    }
  }

  private statusLabel(lang: Lang, status: RequestsStatusEnum): string {
    if (lang === language.RU) {
      if (status === RequestsStatusEnum.PENDING) return `⏳ В ожидании`;
      if (status === RequestsStatusEnum.APPROVED) return `✅ Одобрено`;
      if (status === RequestsStatusEnum.REJECTED) return `❌ Отклонено`;
      return status;
    }
    if (status === RequestsStatusEnum.PENDING) return `⏳ Kutilmoqda`;
    if (status === RequestsStatusEnum.APPROVED) return `✅ Tasdiqlandi`;
    if (status === RequestsStatusEnum.REJECTED) return `❌ Rad etildi`;
    return status;
  }

  private registerHandlers(): void {
    const bot = this.bot;

    // Start command for managers/admins - show manager menu if user is admin/super_admin
    bot.start(async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const user: UserEntity = await this.users.findByTelegramId(tg.id);

      if (
        user &&
        (user.role === UserRoleEnum.ADMIN ||
          user.role === UserRoleEnum.SUPER_ADMIN)
      ) {
        if (user.is_active) {
          const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
          const menu = isSuperAdmin
            ? this.superAdminMenu(lang)
            : this.managerMenu(lang);
          const title = isSuperAdmin
            ? T[lang].superAdminMenuTitle
            : T[lang].managerMenuTitle;

          await ctx.reply(title, menu);
          return;
        } else {
          await ctx.reply(T[lang].notActiveManager);
          return;
        }
      }
      // If not manager/admin, let frontend service handle it
    });

    // Manager menu
    bot.command('manager', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.reply(T[lang].notActiveManager);

      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      const menu = isSuperAdmin
        ? this.superAdminMenu(lang)
        : this.managerMenu(lang);
      const title = isSuperAdmin
        ? T[lang].superAdminMenuTitle
        : T[lang].managerMenuTitle;

      await ctx.reply(title, menu);
    });

    bot.command('superadmin', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);
      await ctx.reply(T[lang].superAdminMenuTitle, this.superAdminMenu(lang));
    });

    // Manual test command for checking old responses
    bot.command('checkoldresponses', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result: string =
        await this.notificationService.manualCheckOldResponses(3);
      await ctx.reply(`🔍 3 kunlik check natijasi:\n${result}`);
    });

    // Test for 5 days
    bot.command('check5days', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result: string =
        await this.notificationService.manualCheckOldResponses(5);
      await ctx.reply(`🔍 5 kunlik check natijasi:\n${result}`);
    });

    // Test for 7 days (1 week)
    bot.command('check1week', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result = await this.notificationService.manualCheckOldResponses(7);
      await ctx.reply(`🔍 1 haftalik check natijasi:\n${result}`);
    });

    bot.command('activate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m: UserEntity = await this.users.activateUser(tg.id);
      if (!m) return ctx.reply(T[lang].activateNotFound);
      await ctx.reply(T[lang].activateOk);
    });

    bot.command('deactivate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m: UserEntity = await this.users.deactivateUser(tg.id);
      if (!m) return ctx.reply(T[lang].deactivateNotFound);
      await ctx.reply(T[lang].deactivateOk);
    });

    // Pending requests list
    bot.action('mgr_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}

      // Role-based request filtering
      let pending: RequestEntity[] = [];
      if (manager.role === UserRoleEnum.SUPER_ADMIN) {
        // Super admin sees all pending requests
        pending = await this.requests.listPending();
      } else if (manager.role === UserRoleEnum.ADMIN) {
        // Admin only sees hourly requests
        pending = await this.requests.listPendingHourly();
      }

      if (!pending.length)
        return ctx.editMessageText(
          T[lang].pendingEmpty,
          this.backToMenuKeyboard(lang),
        );

      const message = `${T[lang].managerPendingBtn}:\n\n`;
      for (const r of pending.slice(0, 10)) {
        const workerName: string =
          r.worker?.fullname || `Worker ID: ${r.worker_id}`;

        // Request type indicator
        const typeIcon: string =
          r.request_type === RequestTypeEnum.DAILY ? '🗓' : '⏰';

        // Format dates and calculate days
        let dateInfo: string = '';
        let daysCount: string = '';

        // For hourly requests, use hourly_leave_time instead of approved_date
        if (r.request_type === RequestTypeEnum.HOURLY && r.hourly_leave_time) {
          const leaveTime = new Date(r.hourly_leave_time);
          const formattedTime = formatUzbekistanTime(leaveTime);

          // Add type indicator
          let typeIcon = '⏰';
          let typeText = '';
          if (r.hourly_request_type === HourlyRequestTypeEnum.COMING_LATE) {
            typeIcon = '⏰';
            typeText = lang === language.RU ? ' (Опоздание)' : ' (Kech kelish)';
          } else if (
            r.hourly_request_type === HourlyRequestTypeEnum.LEAVING_EARLY
          ) {
            typeIcon = '🚪';
            typeText =
              lang === language.RU ? ' (Ранний уход)' : ' (Erta ketish)';
          }

          dateInfo = `${typeIcon} ${formattedTime}${typeText}`;
        } else if (r.approved_date) {
          const startDate = new Date(r.approved_date);
          const startDD: string = String(startDate.getUTCDate()).padStart(
            2,
            '0',
          );
          const startMM: string = String(startDate.getUTCMonth() + 1).padStart(
            2,
            '0',
          );
          const startYYYY: number = startDate.getUTCFullYear();

          // For daily requests with return dates
          if (r.return_date) {
            const endDate = new Date(r.return_date);
            const endDD: string = String(endDate.getUTCDate()).padStart(2, '0');
            const endMM: string = String(endDate.getUTCMonth() + 1).padStart(
              2,
              '0',
            );
            const endYYYY: number = endDate.getUTCFullYear();

            // Calculate days between dates
            const timeDiff: number = endDate.getTime() - startDate.getTime();
            const daysDiff: number = Math.ceil(timeDiff / (1000 * 3600 * 24));

            dateInfo = `📅 ${startDD}.${startMM}.${startYYYY} - ${endDD}.${endMM}.${endYYYY}`;
            daysCount =
              lang === language.RU
                ? `⏱ ${daysDiff} дней`
                : `⏱ ${daysDiff} kun`;
          } else {
            dateInfo = `📅 ${startDD}.${startMM}.${startYYYY}`;
          }
        }

        // Format request creation time for display
        const requestTime = formatUzbekistanTime(r.created_at);
        const timeInfo = `⏰ ${requestTime}`;

        // Add hourly request type information
        let hourlyTypeInfo = '';
        if (
          r.request_type === RequestTypeEnum.HOURLY &&
          r.hourly_request_type
        ) {
          const typeText =
            r.hourly_request_type === HourlyRequestTypeEnum.COMING_LATE
              ? 'Kechikish'
              : 'Erta ketish';

          if (r.hourly_leave_time) {
            const leaveTime = formatUzbekistanTime(r.hourly_leave_time);
            hourlyTypeInfo = `🕐 ${typeText}: ${leaveTime}`;
          } else {
            hourlyTypeInfo = `🕐 ${typeText}`;
          }
        }

        const messageText: string = [
          `${typeIcon} #${r.id}`,
          `👤 ${workerName}`,
          dateInfo,
          daysCount,
          timeInfo,
          hourlyTypeInfo,
          `📝 ${r.reason}`,
        ]
          .filter(Boolean)
          .join('\n');

        await ctx.reply(
          messageText,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(T[lang].approveBtn, `approve_${r.id}`),
              Markup.button.callback(T[lang].rejectBtn, `reject_${r.id}`),
            ],
          ]),
        );
      }

      // Send back button after the list
      await ctx.reply(T[lang].managerPendingBtn, this.backToMenuKeyboard(lang));
    });

    // Approve / Reject capture
    bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId: number = Number(idStr);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      ctx.session ??= {};
      ctx.session['approval_target'] = { action, requestId };

      // Izoh bilan yoki izohsiz tasdiqlash tugmalari
      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            lang === language.RU
              ? `${action === 'approve' ? 'Подтвердить' : 'Отклонить'} без комментария`
              : `${action === 'approve' ? 'Tasdiqlash' : 'Rad etish'} izohhsiz`,
            `${action}_no_comment_${requestId}`,
          ),
        ],
        [
          Markup.button.callback(
            lang === language.RU
              ? `${action === 'approve' ? 'Подтвердить' : 'Отклонить'} с комментарием`
              : `${action === 'approve' ? 'Tasdiqlash' : 'Rad etish'} izoh bilan`,
            `${action}_with_comment_${requestId}`,
          ),
        ],
      ]);

      await ctx.reply(
        lang === language.RU
          ? 'Выберите способ ответа:'
          : 'Javob berish usulini tanlang:',
        buttons,
      );
    });

    // Izohsiz tasdiqlash/rad etish
    bot.action(/^(approve|reject)_no_comment_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId: number = Number(idStr);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      // Double-processing guard
      const existing = await this.requests.findByIdWithWorker(requestId);
      if (!existing) return ctx.answerCbQuery('Not found');
      if (existing.status !== RequestsStatusEnum.PENDING) {
        return ctx.answerCbQuery(
          lang === language.RU
            ? 'Уже обработано другим менеджером'
            : 'Allaqachon boshqa manager tomonidan javob berilgan',
        );
      }

      const comment = ''; // Bo'sh izoh

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}

      let finalStatus: RequestsStatusEnum;
      if (action === 'approve') {
        await this.requests.approve(requestId, manager.id, comment);
        finalStatus = RequestsStatusEnum.APPROVED;
        await ctx.reply(T[lang].approvedMsg(requestId));
        // Show manager menu navigation
        await this.showManagerMenuShortcut(ctx, lang, tg.id);
        // Worker ga xabar yuborish
        await this.notifyWorkerDecision(
          requestId,
          RequestsStatusEnum.APPROVED,
          manager.fullname,
          comment,
          lang,
        );
      } else {
        await this.requests.reject(requestId, manager.id, comment);
        finalStatus = RequestsStatusEnum.REJECTED;
        await ctx.reply(T[lang].rejectedMsg(requestId));
        await this.showManagerMenuShortcut(ctx, lang, tg.id);
        // Worker ga xabar yuborish
        await this.notifyWorkerDecision(
          requestId,
          RequestsStatusEnum.REJECTED,
          manager.fullname,
          comment,
          lang,
        );
      }

      // Notify other managers (admins + super admins) about decision
      try {
        const adminManagers = await this.users.listByRole(UserRoleEnum.ADMIN);
        const superAdminManagers = await this.users.listByRole(
          UserRoleEnum.SUPER_ADMIN,
        );
        const allManagers = [...adminManagers, ...superAdminManagers];
        const others = allManagers.filter(
          (m) =>
            m.telegram_id !== manager.telegram_id &&
            (m.role === UserRoleEnum.ADMIN ||
              m.role === UserRoleEnum.SUPER_ADMIN),
        );
        const statusTextUz =
          finalStatus === RequestsStatusEnum.APPROVED
            ? 'Tasdiqlandi ✅'
            : 'Rad etildi ❌';
        const statusTextRu =
          finalStatus === RequestsStatusEnum.APPROVED
            ? 'Одобрено ✅'
            : 'Отклонено ❌';
        const actUz = `#${requestId} so'rov ${manager.fullname} tomonidan: ${statusTextUz}`;
        const actRu = `Запрос #${requestId} обработан ${manager.fullname}: ${statusTextRu}`;
        await Promise.all(
          others.map((o) =>
            this.bot.telegram
              .sendMessage(
                o.telegram_id,
                o.language === language.RU ? actRu : actUz,
              )
              .catch(() => void 0),
          ),
        );
      } catch (e) {
        this.logger.warn('Broadcast decision failed ' + String(e));
      }

      ctx.session['approval_target'] = undefined;
    });

    // Izoh bilan tasdiqlash/rad etish
    bot.action(/^(approve|reject)_with_comment_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId: number = Number(idStr);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      // Guard already processed
      const existing = await this.requests.findByIdWithWorker(requestId);
      if (!existing) return ctx.answerCbQuery('Not found');
      if (existing.status !== RequestsStatusEnum.PENDING) {
        return ctx.answerCbQuery(
          lang === language.RU
            ? 'Уже обработано другим менеджером'
            : 'Allaqachon boshqa manager tomonidan javob berilgan',
        );
      }

      ctx.session ??= {};
      ctx.session['approval_target'] = { action, requestId };

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}

      await ctx.reply(T[lang].approvalCommentPrompt);
    });

    bot.on('text', async (ctx, next) => {
      const target = ctx.session?.['approval_target'];
      if (target) {
        const tg = ctx.from;
        const lang = await this.getLang(ctx);
        const manager: UserEntity = await this.users.findByTelegramId(tg.id);
        if (!manager || !manager.is_active) {
          ctx.session['approval_target'] = undefined;
          return ctx.reply(T[lang].noPermission);
        }
        const comment: string = ctx.message.text.trim();
        let finalStatus: RequestsStatusEnum;
        if (target.action === 'approve') {
          await this.requests.approve(target.requestId, manager.id, comment);
          finalStatus = RequestsStatusEnum.APPROVED;
          await ctx.reply(T[lang].approvedMsg(target.requestId));
          await this.notifyWorkerDecision(
            target.requestId,
            RequestsStatusEnum.APPROVED,
            manager.fullname,
            comment,
            lang,
          );
          await this.showManagerMenuShortcut(ctx, lang, tg.id);
        } else {
          await this.requests.reject(target.requestId, manager.id, comment);
          finalStatus = RequestsStatusEnum.REJECTED;
          await ctx.reply(T[lang].rejectedMsg(target.requestId));
          await this.notifyWorkerDecision(
            target.requestId,
            RequestsStatusEnum.REJECTED,
            manager.fullname,
            comment,
            lang,
          );
          await this.showManagerMenuShortcut(ctx, lang, tg.id);
        }
        // Broadcast decision
        try {
          const adminManagers = await this.users.listByRole(UserRoleEnum.ADMIN);
          const superAdminManagers = await this.users.listByRole(
            UserRoleEnum.SUPER_ADMIN,
          );
          const allManagers = [...adminManagers, ...superAdminManagers];
          const others = allManagers.filter(
            (m) =>
              m.telegram_id !== manager.telegram_id &&
              (m.role === UserRoleEnum.ADMIN ||
                m.role === UserRoleEnum.SUPER_ADMIN),
          );
          const statusTextUz =
            finalStatus === RequestsStatusEnum.APPROVED
              ? 'Tasdiqlandi ✅'
              : 'Rad etildi ❌';
          const statusTextRu =
            finalStatus === RequestsStatusEnum.APPROVED
              ? 'Одобрено ✅'
              : 'Отклонено ❌';
          const actUz = `#${target.requestId} so'rov ${manager.fullname} tomonidan: ${statusTextUz}`;
          const actRu = `Запрос #${target.requestId} обработан ${manager.fullname}: ${statusTextRu}`;
          await Promise.all(
            others.map((o) =>
              this.bot.telegram
                .sendMessage(
                  o.telegram_id,
                  o.language === language.RU ? actRu : actUz,
                )
                .catch(() => void 0),
            ),
          );
        } catch (e) {
          this.logger.warn('Broadcast decision failed ' + String(e));
        }
        ctx.session['approval_target'] = undefined;
        return; // handled
      }
      return next?.();
    });

    // Unverified workers
    bot.action('mgr_workers_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const list: UserEntity[] = await this.users.listUnverifiedWorkers(10);
      if (!list.length)
        return ctx.editMessageText(
          T[lang].unverifiedWorkersEmpty,
          this.backToMenuKeyboard(lang),
        );

      const message = `${T[lang].managerUnverifiedBtn}:\n\n`;
      for (const w of list) {
        await ctx.reply(
          `Ishchi: ${w.fullname} (tg:${w.telegram_id})`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                T[lang].workerVerifyBtn,
                `verify_worker_${w.id}`,
              ),
            ],
          ]),
        );
      }

      // Send back button after the list
      await ctx.reply(
        T[lang].managerUnverifiedBtn,
        this.backToMenuKeyboard(lang),
      );
    });

    bot.action(/^verify_worker_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      const verified: UserEntity = await this.users.verifyUser(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);
      await ctx.reply(T[lang].workerVerifiedMsg(verified.fullname));
      // Notify worker about approval in their own language and show menu
      try {
        const wLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        // build minimal worker menu (check-in/out etc.) inline keyboard
        const buttons: any[] = [];
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Пришёл (Check-in) ✅'
              : 'Kelish (Check-in) ✅',
            'check_in',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Ушёл (Check-out) 🕘'
              : 'Ketish (Check-out) 🕘',
            'check_out',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Запросить отгул 📝' : 'Javob soʼrash 📝',
            'request_leave',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Мои запросы 📄' : 'Mening soʼrovlarim 📄',
            'my_requests',
          ),
        ]);
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          wLang === language.RU
            ? 'Ваш профиль подтверждён менеджером ✅'
            : 'Profilingiz menejer tomonidan tasdiqlandi ✅',
          { reply_markup: { inline_keyboard: buttons } as any },
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified worker ${verified.id}: ${String(e)}`,
        );
      }
    });

    // Approve/Reject inline from new worker notification
    // Role-based worker approval handlers
    bot.action(/^approve_worker_worker_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);

      // Faqat admin roli bilan managerlar tasdiqlashi mumkin
      const isAdminManager: boolean = await this.users.isAdmin(tg.id);
      if (!manager || !manager.is_active || !isAdminManager)
        return ctx.answerCbQuery(T[lang].noPermission);

      const verified: UserEntity = await this.users.verifyUser(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);

      // Worker role o'rnatish
      await this.users.setUserRole(id, UserRoleEnum.WORKER);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `${verified.fullname} "Работник" роли bilan tasdiqlandi 👷`
          : `${verified.fullname} "Ishchi" roli bilan tasdiqlandi 👷`,
      );
      await this.showManagerMenuShortcut(ctx, lang, tg.id);

      // Notify worker about approval
      try {
        const wLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        const buttons: any[] = [];
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Пришёл (Check-in) ✅'
              : 'Kelish (Check-in) ✅',
            'check_in',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Ушёл (Check-out) 🕘'
              : 'Ketish (Check-out) 🕘',
            'check_out',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Запросить отгул 📝' : 'Javob soʼrash 📝',
            'request_leave',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Мои запросы 📄' : 'Mening soʼrovlarim 📄',
            'my_requests',
          ),
        ]);
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          wLang === language.RU
            ? 'Ваш профиль подтверждён менеджером как "Работник" ✅'
            : 'Profilingiz menejer tomonidan "Ishchi" roli bilan tasdiqlandi ✅',
          { reply_markup: { inline_keyboard: buttons } as any },
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified worker ${verified.id}: ${String(e)}`,
        );
      }
    });

    bot.action(/^approve_worker_project_manager_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);

      // Faqat admin roli bilan managerlar tasdiqlashi mumkin
      const isAdminManager: boolean = await this.users.isAdmin(tg.id);
      if (!manager || !manager.is_active || !isAdminManager)
        return ctx.answerCbQuery(T[lang].noPermission);

      const verified: UserEntity = await this.users.verifyUser(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);

      // Project Manager role o'rnatish
      await this.users.setUserRole(id, UserRoleEnum.PROJECT_MANAGER);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `${verified.fullname} "Проект-менеджер" роли bilan tasdiqlandi 👨‍💼`
          : `${verified.fullname} "Loyiha menejeri" roli bilan tasdiqlandi 👨‍💼`,
      );
      await this.showManagerMenuShortcut(ctx, lang, tg.id);

      // Notify worker about approval with extended menu
      try {
        const wLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        const buttons: any[] = [];
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Пришёл (Check-in) ✅'
              : 'Kelish (Check-in) ✅',
            'check_in',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Ушёл (Check-out) 🕘'
              : 'Ketish (Check-out) 🕘',
            'check_out',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Запросить отгул 📝' : 'Javob soʼrash 📝',
            'request_leave',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === language.RU ? 'Мои запросы 📄' : 'Mening soʼrovlarim 📄',
            'my_requests',
          ),
        ]);
        // Project Manager uchun qo'shimcha tugma
        buttons.push([
          Markup.button.callback(
            wLang === language.RU
              ? 'Просмотр работников 👥'
              : 'Ishchilarni koʼrish 👥',
            'worker_view_workers',
          ),
        ]);
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          wLang === language.RU
            ? 'Ваш профиль подтверждён менеджером как "Проект-менеджер" ✅'
            : 'Profilingiz menejer tomonidan "Loyiha menejeri" roli bilan tasdiqlandi ✅',
          { reply_markup: { inline_keyboard: buttons } as any },
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified worker ${verified.id}: ${String(e)}`,
        );
      }
    });

    bot.action(/^reject_worker_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);

      // Faqat admin roli bilan managerlar rad etishi mumkin
      const isAdminManager: boolean = await this.users.isAdmin(tg.id);
      if (!manager || !manager.is_active || !isAdminManager)
        return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `Заявка работника #${id} отклонена ❌`
          : `Ishchi #${id} arizasi rad etildi ❌`,
      );
      // Optionally notify the worker of rejection
      try {
        const w: UserEntity = await this.users.findById(id);
        if (w) {
          const wLang = (w.language as Lang) || 'uz';
          await this.bot.telegram.sendMessage(
            w.telegram_id,
            wLang === language.RU
              ? 'Ваш профиль отклонён ❌'
              : 'Profilingiz rad etildi ❌',
          );
        }
      } catch (e) {
        this.logger.warn(
          `Could not notify rejected worker ${id}: ${String(e)}`,
        );
      }
    });

    // Back to main menu
    bot.action('mgr_back_to_menu', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      const menu = isSuperAdmin
        ? this.superAdminMenu(lang)
        : this.managerMenu(lang);
      const title = isSuperAdmin
        ? T[lang].superAdminMenuTitle
        : T[lang].managerMenuTitle;

      try {
        await ctx.editMessageText(title, menu);
      } catch {
        await ctx.reply(title, menu);
      }
    });

    // View workers with pagination
    bot.action(/^mgr_view_workers(?:_(\d+))?$/, async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const page: number = ctx.match[1] ? Number(ctx.match[1]) : 1;
      const result = await this.users.listVerifiedWorkersPaginated(page, 5);

      if (result.workers.length === 0) {
        return ctx.editMessageText(
          T[lang].verifiedWorkersEmpty,
          this.backToMenuKeyboard(lang),
        );
      }

      const message = `${T[lang].viewWorkersBtn} (${page}/${Math.ceil(result.total / 5)}):\n`;

      const buttons: any[] = [];

      // Get today's attendance and approved leave data for all workers
      const workerIds = result.workers.map((w) => w.id);
      const attendanceMap = await this.attendance.getTodayForWorkers(workerIds);
      const approvedLeaveMap =
        await this.requests.getApprovedLeaveForToday(workerIds);

      // Worker buttons with enhanced attendance status
      for (const worker of result.workers) {
        const todayAttendance = attendanceMap.get(worker.id);
        const hasApprovedLeave = approvedLeaveMap.get(worker.id) || false;

        let status: string;
        if (hasApprovedLeave) {
          // Worker has approved leave today
          status =
            lang === language.RU ? '📋 Отгул одобрен' : '📋 Javob berilgan';
        } else if (todayAttendance?.check_in) {
          // Worker checked in (prioritize over late comment)
          status = T[lang].attendancePresent;
        } else if (todayAttendance?.late_comment) {
          // Worker submitted late comment but hasn't checked in yet
          status =
            lang === language.RU
              ? '⏰ Опоздал (не пришёл)'
              : '⏰ Kech qoldi (kelmagan)';
        } else {
          // Worker absent
          status = T[lang].attendanceAbsent;
        }

        // Role indicator
        const roleIcon =
          worker.role === UserRoleEnum.PROJECT_MANAGER
            ? '👨‍💼'
            : worker.role === UserRoleEnum.ADMIN
              ? '🔧'
              : worker.role === UserRoleEnum.SUPER_ADMIN
                ? '👑'
                : '👷';

        buttons.push([
          Markup.button.callback(
            `${status} ${roleIcon} ${worker.fullname}`,
            `mgr_worker_${worker.id}`,
          ),
        ]);
      }

      // Pagination buttons
      const navButtons = [];
      if (result.hasPrev) {
        navButtons.push(
          Markup.button.callback(
            T[lang].prevBtn,
            `mgr_view_workers_${page - 1}`,
          ),
        );
      }
      if (result.hasNext) {
        navButtons.push(
          Markup.button.callback(
            T[lang].nextBtn,
            `mgr_view_workers_${page + 1}`,
          ),
        );
      }
      if (navButtons.length > 0) {
        buttons.push(navButtons);
      }

      // Back button
      buttons.push([
        Markup.button.callback(T[lang].backBtn, 'mgr_back_to_menu'),
      ]);

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Individual worker view with export options
    bot.action(/^mgr_worker_(\d+)$/, async (ctx) => {
      const workerId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const worker: UserEntity = await this.users.findById(workerId);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      const todayAttendance: AttendanceEntity = await this.attendance.getToday(
        worker.id,
      );
      const status = todayAttendance?.check_in
        ? T[lang].attendancePresent
        : T[lang].attendanceAbsent;

      // Role display
      const roleText =
        worker.role === UserRoleEnum.PROJECT_MANAGER
          ? lang === language.RU
            ? 'Проект Менеджер'
            : 'Project Manager'
          : worker.role === UserRoleEnum.ADMIN
            ? lang === language.RU
              ? 'Админ'
              : 'Admin'
            : worker.role === UserRoleEnum.SUPER_ADMIN
              ? lang === language.RU
                ? 'Супер Админ'
                : 'Super Admin'
              : lang === language.RU
                ? 'Работник'
                : 'Ishchi';

      let message = `👤 ${worker.fullname}\n💼 ${roleText}\n${T[lang].attendanceToday}: ${status}`;

      // Show late comment if exists
      if (todayAttendance?.late_comment) {
        const commentTime = todayAttendance.comment_time
          ? new Date(todayAttendance.comment_time).toLocaleTimeString()
          : '';
        message += `\n💬 ${lang === language.RU ? 'Причина опоздания' : 'Kech qolish sababi'}: ${todayAttendance.late_comment}`;
        if (commentTime) {
          message += ` (${commentTime})`;
        }
      }

      message += '\n\nDavomat hisobotini yuklab olish:';

      const buttons = [
        [
          Markup.button.callback(
            T[lang].exportDaily,
            `mgr_export_worker_day_${workerId}`,
          ),
          Markup.button.callback(
            T[lang].exportWeekly,
            `mgr_export_worker_week_${workerId}`,
          ),
        ],
        [
          Markup.button.callback(
            T[lang].exportMonthly,
            `mgr_export_worker_month_${workerId}`,
          ),
          Markup.button.callback(
            T[lang].exportYearly,
            `mgr_export_worker_year_${workerId}`,
          ),
        ],
        [
          Markup.button.callback(
            lang === language.RU ? 'Запросы 📋' : "So'rovlari 📋",
            `mgr_worker_requests_${workerId}`,
          ),
        ],
        [
          Markup.button.callback(
            worker.role === UserRoleEnum.PROJECT_MANAGER
              ? lang === language.RU
                ? 'Сделать работником 👷'
                : 'Ishchi qilish 👷'
              : lang === language.RU
                ? 'Сделать проект менеджером 👨‍💼'
                : 'Project Manager qilish 👨‍💼',
            `mgr_change_role_${workerId}`,
          ),
        ],
        [Markup.button.callback(T[lang].backBtn, 'mgr_view_workers')],
      ];

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Worker role change handler
    bot.action(/^mgr_change_role_(\d+)$/, async (ctx) => {
      const workerId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);

      // Faqat admin va super admin role o'zgartirishga ruxsat berilgan
      const canChangeRole =
        manager &&
        manager.is_active &&
        (manager.role === UserRoleEnum.ADMIN ||
          manager.role === UserRoleEnum.SUPER_ADMIN);

      if (!canChangeRole) {
        return ctx.answerCbQuery(
          lang === language.RU
            ? 'У вас нет прав для изменения ролей'
            : "Sizda rol o'zgartirish huquqi yo'q",
        );
      }

      const worker: UserEntity = await this.users.findById(workerId);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      // Toggle role
      const newRole =
        worker.role === UserRoleEnum.PROJECT_MANAGER
          ? UserRoleEnum.WORKER
          : UserRoleEnum.PROJECT_MANAGER;

      const updatedWorker = await this.users.setUserRole(workerId, newRole);

      if (updatedWorker) {
        const roleText =
          newRole === UserRoleEnum.PROJECT_MANAGER
            ? lang === language.RU
              ? 'Проект Менеджер'
              : 'Project Manager'
            : lang === language.RU
              ? 'Работник'
              : 'Ishchi';

        await ctx.answerCbQuery(
          lang === language.RU
            ? `${worker.fullname} теперь ${roleText}`
            : `${worker.fullname} endi ${roleText}`,
          { show_alert: true },
        );

        // Navigate back to workers list
        try {
          await ctx.editMessageReplyMarkup(undefined);
        } catch {}

        // Show success message and return to menu
        await ctx.reply(
          lang === language.RU
            ? '✅ Роль успешно изменена'
            : "✅ Rol muvaffaqiyatli o'zgartirildi",
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                T[lang].viewWorkersBtn,
                'mgr_view_workers',
              ),
            ],
          ]),
        );
      } else {
        await ctx.answerCbQuery(
          lang === language.RU
            ? 'Ошибка при изменении роли'
            : "Rol o'zgartirishda xatolik",
        );
      }
    });

    // Export handlers
    bot.action(/^mgr_export_(day|week|month|year)$/, async (ctx) => {
      const period = ctx.match[1] as 'day' | 'week' | 'month' | 'year';
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.answerCbQuery('📊 Excel fayl tayyorlanmoqda...');

        const workers: UserEntity[] = await this.users.listVerifiedWorkers();
        const workerIds: number[] = workers.map((w) => w.id);
        const attendances: AttendanceEntity[] =
          await this.attendance.getAttendanceByPeriod(workerIds, period);

        // Get leave requests for the period
        const requests: RequestEntity[] =
          await this.requests.getRequestsByPeriod(workerIds, period);

        // Group attendances and requests by worker
        const data = workers.map((worker) => ({
          worker,
          attendances: attendances.filter((a) => a.worker_id === worker.id),
          requests: requests.filter((r) => r.worker_id === worker.id),
        }));

        const buffer = this.excel.generateExcelBuffer(data, period);
        const fileName: string = this.excel.getFileName(period);

        await ctx.replyWithDocument({
          source: buffer,
          filename: fileName,
        });
      } catch (e) {
        this.logger.error('Export failed', e);
        await ctx.answerCbQuery('❌ Xatolik yuz berdi', { show_alert: true });
      }
    });

    // Individual worker export handlers
    bot.action(
      /^mgr_export_worker_(day|week|month|year)_(\d+)$/,
      async (ctx) => {
        const period = ctx.match[1] as 'day' | 'week' | 'month' | 'year';
        const workerId: number = Number(ctx.match[2]);
        const tg = ctx.from;
        const lang = await this.getLang(ctx);
        const manager: UserEntity = await this.users.findByTelegramId(tg.id);
        if (!manager || !manager.is_active)
          return ctx.answerCbQuery(T[lang].noPermission);

        try {
          await ctx.answerCbQuery('📊 Excel fayl tayyorlanmoqda...');

          const worker: UserEntity = await this.users.findById(workerId);
          if (!worker) return ctx.answerCbQuery(T[lang].notFound);

          const attendances: AttendanceEntity[] =
            await this.attendance.getAttendanceByPeriod([workerId], period);

          // Get leave requests for this worker and period
          const requests: RequestEntity[] =
            await this.requests.getRequestsByPeriod([workerId], period);

          // Data for single worker
          const data = [
            {
              worker,
              attendances: attendances.filter((a) => a.worker_id === workerId),
              requests: requests.filter((r) => r.worker_id === workerId),
            },
          ];

          const buffer = this.excel.generateExcelBuffer(data, period);
          const fileName: string = this.excel.getFileName(
            period,
            worker.fullname,
          );

          await ctx.replyWithDocument({
            source: buffer,
            filename: fileName,
          });
        } catch (e) {
          this.logger.error('Individual worker export failed', e);
          await ctx.answerCbQuery('❌ Xatolik yuz berdi', { show_alert: true });
        }
      },
    );

    // Worker requests with pagination
    bot.action(/^mgr_worker_requests_(\d+)(?:_(\d+))?$/, async (ctx) => {
      const workerId: number = Number(ctx.match[1]);
      const page: number = ctx.match[2] ? Number(ctx.match[2]) : 1;
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: UserEntity = await this.users.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const worker: UserEntity = await this.users.findById(workerId);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      const allRequests: RequestEntity[] =
        await this.requests.listByWorker(workerId);

      if (!allRequests.length) {
        const message = `👤 ${worker.fullname}\n\n${lang === language.RU ? 'У работника нет запросов' : "Ishchida so'rovlar yo'q"}`;
        const buttons = [
          [Markup.button.callback(T[lang].backBtn, `mgr_worker_${workerId}`)],
        ];

        try {
          await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
        } catch {
          await ctx.reply(message, Markup.inlineKeyboard(buttons));
        }
        return;
      }

      const pageSize = 5;
      const totalPages: number = Math.ceil(allRequests.length / pageSize);
      const startIndex: number = (page - 1) * pageSize;
      const endIndex: number = startIndex + pageSize;
      const pageRequests: RequestEntity[] = allRequests.slice(
        startIndex,
        endIndex,
      );

      const lines: string = pageRequests
        .map((r: RequestEntity): string => {
          const statusText: string = this.statusLabel(lang, r.status);
          const dateText: string = r.approved_date
            ? ((): string => {
                const d = new Date(r.approved_date);
                const dd: string = String(d.getUTCDate()).padStart(2, '0');
                const mm: string = String(d.getUTCMonth() + 1).padStart(2, '0');
                const yyyy: number = d.getUTCFullYear();
                return `📅 ${dd}.${mm}.${yyyy}`;
              })()
            : '';
          const returnDateText: string = r.return_date
            ? ((): string => {
                const d = new Date(r.return_date);
                const dd: string = String(d.getUTCDate()).padStart(2, '0');
                const mm: string = String(d.getUTCMonth() + 1).padStart(2, '0');
                const yyyy: number = d.getUTCFullYear();
                return `🔄 ${dd}.${mm}.${yyyy}`;
              })()
            : '';
          const reasonText = `📝 ${r.reason}`;
          const commentText: string = r.manager_comment
            ? `\n${lang === language.RU ? 'Комментарий' : 'Izoh'}: ${r.manager_comment}`
            : '';

          const parts: string[] = [`#${r.id} • ${statusText}`];
          if (dateText) parts.push(dateText);
          if (returnDateText) parts.push(returnDateText);
          parts.push(reasonText);
          if (commentText) parts.push(commentText.trim());

          return parts.join('\n');
        })
        .join('\n\n');

      // Build navigation buttons
      const navButtons = [];
      const pageInfo: string =
        lang === language.RU
          ? `Страница ${page} из ${totalPages}`
          : `${page}-sahifa / ${totalPages}`;

      if (page > 1) {
        navButtons.push(
          Markup.button.callback(
            lang === language.RU ? '⬅️ Пред.' : '⬅️ Oldingi',
            `mgr_worker_requests_${workerId}_${page - 1}`,
          ),
        );
      }

      if (page < totalPages) {
        navButtons.push(
          Markup.button.callback(
            lang === language.RU ? 'След. ➡️' : 'Keyingi ➡️',
            `mgr_worker_requests_${workerId}_${page + 1}`,
          ),
        );
      }

      const buttons = [];
      if (navButtons.length > 0) {
        buttons.push(navButtons);
      }
      buttons.push([
        Markup.button.callback(T[lang].backBtn, `mgr_worker_${workerId}`),
      ]);

      const message = `👤 ${worker.fullname}\n${lang === language.RU ? 'Запросы' : "So'rovlari"}\n${pageInfo}\n\n${lines}`;

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Unverified managers (Super Admin only)
    bot.action('mgr_managers_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const list: UserEntity[] = await this.users.listByRole(
        UserRoleEnum.ADMIN,
        false,
      );
      if (!list.length)
        return ctx.editMessageText(
          T[lang].unverifiedManagersEmpty,
          this.backToMenuKeyboard(lang),
        );

      let message: string = `${T[lang].superAdminUnverifiedManagersBtn}:\n\n`;
      for (const m of list.slice(0, 10)) {
        message += `👨‍💼 ${m.fullname} (tg:${m.telegram_id})\n`;
      }

      const buttons = [];
      for (const m of list.slice(0, 5)) {
        buttons.push([
          Markup.button.callback(`✅ ${m.fullname}`, `verify_manager_${m.id}`),
        ]);
      }
      buttons.push([
        Markup.button.callback(T[lang].backBtn, 'mgr_back_to_menu'),
      ]);

      await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
    });

    bot.action(/^verify_manager_(\d+)$/, async (ctx): Promise<boolean> => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const verified: UserEntity = await this.users.activateUser(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);

      await ctx.reply(T[lang].managerVerifiedMsg(verified.fullname));

      // Notify manager about approval
      try {
        const mLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          mLang === language.RU
            ? 'Ваш профиль менеджера подтверждён ✅ Используйте /manager для меню.'
            : "Manager profilingiz tasdiqlandi ✅ /manager buyrug'i bilan menyudan foydalaning.",
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified manager ${verified.id}: ${String(e)}`,
        );
      }
    });

    // Approve/Reject managers from inline notification
    // Yangi role-based manager approval handlerlar
    bot.action(/^approve_manager_super_admin_(\d+)$/, async (ctx) => {
      const telegramId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const manager: UserEntity = await this.users.findByTelegramId(telegramId);
      if (!manager) return ctx.answerCbQuery(T[lang].notFound);

      // Super Admin roli bilan tasdiqlash
      await this.users.setUserRole(manager.id, UserRoleEnum.SUPER_ADMIN);
      const verified: UserEntity = await this.users.activateUser(manager.id);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `${verified.fullname} супер админ роли bilan tasdiqlandi 👑`
          : `${verified.fullname} super admin roli bilan tasdiqlandi 👑`,
      );

      // Notify manager
      try {
        const mLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          mLang === language.RU
            ? 'Ваш профиль менеджера подтверждён как Супер Админ 👑 Используйте /manager для меню.'
            : "Manager profilingiz Super Admin roli bilan tasdiqlandi 👑 /manager buyrug'i bilan menyudan foydalaning.",
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified manager ${verified.id}: ${String(e)}`,
        );
      }
    });

    bot.action(/^approve_manager_admin_(\d+)$/, async (ctx) => {
      const telegramId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const manager: UserEntity = await this.users.findByTelegramId(telegramId);
      if (!manager) return ctx.answerCbQuery(T[lang].notFound);

      // Admin roli bilan tasdiqlash
      await this.users.setUserRole(manager.id, UserRoleEnum.ADMIN);
      const verified: UserEntity = await this.users.activateUser(manager.id);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `${verified.fullname} админ роли bilan tasdiqlandi 👨‍💼`
          : `${verified.fullname} admin roli bilan tasdiqlandi 👨‍💼`,
      );

      // Notify manager
      try {
        const mLang: Lang =
          verified.language === language.RU ? language.RU : language.UZ;
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          mLang === language.RU
            ? 'Ваш профиль менеджера подтверждён как Админ 👨‍💼 Используйте /manager для меню.'
            : "Manager profilingiz Admin roli bilan tasdiqlandi 👨‍💼 /manager buyrug'i bilan menyudan foydalaning.",
        );
      } catch (e) {
        this.logger.warn(
          `Could not notify verified manager ${verified.id}: ${String(e)}`,
        );
      }
    });

    bot.action(/^reject_manager_(\d+)$/, async (ctx) => {
      const telegramId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.users.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === language.RU
          ? `Заявка менеджера #${telegramId} отклонена ❌`
          : `Manager #${telegramId} arizasi rad etildi ❌`,
      );

      // Notify manager of rejection
      try {
        const manager: UserEntity =
          await this.users.findByTelegramId(telegramId);
        if (manager) {
          const mLang: Lang =
            manager.language === language.RU ? language.RU : language.UZ;
          await this.bot.telegram.sendMessage(
            manager.telegram_id,
            mLang === language.RU
              ? 'Ваш профиль менеджера отклонён ❌'
              : 'Manager profilingiz rad etildi ❌',
          );
        }
      } catch (e) {
        this.logger.warn(
          `Could not notify rejected manager ${telegramId}: ${String(e)}`,
        );
      }
    });
  }

  // Worker ga manager qarori haqida xabar berish
  private async notifyWorkerDecision(
    requestId: number,
    decision: RequestsStatusEnum,
    managerName: string,
    comment?: string,
    managerLang?: Lang,
  ): Promise<void> {
    try {
      const request: RequestEntity =
        await this.requests.findByIdWithWorker(requestId);
      if (!request || !request.worker) return;

      const worker: UserEntity = request.worker;
      const workerLang: Lang =
        worker.language === language.RU ? language.RU : language.UZ;

      let messageText: string = '';
      if (decision === RequestsStatusEnum.APPROVED) {
        messageText =
          workerLang === language.RU
            ? `✅ Ваш запрос #${requestId} одобрен!\n👨‍💼 Менеджер: ${managerName}`
            : `✅ #${requestId} soʼrovingiz tasdiqlandi!\n👨‍💼 Manager: ${managerName}`;
      } else {
        messageText =
          workerLang === language.RU
            ? `❌ Ваш запрос #${requestId} отклонён\n👨‍💼 Менеджер: ${managerName}`
            : `❌ #${requestId} soʼrovingiz rad etildi\n👨‍💼 Manager: ${managerName}`;
      }

      if (comment && comment.trim()) {
        messageText +=
          workerLang === language.RU
            ? `\n📝 Комментарий: ${comment}`
            : `\n📝 Izoh: ${comment}`;
      }

      await this.bot.telegram
        .sendMessage(worker.telegram_id, messageText)
        .catch((e) =>
          this.logger.warn(
            `Could not notify worker ${worker.id} about decision: ${e.message}`,
          ),
        );

      // Agar tasdiqlangan bo'lsa, boshqa super adminlarga ham xabar berish
      if (decision === RequestsStatusEnum.APPROVED) {
        await this.notifyOtherSuperAdminsAboutApproval(
          requestId,
          worker,
          managerName,
          comment,
        );
      }
    } catch (e: any) {
      this.logger.error('notifyWorkerDecision error', e?.message || e);
    }
  }

  // Boshqa super adminlarga tasdiqlash haqida xabar berish
  private async notifyOtherSuperAdminsAboutApproval(
    requestId: number,
    worker: UserEntity,
    approverName: string,
    comment?: string,
  ): Promise<void> {
    try {
      const superAdmins: UserEntity[] = await this.users.listByRole(
        UserRoleEnum.SUPER_ADMIN,
      );

      if (superAdmins.length === 0) return;

      // Har bir super admin ga xabar yuborish
      for (const admin of superAdmins) {
        const adminLang: Lang =
          admin.language === language.RU ? language.RU : language.UZ;

        let messageText: string = '';
        if (adminLang === language.RU) {
          messageText = `✅ Запрос одобрен!\n\n`;
          messageText += `📋 ID: #${requestId}\n`;
          messageText += `👤 Работник: ${worker.fullname}\n`;
          messageText += `👨‍💼 Одобрил: ${approverName}`;
        } else {
          messageText = `✅ So'rov tasdiqlandi!\n\n`;
          messageText += `📋 ID: #${requestId}\n`;
          messageText += `👤 Ishchi: ${worker.fullname}\n`;
          messageText += `👨‍💼 Tasdiqlagan: ${approverName}`;
        }

        if (comment && comment.trim()) {
          messageText +=
            adminLang === language.RU
              ? `\n📝 Комментарий: ${comment}`
              : `\n📝 Izoh: ${comment}`;
        }

        await this.bot.telegram
          .sendMessage(admin.telegram_id, messageText)
          .catch((e) =>
            this.logger.warn(
              `Could not notify super admin ${admin.id} about approval: ${e.message}`,
            ),
          );
      }
    } catch (e: any) {
      this.logger.error(
        'notifyOtherSuperAdminsAboutApproval error',
        e?.message || e,
      );
    }
  }
}
