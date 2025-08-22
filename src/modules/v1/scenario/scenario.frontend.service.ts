import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { WorkersService } from '../workers/workers.service';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UserRoleEnum } from '../../../utils/enum/user.enum';

type Ctx = Context & { session?: Record<string, any> };

type Lang = 'uz' | 'ru';
const T = {
  uz: {
    chooseLang: 'Tilni tanlang:',
    langUz: '🇺🇿 Oʻzbekcha',
    langRu: '🇷🇺 Русский',
    chooseRole: 'Rolingizni tanlang:',
    roleWorker: '👷 Ishchi',
    roleManager: '👨‍💼 Menejer',
    workerCreated: 'Ishchi profili yaratildi. Menejer tasdigʻini kuting.',
    managerCreated:
      'Menejer profili yaratildi. Super admin tasdiqlashi kutilmoqda.',
    saved: 'Saqlandi ✅',
    enterFullname: 'Iltimos, toʼliq ismingizni kiriting:',
    invalidFullname: 'Ism juda qisqa. Iltimos, toʼliq ismingizni kiriting.',
    greetingVerified: (name: string) => `Salom, ${name}. Asosiy menyu:`,
    greetingPending: (name: string) =>
      `Salom, ${name}. Roʼyxatdan oʼtish uchun menejer tasdiqlashi kerak.`,
    greetingManagerPending: (name: string) =>
      `Salom, ${name}. Roʼyxatdan oʼtish uchun super admin tasdiqlashi kerak.`,
    btnCheckIn: 'Kelish (Check-in) ✅',
    btnCheckOut: 'Ketish (Check-out) 🕘',
    btnRequestLeave: 'Javob soʼrash 📝',
    btnMyRequests: 'Mening soʼrovlarim 📄',
    backBtn: 'Qaytish ◀',
    btnWaiting: 'Tasdiqlashni kutish ⏳',
    statusPending: 'Kutilmoqda',
    statusApproved: 'Ruxsat',
    statusRejected: 'Javob berilmadi',
    notVerified: 'Siz hali tasdiqlanmagansiz',
    checkInDone: 'Check-in qayd etildi ✅',
    checkOutDone: 'Check-out qayd etildi 🕘',
    checkInAlready: 'Bugun allaqachon check-in qilingan.',
    checkOutAlready: 'Bugun allaqachon check-out qilingan.',
    checkInRequired: 'Avval check-in bosing, soʼng check-out.',
    enterDate:
      'Iltimos, ruxsat olinadigan sanani kiriting (format: DD.MM yoki DD-MM). Masalan: 22.08',
    invalidDate:
      'Notoʼgʼri sana. Iltimos, DD.MM formatida kiriting. Masalan: 05.09',
    enterReasonShort: 'Sababni yozing (masalan: oilaviy ishlar).',
    enterReason:
      'Iltimos, javob sababi va sanasini kiriting. Masalan: "22-avgust – oilaviy ishlar"',
    requestAccepted: (id: number) =>
      `Soʼrovingiz qabul qilindi (#${id}). Menejer tasdiqlashi kutilmoqda.`,
    newRequestNotify: (id: number, workerId: number, reason: string) =>
      `Yangi soʼrov #${id} • Worker:${workerId} • ${reason}`,
    noRequests: 'Sizda soʼrovlar yoʼq.',
    managerMenuTitle: 'Manager menyusi:',
    notActiveManager: 'Siz active manager emassiz.',
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
    workerVerifyBtn: 'Tasdiqlash 👌',
    workerVerifiedMsg: (name: string) => `Ishchi tasdiqlandi: ${name}`,
    newWorkerNotify: (name: string, tgId: number) =>
      `Yangi ishchi: ${name} (tg:${tgId}). Tasdiqlash kerak.`,
    managerMenuHint: 'Manager menyusi uchun /manager buyrugʼidan foydalaning.',
    managerPendingBtn: 'Kutilayotgan soʼrovlar 🔔',
    managerUnverifiedBtn: 'Tasdiqlanmagan ishchilar 👤',
    viewWorkersBtn: 'Ishchilarni koʼrish 👥',
    notFound: 'Topilmadi',
    commentLabel: 'Izoh',
    approvedByManager: 'Profilingiz menejer tomonidan tasdiqlandi ✅',
  },
  ru: {
    chooseLang: 'Выберите язык:',
    langUz: '🇺🇿 Узбекский',
    langRu: '🇷🇺 Русский',
    chooseRole: 'Выберите свою роль:',
    roleWorker: '👷 Работник',
    roleManager: '👨‍💼 Менеджер',
    workerCreated:
      'Профиль работника создан. Ожидайте подтверждения менеджера.',
    managerCreated:
      'Профиль менеджера создан. Ожидается подтверждение супер админа.',
    saved: 'Сохранено ✅',
    enterFullname: 'Пожалуйста, введите ваше полное имя:',
    invalidFullname: 'Слишком короткое имя. Введите полное имя.',
    greetingVerified: (name: string) => `Здравствуйте, ${name}. Главное меню:`,
    greetingPending: (name: string) =>
      `Здравствуйте, ${name}. Для завершения регистрации менеджер должен подтвердить вас.`,
    greetingManagerPending: (name: string) =>
      `Здравствуйте, ${name}. Для завершения регистрации супер админ должен подтвердить вас.`,
    btnCheckIn: 'Пришёл (Check-in) ✅',
    btnCheckOut: 'Ушёл (Check-out) 🕘',
    btnRequestLeave: 'Запросить отгул 📝',
    btnMyRequests: 'Мои запросы 📄',
    backBtn: 'Назад ◀',
    btnWaiting: 'Ожидается подтверждение ⏳',
    statusPending: 'В ожидании',
    statusApproved: 'Одобрено',
    statusRejected: 'Не одобрено',
    notVerified: 'Вы ещё не подтверждены',
    checkInDone: 'Check-in записан ✅',
    checkOutDone: 'Check-out записан 🕘',
    checkInAlready: 'Сегодня check-in уже выполнен.',
    checkOutAlready: 'Сегодня check-out уже выполнен.',
    checkInRequired: 'Сначала выполните check-in, затем check-out.',
    enterDate:
      'Пожалуйста, введите дату отгула (формат: ДД.ММ или ДД-ММ). Например: 22.08',
    invalidDate: 'Неверная дата. Введите в формате ДД.ММ. Например: 05.09',
    enterReasonShort: 'Введите причину (например: семейные дела).',
    enterReason:
      'Пожалуйста, введите причину и дату. Например: "22-августа – семейные дела"',
    requestAccepted: (id: number) =>
      `Ваш запрос принят (#${id}). Ожидается подтверждение менеджера.`,
    newRequestNotify: (id: number, workerId: number, reason: string) =>
      `Новый запрос #${id} • Worker:${workerId} • ${reason}`,
    noRequests: 'У вас нет запросов.',
    managerMenuTitle: 'Меню менеджера:',
    notActiveManager: 'Вы не активный менеджер.',
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
    workerVerifyBtn: 'Подтвердить 👌',
    workerVerifiedMsg: (name: string) => `Работник подтверждён: ${name}`,
    newWorkerNotify: (name: string, tgId: number) =>
      `Новый работник: ${name} (tg:${tgId}). Требуется подтверждение.`,
    managerMenuHint: 'Для меню менеджера используйте команду /manager.',
    managerPendingBtn: 'Ожидающие запросы 🔔',
    managerUnverifiedBtn: 'Неподтверждённые работники 👤',
    viewWorkersBtn: 'Просмотр работников 👥',
    notFound: 'Не найдено',
    commentLabel: 'Комментарий',
    approvedByManager: 'Ваш профиль подтверждён менеджером ✅',
  },
} as const;

