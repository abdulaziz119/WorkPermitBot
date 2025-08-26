import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Markup, Context, Telegraf } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { WorkersService } from '../workers/workers.service';
import { AttendanceService } from '../attendance/attendance.service';
import { ScenarioNotificationService } from './scenario.notification.service';
import { WorkersExcelService } from '../../../utils/workers.excel';
import { language, UserRoleEnum } from '../../../utils/enum/user.enum';
import { ManagerEntity } from '../../../entity/managers.entity';
import { RequestEntity } from '../../../entity/requests.entity';
import { WorkerEntity } from '../../../entity/workers.entity';
import { AttendanceEntity } from '../../../entity/attendance.entity';
import { RequestsStatusEnum } from '../../../utils/enum/requests.enum';

type Ctx = Context & { session?: Record<string, any> };
type Lang = language.UZ | language.RU;

const T = {
  uz: {
    managerMenuTitle: 'Manager menyusi:',
    superAdminMenuTitle: 'Super Admin menyusi:',
    notActiveManager: 'Siz active manager emassiz.',
    notSuperAdmin: 'Siz super admin emassiz.',
    activateOk:
      'Siz manager sifatida faollashtirildingiz ✅. /manager buyrugʼini bosing.',
    activateNotFound: 'Manager sifatida roʼyxatda topilmadingiz.',
    deactivateOk: 'Manager holati oʼchirildi.',
    deactivateNotFound: 'Manager sifatida topilmadingiz',
    noPermission: 'Ruxsat yoʼq',
    pendingEmpty: 'Kutilayotgan soʼrovlar yoʼq.',
    approveBtn: 'Tasdiqlash ✅',
    rejectBtn: 'Rad etish ❌',
    approvalCommentPrompt:
      'Izoh kiriting (ixtiyoriy). Ushbu xabar yuborilgach qaror saqlanadi.',
    approvedMsg: (id: number) => `#${id} tasdiqlandi ✅`,
    rejectedMsg: (id: number) => `#${id} rad etildi ❌`,
    unverifiedWorkersEmpty: 'Tasdiqlanmagan ishchilar yoʼq.',
    verifiedWorkersEmpty: 'Tasdiqlangan ishchilar yoʼq.',
    unverifiedManagersEmpty: 'Tasdiqlanmagan managerlar yoʼq.',
    workerVerifyBtn: 'Tasdiqlash 👌',
    workerVerifiedMsg: (name: string) => `Ishchi tasdiqlandi: ${name}`,
    managerVerifiedMsg: (name: string) => `Manager tasdiqlandi: ${name}`,
    managerPendingBtn: 'Kutilayotgan soʼrovlar 🔔',
    managerUnverifiedBtn: 'Tasdiqlanmagan ishchilar 👤',
    superAdminUnverifiedManagersBtn: 'Tasdiqlanmagan managerlar 👨‍💼',
    viewWorkersBtn: 'Ishchilarni koʼrish 👥',
    backBtn: 'Qaytish ◀',
    nextBtn: 'Keyingi ➡️',
    prevBtn: '⬅️ Oldingi',
    mainMenuBtn: 'Asosiy menyu 🏠',
    attendanceToday: 'Bugun',
    attendancePresent: '✅ Kelgan',
    attendanceAbsent: '❌ Kelmagan',
    exportDaily: '1 kunlik 📊',
    exportWeekly: '1 haftalik 📊',
    exportMonthly: '1 oylik 📊',
    exportYearly: '1 yillik 📊',
    notFound: 'Topilmadi',
  },
  ru: {
    managerMenuTitle: 'Меню менеджера:',
    superAdminMenuTitle: 'Меню супер админа:',
    notActiveManager: 'Вы не активный менеджер.',
    notSuperAdmin: 'Вы не супер админ.',
    activateOk: 'Вы активированы как менеджер ✅. Нажмите /manager для меню.',
    activateNotFound: 'Вы не найдены как менеджер.',
    deactivateOk: 'Статус менеджера отключён.',
    deactivateNotFound: 'Вы не найдены как менеджер.',
    noPermission: 'Нет доступа',
    pendingEmpty: 'Нет ожидающих запросов.',
    approveBtn: 'Одобрить ✅',
    rejectBtn: 'Отклонить ❌',
    approvalCommentPrompt:
      'Введите комментарий (необязательно). После отправки решение будет сохранено.',
    approvedMsg: (id: number) => `#${id} одобрен ✅`,
    rejectedMsg: (id: number) => `#${id} отклонён ❌`,
    unverifiedWorkersEmpty: 'Нет неподтверждённых работников.',
    verifiedWorkersEmpty: 'Нет подтверждённых работников.',
    unverifiedManagersEmpty: 'Нет неподтверждённых менеджеров.',
    workerVerifyBtn: 'Подтвердить 👌',
    workerVerifiedMsg: (name: string) => `Работник подтверждён: ${name}`,
    managerVerifiedMsg: (name: string) => `Менеджер подтверждён: ${name}`,
    managerPendingBtn: 'Ожидающие запросы 🔔',
    managerUnverifiedBtn: 'Неподтверждённые работники 👤',
    superAdminUnverifiedManagersBtn: 'Неподтверждённые менеджеры 👨‍💼',
    viewWorkersBtn: 'Просмотр работников 👥',
    backBtn: 'Назад ◀',
    nextBtn: 'Далее ➡️',
    prevBtn: '⬅️ Назад',
    mainMenuBtn: 'Главное меню 🏠',
    attendanceToday: 'Сегодня',
    attendancePresent: '✅ Пришёл',
    attendanceAbsent: '❌ Не пришёл',
    exportDaily: '1 день 📊',
    exportWeekly: '1 неделя 📊',
    exportMonthly: '1 месяц 📊',
    exportYearly: '1 год 📊',
    notFound: 'Не найдено',
  },
} as const;