@Injectable()
export class ScenarioFrontendService implements OnModuleInit {
  private readonly logger = new Logger(ScenarioFrontendService.name);
  private readonly bot: Telegraf<Ctx>;
  private reminderState = {
    lastDateKey: '',
    doneMorning: new Set<number>(), // telegram ids
    doneEvening: new Set<number>(),
  };

  constructor(
    private readonly workers: WorkersService,
    private readonly managers: ManagersService,
    private readonly requests: RequestsService,
    private readonly attendance: AttendanceService,
  ) {
    this.bot = getBot();
  }

  onModuleInit() {
    this.registerHandlers();
    ensureBotLaunched(this.logger).catch(() => void 0);
    this.startReminderLoop();
  }

  private async getLang(ctx: Ctx): Promise<Lang> {
    // prefer session
    const sessLang = ctx.session?.lang as Lang | undefined;
    if (sessLang) return sessLang;
    const tgId = Number(ctx.from?.id);
    if (tgId) {
      const w = await this.workers.findByTelegramId(tgId);
      if (w?.language) return w.language as Lang;
      const m = await this.managers.findByTelegramId(tgId);
      if (m?.language) return m.language as Lang;
    }
    return 'uz';
  }

  private mainMenu(isVerified: boolean, lang: Lang) {
    const tr = T[lang];
    const buttons = [] as any[];
    if (isVerified) {
      buttons.push([Markup.button.callback(tr.btnCheckIn, 'check_in')]);
      buttons.push([Markup.button.callback(tr.btnCheckOut, 'check_out')]);
      buttons.push([
        Markup.button.callback(tr.btnRequestLeave, 'request_leave'),
      ]);
      buttons.push([Markup.button.callback(tr.btnMyRequests, 'my_requests')]);
    } else {
      buttons.push([Markup.button.callback(tr.btnWaiting, 'noop')]);
    }
    return Markup.inlineKeyboard(buttons);
  }