@Injectable()
export class ScenarioDashboardService implements OnModuleInit {
  private readonly logger: Logger = new Logger(ScenarioDashboardService.name);
  private readonly bot: Telegraf<Ctx>;

  constructor(
    private readonly managers: ManagersService,
    private readonly requests: RequestsService,
    private readonly workers: WorkersService,
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
      const m: ManagerEntity = await this.managers.findByTelegramId(tgId);
      if (m?.language)
        return m.language === language.RU ? language.RU : language.UZ;
    }
    return language.UZ;
  }

  private managerMenu(lang: Lang) {
    const tr = T[lang];
    return Markup.inlineKeyboard([
      [Markup.button.callback(tr.managerPendingBtn, 'mgr_pending')],
      [Markup.button.callback(tr.managerUnverifiedBtn, 'mgr_workers_pending')],
      [Markup.button.callback(tr.viewWorkersBtn, 'mgr_view_workers')],
    ]);
  }

  private superAdminMenu(lang: Lang) {
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

  private backToMenuKeyboard(lang: Lang) {
    const tr = T[lang];
    return Markup.inlineKeyboard([
      [Markup.button.callback(tr.mainMenuBtn, 'mgr_back_to_menu')],
    ]);
  }

  // Quick helper to show main menu after actions
  private async showManagerMenuShortcut(
    ctx: Ctx,
    lang: Lang,
    telegramId: number,
  ): Promise<void> {
    try {
      const isSuperAdmin: boolean =
        await this.managers.isSuperAdmin(telegramId);
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

    // Manager menu
    bot.command('manager', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.reply(T[lang].notActiveManager);

      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);
      await ctx.reply(T[lang].superAdminMenuTitle, this.superAdminMenu(lang));
    });

    // Manual test command for checking old responses
    bot.command('checkoldresponses', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result: string =
        await this.notificationService.manualCheckOldResponses(3);
      await ctx.reply(`🔍 3 kunlik check natijasi:\n${result}`);
    });

    // Test for 5 days
    bot.command('check5days', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result: string =
        await this.notificationService.manualCheckOldResponses(5);
      await ctx.reply(`🔍 5 kunlik check natijasi:\n${result}`);
    });

    // Test for 7 days (1 week)
    bot.command('check1week', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.reply(T[lang].notSuperAdmin);

      const result = await this.notificationService.manualCheckOldResponses(7);
      await ctx.reply(`🔍 1 haftalik check natijasi:\n${result}`);
    });

    bot.command('activate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m: ManagerEntity = await this.managers.activate(tg.id);
      if (!m) return ctx.reply(T[lang].activateNotFound);
      await ctx.reply(T[lang].activateOk);
    });

    bot.command('deactivate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m: ManagerEntity = await this.managers.deactivate(tg.id);
      if (!m) return ctx.reply(T[lang].deactivateNotFound);
      await ctx.reply(T[lang].deactivateOk);
    });

    // Pending requests list
    bot.action('mgr_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const pending: RequestEntity[] = await this.requests.listPending();
      if (!pending.length)
        return ctx.editMessageText(
          T[lang].pendingEmpty,
          this.backToMenuKeyboard(lang),
        );

      const message = `${T[lang].managerPendingBtn}:\n\n`;
      for (const r of pending.slice(0, 10)) {
        const workerName: string =
          r.worker?.fullname || `Worker ID: ${r.worker_id}`;

        // Format dates and calculate days
        let dateInfo: string = '';
        let daysCount: string = '';

        if (r.approved_date) {
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

        const messageText: string = [
          `#${r.id}`,
          `👤 ${workerName}`,
          dateInfo,
          daysCount,
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const comment = ''; // Bo'sh izoh

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}

      if (action === 'approve') {
        await this.requests.approve(requestId, manager.id, comment);
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

      ctx.session['approval_target'] = undefined;
    });

    // Izoh bilan tasdiqlash/rad etish
    bot.action(/^(approve|reject)_with_comment_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId: number = Number(idStr);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

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
        const manager: ManagerEntity = await this.managers.findByTelegramId(
          tg.id,
        );
        if (!manager || !manager.is_active) {
          ctx.session['approval_target'] = undefined;
          return ctx.reply(T[lang].noPermission);
        }
        const comment: string = ctx.message.text.trim();
        if (target.action === 'approve') {
          await this.requests.approve(target.requestId, manager.id, comment);
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
        ctx.session['approval_target'] = undefined;
        return; // handled
      }
      return next?.();
    });

    // Unverified workers
    bot.action('mgr_workers_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const list: WorkerEntity[] = await this.workers.listUnverified(10);
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      const verified: WorkerEntity = await this.workers.verifyWorker(id);
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
    bot.action(/^approve_worker_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );

      // Faqat admin roli bilan managerlar tasdiqlashi mumkin
      const isAdminManager: boolean = await this.managers.isAdmin(tg.id);
      if (!manager || !manager.is_active || !isAdminManager)
        return ctx.answerCbQuery(T[lang].noPermission);

      const verified: WorkerEntity = await this.workers.verifyWorker(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(T[lang].workerVerifiedMsg(verified.fullname));
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

    bot.action(/^reject_worker_(\d+)$/, async (ctx) => {
      const id: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );

      // Faqat admin roli bilan managerlar rad etishi mumkin
      const isAdminManager: boolean = await this.managers.isAdmin(tg.id);
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
        const w: WorkerEntity = await this.workers.findById(id);
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const page: number = ctx.match[1] ? Number(ctx.match[1]) : 1;
      const result = await this.workers.listVerifiedPaginated(page, 5);

      if (result.workers.length === 0) {
        return ctx.editMessageText(
          T[lang].verifiedWorkersEmpty,
          this.backToMenuKeyboard(lang),
        );
      }

      const message = `${T[lang].viewWorkersBtn} (${page}/${Math.ceil(result.total / 5)}):\n`;

      const buttons: any[] = [];

      // Worker buttons with attendance status
      for (const worker of result.workers) {
        const todayAttendance: AttendanceEntity =
          await this.attendance.getToday(worker.id);
        const status = todayAttendance?.check_in
          ? T[lang].attendancePresent
          : T[lang].attendanceAbsent;

        buttons.push([
          Markup.button.callback(
            `${status} ${worker.fullname}`,
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const worker: WorkerEntity = await this.workers.findById(workerId);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      const todayAttendance: AttendanceEntity = await this.attendance.getToday(
        worker.id,
      );
      const status = todayAttendance?.check_in
        ? T[lang].attendancePresent
        : T[lang].attendanceAbsent;

      const message = `👤 ${worker.fullname}\n${T[lang].attendanceToday}: ${status}\n\nDavomat hisobotini yuklab olish:`;

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
        [Markup.button.callback(T[lang].backBtn, 'mgr_view_workers')],
      ];

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Export handlers
    bot.action(/^mgr_export_(day|week|month|year)$/, async (ctx) => {
      const period = ctx.match[1] as 'day' | 'week' | 'month' | 'year';
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.answerCbQuery('📊 Excel fayl tayyorlanmoqda...');

        const workers: WorkerEntity[] = await this.workers.listVerified();
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
        const manager: ManagerEntity = await this.managers.findByTelegramId(
          tg.id,
        );
        if (!manager || !manager.is_active)
          return ctx.answerCbQuery(T[lang].noPermission);

        try {
          await ctx.answerCbQuery('📊 Excel fayl tayyorlanmoqda...');

          const worker: WorkerEntity = await this.workers.findById(workerId);
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
      const manager: ManagerEntity = await this.managers.findByTelegramId(
        tg.id,
      );
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);

      const worker: WorkerEntity = await this.workers.findById(workerId);
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const list: ManagerEntity[] = await this.managers.listUnverified();
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const verified: ManagerEntity = await this.managers.verifyManager(id);
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const manager: ManagerEntity =
        await this.managers.findByTelegramId(telegramId);
      if (!manager) return ctx.answerCbQuery(T[lang].notFound);

      // Super Admin roli bilan tasdiqlash
      const verified: ManagerEntity = await this.managers.verifyManagerWithRole(
        manager.id,
        UserRoleEnum.SUPER_ADMIN,
      );
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
      if (!isSuperAdmin) return ctx.answerCbQuery(T[lang].noPermission);

      const manager: ManagerEntity =
        await this.managers.findByTelegramId(telegramId);
      if (!manager) return ctx.answerCbQuery(T[lang].notFound);

      // Admin roli bilan tasdiqlash
      const verified: ManagerEntity = await this.managers.verifyManagerWithRole(
        manager.id,
        UserRoleEnum.ADMIN,
      );
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
      const isSuperAdmin: boolean = await this.managers.isSuperAdmin(tg.id);
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
        const manager: ManagerEntity =
          await this.managers.findByTelegramId(telegramId);
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

      const worker: WorkerEntity = request.worker;
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
    } catch (e: any) {
      this.logger.error('notifyWorkerDecision error', e?.message || e);
    }
  }
}