  private backKeyboard(lang: Lang) {
    const tr = T[lang];
    return Markup.inlineKeyboard([
      [Markup.button.callback(tr.backBtn, 'back_to_menu')],
    ]);
  }

  // Always send a fresh message at bottom (after deleting old inline one)
  private async replyFresh(
    ctx: Ctx,
    text: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
  ) {
    try {
      if ('message' in ctx.callbackQuery) await ctx.deleteMessage();
    } catch {}
    return ctx.reply(text, keyboard);
  }

  private statusLabel(lang: Lang, status: string): string {
    if (lang === 'ru') {
      if (status === 'pending') return `⏳ ${T.ru.statusPending}`;
      if (status === 'approved') return `✅ ${T.ru.statusApproved}`;
      if (status === 'rejected') return `❌ ${T.ru.statusRejected}`;
      return status;
    }
    if (status === 'pending') return `⏳ ${T.uz.statusPending}`;
    if (status === 'approved') return `✅ ${T.uz.statusApproved}`;
    if (status === 'rejected') return `❌ ${T.uz.statusRejected}`;
    return status;
  }

  private parseDayMonth(input: string): Date | null {
    const cleaned = (input || '').trim();
    const m = cleaned.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
    if (!m) return null;
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const now = new Date();
    const y = m[3]
      ? Number(m[3].length === 2 ? '20' + m[3] : m[3])
      : now.getFullYear();
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== mo - 1 ||
      dt.getUTCDate() !== d
    )
      return null;
    return dt;
  }

  private async showManagerMenuIfActive(ctx: Ctx, manager: any, lang: Lang) {
    if (!manager.is_active) {
      await ctx.reply(
        T[lang].greetingManagerPending(manager.fullname),
        this.mainMenu(false, lang), // Show waiting buttons
      );
      return;
    }

    const tr = T[lang];
    const isSuperAdmin = await this.managers.isSuperAdmin(manager.telegram_id);
    const menuButtons: any[] = [];

    // Pending requests
    menuButtons.push([
      Markup.button.callback(tr.managerPendingBtn, 'mgr_pending'),
    ]);

    // Unverified workers
    menuButtons.push([
      Markup.button.callback(tr.managerUnverifiedBtn, 'mgr_workers_pending'),
    ]);

    // Super admin only: unverified managers
    if (isSuperAdmin) {
      menuButtons.push([
        Markup.button.callback(
          lang === 'ru'
            ? 'Неподтверждённые менеджеры 👨‍💼'
            : 'Tasdiqlanmagan managerlar 👨‍💼',
          'mgr_managers_pending',
        ),
      ]);
    }

    // View workers
    menuButtons.push([
      Markup.button.callback(tr.viewWorkersBtn, 'mgr_view_workers'),
    ]);

    const title = isSuperAdmin
      ? lang === 'ru'
        ? 'Меню супер админа:'
        : 'Super Admin menyusi:'
      : lang === 'ru'
        ? 'Меню менеджера:'
        : 'Manager menyusi:';
    await ctx.reply(title, Markup.inlineKeyboard(menuButtons));
  }

  // manager menu is handled in dashboard service

  private registerHandlers() {
    const bot = this.bot;

    bot.start(async (ctx) => {
      const tg = ctx.from;
      const full =
        [tg.first_name, tg.last_name].filter(Boolean).join(' ') ||
        tg.username ||
        'User';
      ctx.session ??= {};
      ctx.session.fullname = full;
      ctx.session.tgId = tg.id;

      // If user already exists, skip language/role prompt
      const existingWorker = await this.workers.findByTelegramId(tg.id);
      const existingManager = await this.managers.findByTelegramId(tg.id);
      if (existingWorker || existingManager) {
        const lang = await this.getLang(ctx);
        ctx.session.lang = lang;
        if (existingWorker) {
          const tr = T[lang];
          await ctx.reply(
            existingWorker.is_verified
              ? tr.greetingVerified(existingWorker.fullname)
              : tr.greetingPending(existingWorker.fullname),
            this.mainMenu(!!existingWorker.is_verified, lang),
          );
        } else if (existingManager) {
          // Show manager menu automatically if active
          await this.showManagerMenuIfActive(ctx, existingManager, lang);
        }
        return;
      }

      // Ask language (first time)
      const kb = Markup.inlineKeyboard([
        [
          Markup.button.callback(T.uz.langUz, 'lang_uz'),
          Markup.button.callback(T.ru.langRu, 'lang_ru'),
        ],
      ]);
      await ctx.reply(`${T.uz.chooseLang}\n${T.ru.chooseLang}`, kb);
      ctx.session.step = 'choose_lang';
    });

    // Language selection
    bot.action(['lang_uz', 'lang_ru'], async (ctx) => {
      ctx.session ??= {};
      const lang: Lang = ctx.match[0] === 'lang_ru' ? 'ru' : 'uz';
      ctx.session.lang = lang;
      const tr = T[lang];

      // Try update language if user already exists as worker/manager
      const tgId = Number(ctx.from?.id);
      const w = await this.workers.findByTelegramId(tgId);
      if (w) await this.workers.setLanguage(tgId, lang);
      const m = await this.managers.findByTelegramId(tgId);
      if (m) await this.managers.setLanguage(tgId, lang);

      // Ask role
      const kb = Markup.inlineKeyboard([
        [
          Markup.button.callback(tr.roleWorker, 'role_worker'),
          Markup.button.callback(tr.roleManager, 'role_manager'),
        ],
      ]);
      await ctx.editMessageText(tr.chooseRole, kb);
      ctx.session.step = 'choose_role';
    });

    // Role selection (ask user to enter fullname next)
    bot.action(['role_worker', 'role_manager'], async (ctx) => {
      ctx.session ??= {};
      const lang: Lang = ctx.session.lang || 'uz';
      const tr = T[lang];
      const tgId = Number(ctx.from?.id);
      const isWorker = ctx.match[0] === 'role_worker';

      if (isWorker) {
        // Prevent dual creation: if already manager, do not create worker
        const manager = await this.managers.findByTelegramId(tgId);
        if (manager) {
          await ctx.editMessageText(tr.saved);
          return;
        }
        ctx.session.pending_role = 'worker';
        await ctx.editMessageText(tr.enterFullname);
      } else {
        // Prevent dual creation: if already worker, do not create manager
        const worker = await this.workers.findByTelegramId(tgId);
        if (worker) {
          await ctx.editMessageText(tr.saved);
          return;
        }
        ctx.session.pending_role = 'manager';
        await ctx.editMessageText(tr.enterFullname);
      }

      ctx.session.step = 'await_fullname';
    });

    // No-op button
    bot.action('noop', async (ctx) => {
      const lang = await this.getLang(ctx);
      return ctx.answerCbQuery(T[lang].btnWaiting.replace(/[^\w\s]+$/, ''));
    });

    // Worker flow: Check-in / Check-out with message cleanup
    bot.action('check_in', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      try {
        await this.attendance.checkIn(worker.id);
      } catch (e: any) {
        const code = e?.code || e?.message;
        if (code === 'CHECKIN_ALREADY_DONE')
          return ctx.answerCbQuery(T[lang].checkInAlready, {
            show_alert: true,
          });
        throw e;
      }
      // try clean previous inline keyboard/message
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      try {
        if ('message' in ctx.callbackQuery) await ctx.deleteMessage();
      } catch {}
      await ctx.reply(T[lang].checkInDone, this.mainMenu(true, lang));
    });

    bot.action('check_out', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      try {
        await this.attendance.checkOut(worker.id);
      } catch (e: any) {
        const code = e?.code || e?.message;
        if (code === 'CHECKIN_REQUIRED')
          return ctx.answerCbQuery(T[lang].checkInRequired, {
            show_alert: true,
          });
        if (code === 'CHECKOUT_ALREADY_DONE')
          return ctx.answerCbQuery(T[lang].checkOutAlready, {
            show_alert: true,
          });
        throw e;
      }
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      try {
        if ('message' in ctx.callbackQuery) await ctx.deleteMessage();
      } catch {}
      await ctx.reply(T[lang].checkOutDone, this.mainMenu(true, lang));
    });

    // Worker: create request (two-step: date -> reason)
    bot.action('request_leave', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      ctx.session ??= {};
      ctx.session['req_flow'] = { step: 'await_date' };
      await ctx.reply(T[lang].enterDate, this.backKeyboard(lang));
    });

    bot.on('text', async (ctx, next) => {
      // Step: collect fullname after role selection
      if (ctx.session?.step === 'await_fullname' && ctx.session?.pending_role) {
        const lang = await this.getLang(ctx);
        const name = (ctx.message.text || '').trim();
        if (name.length < 3) {
          await ctx.reply(T[lang].invalidFullname);
          return; // keep waiting for proper fullname
        }
        const tgId = Number(ctx.from?.id);
        const role = ctx.session.pending_role as 'worker' | 'manager';
        if (role === 'worker') {
          const worker = await this.workers.createOrGet(tgId, name, lang);
          await ctx.reply(T[lang].workerCreated);
          if (!worker.is_verified) {
            await this.notifyManagersNewWorker({
              id: worker.id,
              fullname: worker.fullname,
              telegram_id: tgId,
            });
          }
          await ctx.reply(
            worker.is_verified
              ? T[lang].greetingVerified(worker.fullname)
              : T[lang].greetingPending(worker.fullname),
            this.mainMenu(worker.is_verified, lang),
          );
        } else {
          const manager = await this.managers.createIfNotExists(
            tgId,
            name,
            lang,
          );
          await ctx.reply(T[lang].managerCreated);
          // Notify super admins about new manager
          await this.notifySuperAdminsNewManager({
            telegram_id: tgId,
            fullname: name,
            language: lang,
          });
          // Show waiting message for manager
          await ctx.reply(
            manager.is_active
              ? T[lang].greetingVerified(manager.fullname)
              : T[lang].greetingManagerPending(manager.fullname),
            this.mainMenu(false, lang), // Show waiting buttons for unverified manager
          );
        }
        ctx.session.step = undefined;
        ctx.session.pending_role = undefined;
        return; // stop here
      }
      // New flow: ask date then reason
      const flow = ctx.session?.['req_flow'];
      if (flow?.step === 'await_date') {
        const lang = await this.getLang(ctx);
        const dt = this.parseDayMonth(ctx.message.text);
        if (!dt) {
          await ctx.reply(T[lang].invalidDate, this.backKeyboard(lang));
          return; // keep waiting for valid date
        }
        ctx.session['req_flow'] = {
          step: 'await_reason',
          approvedDate: dt.toISOString(),
        };
        await ctx.reply(T[lang].enterReasonShort, this.backKeyboard(lang));
        return;
      }
      if (flow?.step === 'await_reason') {
        const tg = ctx.from;
        const worker = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['req_flow'] = undefined;
          return ctx.reply(T[lang].notVerified);
        }
        const reason = ctx.message.text.trim();
        const approvedDate = flow.approvedDate
          ? new Date(flow.approvedDate)
          : undefined;
        const req = await this.requests.createRequest(
          worker.id,
          reason,
          approvedDate,
        );
        ctx.session['req_flow'] = undefined;
        await ctx.reply(
          T[lang].requestAccepted(req.id),
          this.mainMenu(true, lang),
        );
        await this.notifyManagersNewRequest(req.id, worker, reason);
        return; // stop here
      }
      // Legacy single-step fallback
      if (ctx.session?.['awaiting_reason']) {
        const tg = ctx.from;
        const worker = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['awaiting_reason'] = false;
          return ctx.reply(T[lang].notVerified);
        }
        const reason = ctx.message.text.trim();
        const req = await this.requests.createRequest(worker.id, reason);
        ctx.session['awaiting_reason'] = false;
        await ctx.reply(
          T[lang].requestAccepted(req.id),
          this.mainMenu(true, lang),
        );
        await this.notifyManagersNewRequest(req.id, worker, reason);
        return;
      }
      return next();
    });

    // Worker: list my requests
    bot.action('my_requests', async (ctx) => {
      const tg = ctx.from;
      const worker = await this.workers.findByTelegramId(tg.id);
      const lang = await this.getLang(ctx);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);
      const list = await this.requests.listByWorker(worker.id);
      if (!list.length)
        return this.replyFresh(
          ctx,
          T[lang].noRequests,
          this.backKeyboard(lang),
        );
      const lines = list
        .slice(0, 10)
        .map((r) => {
          const statusText = this.statusLabel(lang, String(r.status));
          const dateText = r.approved_date
            ? (() => {
                const d = new Date(r.approved_date);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                return `📅 ${dd}.${mm}`;
              })()
            : '';
          const reasonText = `📝 ${r.reason}`;
          const commentText = r.manager_comment
            ? `\n${T[lang].commentLabel}: ${r.manager_comment}`
            : '';

          return `#${r.id} • ${statusText}${dateText ? `\n${dateText}` : ''}\n${reasonText}${commentText}`;
        })
        .join('\n\n');
      await this.replyFresh(ctx, lines, this.backKeyboard(lang));
    });

    // Back to main menu from lists
    bot.action('back_to_menu', async (ctx) => {
      const lang = await this.getLang(ctx);
      const tgId = Number(ctx.from?.id);
      // Clear any pending flows (date/reason etc.)
      if (ctx.session) {
        ctx.session['req_flow'] = undefined;
        ctx.session['awaiting_reason'] = false;
        ctx.session['step'] = undefined;
        ctx.session['pending_role'] = undefined;
      }
      const worker = await this.workers.findByTelegramId(tgId);
      const isVerified = !!worker?.is_verified;
      const text = worker
        ? isVerified
          ? T[lang].greetingVerified(worker.fullname)
          : T[lang].greetingPending(worker.fullname)
        : T[lang].notFound;
      await this.replyFresh(ctx, text, this.mainMenu(isVerified, lang));
    });
    // Manager flows moved to ScenarioDashboardService
  }

  private async notifyManagersByLang(messageUz: string, messageRu: string) {
    try {
      const managers = await this.managers.listActive();
      await Promise.all(
        managers.map((m) => {
          const msg = m.language === 'ru' ? messageRu : messageUz;
          return this.bot.telegram
            .sendMessage(m.telegram_id, msg)
            .catch((e) =>
              this.logger.warn(`Notify fail to ${m.telegram_id}: ${e.message}`),
            );
        }),
      );
    } catch (e: any) {
      this.logger.error('notifyManagersByLang error', e?.message || e);
    }
  }

  private async notifyManagersNewWorker(worker: {
    id: number;
    fullname: string;
    telegram_id: number;
  }) {
    try {
      const managers = await this.managers.listActive();

      // Faqat admin roli bilan managerlarni filter qilish
      const adminManagers = [];
      for (const manager of managers) {
        const isAdminManager = await this.managers.isAdmin(manager.telegram_id);
        if (isAdminManager) {
          adminManagers.push(manager);
        }
      }

      await Promise.all(
        adminManagers.map(async (m) => {
          const text =
            m.language === 'ru'
              ? `Новый работник: ${worker.fullname} (tg:${worker.telegram_id}). Требуется подтверждение.`
              : `Yangi ishchi: ${worker.fullname} (tg:${worker.telegram_id}). Tasdiqlash kerak.`;
          const kb = Markup.inlineKeyboard([
            [
              Markup.button.callback(
                m.language === 'ru' ? 'Подтвердить 👌' : 'Tasdiqlash 👌',
                `approve_worker_${worker.id}`,
              ),
              Markup.button.callback(
                m.language === 'ru' ? 'Отклонить ❌' : 'Rad etish ❌',
                `reject_worker_${worker.id}`,
              ),
            ],
          ]);
          await this.bot.telegram
            .sendMessage(m.telegram_id, text, kb)
            .catch((e) =>
              this.logger.warn(
                `Notify new worker fail to ${m.telegram_id}: ${e.message}`,
              ),
            );
        }),
      );
    } catch (e: any) {
      this.logger.error('notifyManagersNewWorker error', e?.message || e);
    }
  }

  private async notifySuperAdminsNewManager(manager: {
    telegram_id: number;
    fullname: string;
    language: 'uz' | 'ru';
  }) {
    try {
      const superAdmins = await this.managers.listSuperAdmins();
      await Promise.all(
        superAdmins.map(async (admin) => {
          const text =
            admin.language === 'ru'
              ? `Новый менеджер: ${manager.fullname} (tg:${manager.telegram_id}). Выберите роль:`
              : `Yangi menejer: ${manager.fullname} (tg:${manager.telegram_id}). Rolni tanlang:`;
          const kb = Markup.inlineKeyboard([
            [
              Markup.button.callback(
                admin.language === 'ru' ? 'Супер Админ �' : 'Super Admin 👑',
                `approve_manager_super_admin_${manager.telegram_id}`,
              ),
            ],
            [
              Markup.button.callback(
                admin.language === 'ru' ? 'Админ 👨‍💼' : 'Admin 👨‍�',
                `approve_manager_admin_${manager.telegram_id}`,
              ),
            ],
            [
              Markup.button.callback(
                admin.language === 'ru' ? 'Отклонить ❌' : 'Rad etish ❌',
                `reject_manager_${manager.telegram_id}`,
              ),
            ],
          ]);
          await this.bot.telegram
            .sendMessage(admin.telegram_id, text, kb)
            .catch((e) =>
              this.logger.warn(
                `Notify new manager fail to ${admin.telegram_id}: ${e.message}`,
              ),
            );
        }),
      );
    } catch (e: any) {
      this.logger.error('notifySuperAdminsNewManager error', e?.message || e);
    }
  }

  // --- Reminders ---
  private startReminderLoop() {
    // Tick every 30 seconds
    setInterval(() => this.reminderTick().catch(() => void 0), 30_000);
  }

  private dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async reminderTick() {
    const now = new Date();
    const key = this.dateKey(now);
    if (key !== this.reminderState.lastDateKey) {
      this.reminderState.lastDateKey = key;
      this.reminderState.doneMorning.clear();
      this.reminderState.doneEvening.clear();
    }

    const hh = now.getHours();
    const mm = now.getMinutes();

    // 08:40 check-in reminder
    if (hh === 8 && mm === 40) {
      await this.sendCheckInReminders();
    }

    // 17:59 check-out reminder
    if (hh === 17 && mm === 59) {
      await this.sendCheckOutReminders();
    }
  }

  private async sendCheckInReminders() {
    try {
      const workers = await this.workers.listVerified();
      await Promise.all(
        workers.map(async (w) => {
          if (this.reminderState.doneMorning.has(w.telegram_id)) return;
          const lang: Lang = (w.language as any) || 'uz';
          const text =
            lang === 'ru'
              ? 'Через 10 минут начинается работа. Нажмите Пришёл (Check-in) ✅'
              : '10 daqiqadan soʼng ish boshlanadi. Kelish (Check-in) ✅ tugmasini bosing.';
          await this.bot.telegram
            .sendMessage(w.telegram_id, text)
            .then(() => this.reminderState.doneMorning.add(w.telegram_id))
            .catch(() => void 0);
        }),
      );
    } catch (e) {
      this.logger.warn('sendCheckInReminders failed');
    }
  }

  private async sendCheckOutReminders() {
    try {
      const workers = await this.workers.listVerified();
      await Promise.all(
        workers.map(async (w) => {
          if (this.reminderState.doneEvening.has(w.telegram_id)) return;
          const lang: Lang = (w.language as any) || 'uz';
          const text =
            lang === 'ru'
              ? 'Рабочее время завершается. Не забудьте нажать Ушёл (Check-out) 🕘'
              : 'Ish vaqti tugamoqda. Ketish (Check-out) 🕘 tugmasini bosishni unutmang.';
          await this.bot.telegram
            .sendMessage(w.telegram_id, text)
            .then(() => this.reminderState.doneEvening.add(w.telegram_id))
            .catch(() => void 0);
        }),
      );
    } catch (e) {
      this.logger.warn('sendCheckOutReminders failed');
    }
  }

  // Yangi request haqida faqat super admin managerlarni xabardor qilish tugmalar bilan
  private async notifyManagersNewRequest(
    requestId: number,
    worker: any,
    reason: string,
  ): Promise<void> {
    try {
      const managers = await this.managers.listActive();

      // Faqat super admin rolega ega managerlarni filtrlash
      const superAdminManagers = managers.filter(
        (manager) => manager.role === UserRoleEnum.SUPER_ADMIN,
      );

      // Load request to access approved_date
      const request = await this.requests.findByIdWithWorker(requestId);
      const approvedDate: Date | null = request?.approved_date || null;
      const dateStr = approvedDate
        ? (() => {
            const d = new Date(approvedDate);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}.${mm}`;
          })()
        : null;

      for (const manager of superAdminManagers) {
        const isRu = manager.language === 'ru';
        const header = isRu
          ? '🔔 Новый запрос на отгул!'
          : "🔔 Yangi ruxsat so'rovi!";
        const workerLine = isRu
          ? `👤 Сотрудник: ${worker.fullname}`
          : `� Ishchi: ${worker.fullname}`;
        const dateLine = dateStr
          ? isRu
            ? `📅 Дата: ${dateStr}`
            : `� Sana: ${dateStr}`
          : '';
        const reasonLine = isRu
          ? `📝 Причина: ${reason}`
          : `📝 Sabab: ${reason}`;
        const messageText = [header, '', workerLine, dateLine, reasonLine]
          .filter(Boolean)
          .join('\n');

        const buttons = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              isRu ? 'Одобрить ✅' : 'Tasdiqlash ✅',
              `approve_${requestId}`,
            ),
            Markup.button.callback(
              isRu ? 'Отклонить ❌' : 'Rad etish ❌',
              `reject_${requestId}`,
            ),
          ],
        ]);

        await this.bot.telegram
          .sendMessage(manager.telegram_id, messageText, buttons)
          .catch((e) =>
            this.logger.warn(
              `Notify fail to ${manager.telegram_id}: ${e.message}`,
            ),
          );
      }
    } catch (e: any) {
      this.logger.error('notifyManagersNewRequest error', e?.message || e);
    }
  }
}
