import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { WorkersService } from '../workers/workers.service';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UserRoleEnum, language, WorkerRoleEnum } from '../../../utils/enum/user.enum';
import {
  APP_TIMEZONE,
  REMINDER_CHECKIN_HH,
  REMINDER_CHECKIN_MM,
  REMINDER_CHECKOUT_HH,
  REMINDER_CHECKOUT_MM,
} from '../../../utils/env/env';
import { WorkerEntity } from '../../../entity/workers.entity';
import { ManagerEntity } from '../../../entity/managers.entity';
import { RequestEntity } from '../../../entity/requests.entity';
import { AttendanceEntity } from '../../../entity/attendance.entity';
import {
  RequestsStatusEnum,
  RequestTypeEnum,
  HourlyRequestTypeEnum,
} from '../../../utils/enum/requests.enum';
import {
  getUzbekistanTime,
  getCurrentHourInUzbekistan,
  formatUzbekistanTime,
  formatUzbekistanHourMinute,
  formatRawHourMinute,
} from '../../../utils/time/uzbekistan-time';

type Ctx = Context & { session?: Record<string, any> };

// Supported interface languages (restrict to Uzbek & Russian for bot UI)
type Lang = language.UZ | language.RU; // resolves to 'uz' | 'ru'
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
    btnRequestDaily: '🗓 Kunlik javob (1+ kun)',
    btnRequestHourly: '⏰ Soatlik javob (yarim kun)',
    btnMyRequests: 'Mening soʼrovlarim 📄',
    btnLateComment: 'Kech qolish sababi 💬',
    backBtn: 'Qaytish ◀',
    btnWaiting: 'Tasdiqlashni kutish ⏳',
    statusPending: 'Kutilmoqda',
    statusApproved: 'Ruxsat',
    statusRejected: 'Javob berilmadi',
    pastDateNotAllowed:
      "O'tib ketgan kunni tanlab bo'lmaydi. Bugungi yoki kelajakdagi sanani kiriting.",
    returnBeforeApproved:
      'Qaytish sanasi ruxsat olingan sanadan oldin boʼlishi mumkin emas.',
    notVerified: 'Siz hali tasdiqlanmagansiz',
    checkInDone: 'Check-in qayd etildi ✅',
    checkOutDone: 'Check-out qayd etildi 🕘',
    checkInAlready: 'Bugun allaqachon check-in qilingan.',
    checkOutAlready: 'Bugun allaqachon check-out qilingan.',
    checkInRequired: 'Avval check-in bosing, soʼng check-out.',
    enterDate:
      'Iltimos, ruxsat olinadigan sanani kiriting (format: DD.MM yoki DD-MM). Masalan: 22.08',
    enterReturnDate:
      'Iltimos, ishga qaytish sanani kiriting (format: DD.MM yoki DD-MM). Masalan: 25.08',
    invalidDate:
      'Notoʼgʼri sana. Iltimos, DD.MM formatida kiriting. Masalan: 05.09',
    enterReasonShort: 'Sababni yozing (masalan: oilaviy ishlar).',
    enterReason:
      'Iltimos, javob sababi va sanasini kiriting. Masalan: "22-avgust – oilaviy ishlar"',
    enterLateComment: 'Kech qolish sababini yozing:',
    lateCommentAdded: 'Kech qolish sababi saqlandi ✅',
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
    prevBtn: '⬅️ Oldingi',
    nextBtn: 'Keyingi ➡️',
    pageInfo: (current: number, total: number) => `Sahifa ${current}/${total}`,
    attendancePresent: '✅ Kelgan',
    attendanceAbsent: '❌ Kelmagan',
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
    btnRequestDaily: '🗓 Дневной отгул (1+ день)',
    btnRequestHourly: '⏰ Часовой отгул (полдня)',
    btnMyRequests: 'Мои запросы 📄',
    btnLateComment: 'Причина опоздания 💬',
    backBtn: 'Назад ◀',
    btnWaiting: 'Ожидается подтверждение ⏳',
    statusPending: 'В ожидании',
    statusApproved: 'Одобрено',
    statusRejected: 'Не одобрено',
    pastDateNotAllowed:
      'Нельзя выбрать прошедшую дату. Введите сегодняшнюю или будущую.',
    returnBeforeApproved: 'Дата возвращения не может быть раньше даты отгула.',
    notVerified: 'Вы ещё не подтверждены',
    checkInDone: 'Check-in записан ✅',
    checkOutDone: 'Check-out записан 🕘',
    checkInAlready: 'Сегодня check-in уже выполнен.',
    checkOutAlready: 'Сегодня check-out уже выполнен.',
    checkInRequired: 'Сначала выполните check-in, затем check-out.',
    enterDate:
      'Пожалуйста, введите дату отгула (формат: ДД.ММ или ДД-ММ). Например: 22.08',
    enterReturnDate:
      'Пожалуйста, введите дату возвращения на работу (формат: ДД.ММ или ДД-ММ). Например: 25.08',
    invalidDate: 'Неверная дата. Введите в формате ДД.ММ. Например: 05.09',
    enterReasonShort: 'Введите причину (например: семейные дела).',
    enterReason:
      'Пожалуйста, введите причину и дату. Например: "22-августа – семейные дела"',
    enterLateComment: 'Введите причину опоздания:',
    lateCommentAdded: 'Причина опоздания сохранена ✅',
    noAttendanceToday: 'Сегодня посещаемость не зарегистрирована',
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
    prevBtn: '⬅️ Назад',
    nextBtn: 'Далее ➡️',
    pageInfo: (current: number, total: number) =>
      `Страница ${current}/${total}`,
    attendancePresent: '✅ Пришёл',
    attendanceAbsent: '❌ Не пришёл',
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
    const tgId: number = Number(ctx.from?.id);
    if (tgId) {
      const w: WorkerEntity = await this.workers.findByTelegramId(tgId);
      if (w?.language)
        return w.language === language.RU ? language.RU : language.UZ;
      const m: ManagerEntity = await this.managers.findByTelegramId(tgId);
      if (m?.language)
        return m.language === language.RU ? language.RU : language.UZ;
    }
    return language.UZ;
  }

  private mainMenu(isVerified: boolean, lang: Lang, worker?: WorkerEntity) {
    const tr = T[lang];
    const buttons = [] as any[];
    if (isVerified) {
      // NOTE: We don't know worker context here (no ctx). Basic menu without leave-day logic.
      // Leave-day specific disabling handled in replyFresh/back_to_menu where we can evaluate worker.
      buttons.push([Markup.button.callback(tr.btnCheckIn, 'check_in')]);
      buttons.push([Markup.button.callback(tr.btnCheckOut, 'check_out')]);
      buttons.push([
        Markup.button.callback(tr.btnRequestLeave, 'request_leave'),
      ]);
      buttons.push([Markup.button.callback(tr.btnMyRequests, 'my_requests')]);
      buttons.push([Markup.button.callback(tr.btnLateComment, 'late_comment')]);
      
      // Project Manager uchun qo'shimcha tugma
      if (worker && worker.role === WorkerRoleEnum.PROJECT_MANAGER) {
        buttons.push([
          Markup.button.callback(tr.viewWorkersBtn, 'worker_view_workers'),
        ]);
      }
    } else {
      buttons.push([Markup.button.callback(tr.btnWaiting, 'noop')]);
    }
    return Markup.inlineKeyboard(buttons);
  }

  private backKeyboard(lang: Lang) {
    const tr = T[lang];
    return Markup.inlineKeyboard([
      [Markup.button.callback(tr.backBtn, 'back_to_worker_menu')],
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

  private statusLabel(lang: Lang, status: RequestsStatusEnum): string {
    if (lang === language.RU) {
      if (status === RequestsStatusEnum.PENDING)
        return `⏳ ${T.ru.statusPending}`;
      if (status === RequestsStatusEnum.APPROVED)
        return `✅ ${T.ru.statusApproved}`;
      if (status === RequestsStatusEnum.REJECTED)
        return `❌ ${T.ru.statusRejected}`;
      return status;
    }
    if (status === RequestsStatusEnum.PENDING)
      return `⏳ ${T.uz.statusPending}`;
    if (status === RequestsStatusEnum.APPROVED)
      return `✅ ${T.uz.statusApproved}`;
    if (status === RequestsStatusEnum.REJECTED)
      return `❌ ${T.uz.statusRejected}`;
    return status;
  }

  private parseDayMonth(input: string): Date | null {
    const cleaned: string = (input || '').trim();
    const m = cleaned.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
    if (!m) return null;
    const d: number = Number(m[1]);
    const mo: number = Number(m[2]);
    const now = new Date();
    const y: number = m[3]
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

  // Faqat tasdiqlangan (APPROVED) javob bugungi kunga to'g'ri keladimi tekshirish
  private async hasLeaveForToday(workerId: number): Promise<boolean> {
    try {
      const requests: RequestEntity[] =
        await this.requests.listByWorker(workerId);
      if (!requests || !requests.length) return false;
      const today = new Date();
      const todayY: number = today.getUTCFullYear();
      const todayM: number = today.getUTCMonth();
      const todayD: number = today.getUTCDate();
      for (const r of requests) {
        // Only consider APPROVED requests (pending/rejected ignored)
        if (r.status !== RequestsStatusEnum.APPROVED) continue;
        if (!r.approved_date) continue; // must have approved start date
        const start = new Date(r.approved_date);
        const end: Date = r.return_date ? new Date(r.return_date) : start; // single day if no return
        const startY: number = start.getUTCFullYear();
        const startM: number = start.getUTCMonth();
        const startD: number = start.getUTCDate();
        const endY: number = end.getUTCFullYear();
        const endM: number = end.getUTCMonth();
        const endD: number = end.getUTCDate();
        // Compare date-only range inclusive
        const afterOrEqStart: boolean =
          todayY > startY ||
          (todayY === startY &&
            (todayM > startM || (todayM === startM && todayD >= startD)));
        const beforeOrEqEnd: boolean =
          todayY < endY ||
          (todayY === endY &&
            (todayM < endM || (todayM === endM && todayD <= endD)));
        if (afterOrEqStart && beforeOrEqEnd) return true;
      }
      return false;
    } catch (e) {
      this.logger.warn(
        `hasLeaveForToday failed for worker ${workerId}: ${String(e)}`,
      );
      return false;
    }
  }

  private async showManagerMenuIfActive(
    ctx: Ctx,
    manager: any,
    lang: Lang,
  ): Promise<void> {
    if (!manager.is_active) {
      await ctx.reply(
        T[lang].greetingManagerPending(manager.fullname),
        this.mainMenu(false, lang), // Show waiting buttons
      );
      return;
    }

    const tr = T[lang];
    const isSuperAdmin: boolean = await this.managers.isSuperAdmin(
      manager.telegram_id,
    );
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
          lang === language.RU
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
      ? lang === language.RU
        ? 'Меню супер админа:'
        : 'Super Admin menyusi:'
      : lang === language.RU
        ? 'Меню менеджера:'
        : 'Manager menyusi:';
    await ctx.reply(title, Markup.inlineKeyboard(menuButtons));
  }

  // manager menu is handled in dashboard service

  private registerHandlers(): void {
    const bot = this.bot;

    bot.start(async (ctx) => {
      const tg = ctx.from;
      const full: string =
        [tg.first_name, tg.last_name].filter(Boolean).join(' ') ||
        tg.username ||
        'User';
      ctx.session ??= {};
      ctx.session.fullname = full;
      ctx.session.tgId = tg.id;

      // If user already exists, skip language/role prompt
      const existingWorker: WorkerEntity = await this.workers.findByTelegramId(
        tg.id,
      );
      const existingManager: ManagerEntity =
        await this.managers.findByTelegramId(tg.id);
      if (existingWorker || existingManager) {
        const lang = await this.getLang(ctx);
        ctx.session.lang = lang;
        if (existingWorker) {
          const tr = T[lang];
          await ctx.reply(
            existingWorker.is_verified
              ? tr.greetingVerified(existingWorker.fullname)
              : tr.greetingPending(existingWorker.fullname),
            this.mainMenu(!!existingWorker.is_verified, lang, existingWorker),
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
      const lang: Lang = ctx.match[0] === 'lang_ru' ? language.RU : language.UZ;
      ctx.session.lang = lang;
      const tr = T[lang];

      // Try update language if user already exists as worker/manager
      const tgId: number = Number(ctx.from?.id);
      const w: WorkerEntity = await this.workers.findByTelegramId(tgId);
      if (w) await this.workers.setLanguage(tgId, lang);
      const m: ManagerEntity = await this.managers.findByTelegramId(tgId);
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
      const lang: Lang =
        ctx.session.lang === language.RU ? language.RU : language.UZ;
      const tr = T[lang];
      const tgId: number = Number(ctx.from?.id);
      const isWorker: boolean = ctx.match[0] === 'role_worker';
      if (isWorker) {
        // Prevent dual creation: if already manager, do not create worker
        const manager: ManagerEntity =
          await this.managers.findByTelegramId(tgId);
        if (manager) {
          await ctx.editMessageText(tr.saved);
          return;
        }
        ctx.session.pending_role = 'worker';
        await ctx.editMessageText(tr.enterFullname);
      } else {
        // Prevent dual creation: if already worker, do not create manager
        const worker: WorkerEntity = await this.workers.findByTelegramId(tgId);
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
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      // Prevent check-in if worker has APPROVED leave for today
      const hasLeaveToday: boolean = await this.hasLeaveForToday(worker.id);
      if (hasLeaveToday) {
        return ctx.answerCbQuery(
          lang === language.RU
            ? 'Сегодня утверждён отгул'
            : 'Bugun javob tasdiqlangan',
          { show_alert: true },
        );
      }
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
      await ctx.reply(T[lang].checkInDone, this.mainMenu(true, lang, worker));
    });

    bot.action('check_out', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      // Prevent check-out if on approved leave day (no attendance expected)
      const hasLeaveToday: boolean = await this.hasLeaveForToday(worker.id);
      if (hasLeaveToday) {
        return ctx.answerCbQuery(
          lang === language.RU
            ? 'Сегодня утверждён отгул'
            : 'Bugun javob tasdiqlangan',
          { show_alert: true },
        );
      }
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
      await ctx.reply(T[lang].checkOutDone, this.mainMenu(true, lang, worker));
    });

    // Worker: create request (type selection)
    bot.action('request_leave', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      const tr = T[lang];
      const buttons = Markup.inlineKeyboard([
        [Markup.button.callback(tr.btnRequestDaily, 'request_daily')],
        [Markup.button.callback(tr.btnRequestHourly, 'request_hourly')],
        [Markup.button.callback(tr.backBtn, 'back_to_worker_menu')],
      ]);

      await ctx.reply(
        lang === language.RU ? 'Выберите тип отгула:' : 'Javob turini tanlang:',
        buttons,
      );
    });

    // Worker: daily request (1+ days, needs super admin approval)
    bot.action('request_daily', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      ctx.session ??= {};
      ctx.session['req_flow'] = {
        step: 'await_date',
        type: RequestTypeEnum.DAILY,
      };
      await ctx.reply(T[lang].enterDate, this.backKeyboard(lang));
    });

    // Worker: hourly request (half day, needs admin manager approval)
    bot.action('request_hourly', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      ctx.session ??= {};
      ctx.session['req_flow'] = {
        step: 'select_hourly_type',
        type: RequestTypeEnum.HOURLY,
      };

      const messageText =
        lang === language.RU ? 'Выберите тип заявки:' : 'Javob turini tanlang:';

      const buttons = [
        [
          Markup.button.callback(
            lang === language.RU
              ? '⏰ Прийти позже (опоздание)'
              : '⏰ Kech kelish',
            'hourly_coming_late',
          ),
        ],
        [
          Markup.button.callback(
            lang === language.RU ? '🚪 Уйти раньше' : '🚪 Erta ketish',
            'hourly_leaving_early',
          ),
        ],
        [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')],
      ];

      await ctx.reply(messageText, Markup.inlineKeyboard(buttons));
    });

    // Hourly request: Coming late
    bot.action('hourly_coming_late', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      ctx.session ??= {};
      ctx.session['req_flow'] = {
        step: 'await_hourly_time',
        type: RequestTypeEnum.HOURLY,
        hourlyRequestType: HourlyRequestTypeEnum.COMING_LATE,
      };

      // Show current time to help user
      const currentTime = getUzbekistanTime();
      const currentTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

      const messageText =
        lang === language.RU
          ? `Введите время прихода (9:00-19:00)\nТекущее время: ${currentTimeStr}\nПример: 12:30`
          : `Kelish vaqtini kiriting (9:00-19:00)\nHozirgi vaqt: ${currentTimeStr}\nMisol: 12:30`;
      await ctx.reply(messageText, this.backKeyboard(lang));
    });

    // Hourly request: Leaving early
    bot.action('hourly_leaving_early', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      ctx.session ??= {};
      ctx.session['req_flow'] = {
        step: 'await_hourly_time',
        type: RequestTypeEnum.HOURLY,
        hourlyRequestType: HourlyRequestTypeEnum.LEAVING_EARLY,
      };

      // Show current time to help user
      const currentTime = getUzbekistanTime();
      const currentTimeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

      const messageText =
        lang === language.RU
          ? `Введите время ухода (9:00-19:00)\nТекущее время: ${currentTimeStr}\nПример: 16:30`
          : `Ketish vaqtini kiriting (9:00-19:00)\nHozirgi vaqt: ${currentTimeStr}\nMisol: 16:30`;
      await ctx.reply(messageText, this.backKeyboard(lang));
    });

    // Back to worker main menu
    bot.action('back_to_worker_menu', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      // Clear any pending flows
      ctx.session ??= {};
      ctx.session['req_flow'] = undefined;
      ctx.session['awaiting_reason'] = false;
      ctx.session['awaiting_late_comment'] = false;

      await ctx.reply(
        T[lang].greetingVerified(worker.fullname),
        this.mainMenu(true, lang, worker),
      );
    });

    // Worker: add late comment
    bot.action('late_comment', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);

      // Allow late comment even if no attendance record exists yet
      // This will be created when the comment is submitted
      ctx.session ??= {};
      ctx.session['awaiting_late_comment'] = true;
      await ctx.reply(T[lang].enterLateComment, this.backKeyboard(lang));
    });

    // Worker: view workers (Project Manager only)
    bot.action('worker_view_workers', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      
      if (worker.role !== WorkerRoleEnum.PROJECT_MANAGER) {
        return ctx.answerCbQuery(
          lang === language.RU 
            ? 'У вас нет доступа к этой функции' 
            : 'Sizda bu funksiyaga ruxsat yo\'q'
        );
      }

      await this.showWorkersListForProjectManager(ctx, worker, lang);
    });

    // Worker pagination
    bot.action(/^worker_view_workers_(\d+)$/, async (ctx) => {
      const page = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      
      if (!worker || !worker.is_verified || worker.role !== WorkerRoleEnum.PROJECT_MANAGER)
        return ctx.answerCbQuery(T[lang].noPermission);

      await this.showWorkersListForProjectManager(ctx, worker, lang, page);
    });

    // Worker detail view
    bot.action(/^worker_detail_(\d+)$/, async (ctx) => {
      const workerId = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const projectManager: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      
      if (!projectManager || !projectManager.is_verified || projectManager.role !== WorkerRoleEnum.PROJECT_MANAGER)
        return ctx.answerCbQuery(T[lang].noPermission);

      await this.showWorkerDetailForProjectManager(ctx, workerId, lang);
    });

    bot.on('text', async (ctx, next) => {
      // Step: collect fullname after role selection
      if (ctx.session?.step === 'await_fullname' && ctx.session?.pending_role) {
        const lang = await this.getLang(ctx);
        const name: string = (ctx.message.text || '').trim();
        if (name.length < 3) {
          await ctx.reply(T[lang].invalidFullname);
          return; // keep waiting for proper fullname
        }
        const tgId: number = Number(ctx.from?.id);
        const role = ctx.session.pending_role as 'worker' | 'manager';
        if (role === 'worker') {
          const worker: WorkerEntity = await this.workers.createOrGet(
            tgId,
            name,
            lang,
          );
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
            this.mainMenu(worker.is_verified, lang, worker),
          );
        } else {
          const manager: ManagerEntity = await this.managers.createIfNotExists(
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
      // New flow: ask date then return date then reason
      const flow = ctx.session?.['req_flow'];
      if (flow?.step === 'await_date') {
        const lang = await this.getLang(ctx);
        const dt: Date = this.parseDayMonth(ctx.message.text);
        if (!dt) {
          await ctx.reply(T[lang].invalidDate, this.backKeyboard(lang));
          return; // keep waiting for valid date
        }
        // Prevent selecting past date (compare with today in UTC basis)
        const today = new Date();
        const todayY: number = today.getUTCFullYear();
        const todayM: number = today.getUTCMonth();
        const todayD: number = today.getUTCDate();
        const dateOnly = new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
        );
        const todayOnly = new Date(Date.UTC(todayY, todayM, todayD));
        if (dateOnly < todayOnly) {
          await ctx.reply(T[lang].pastDateNotAllowed, this.backKeyboard(lang));
          return; // keep waiting
        }
        ctx.session['req_flow'] = {
          step: 'await_return_date',
          approvedDate: dt.toISOString(),
          type: flow.type, // preserve request type
        };
        await ctx.reply(T[lang].enterReturnDate, this.backKeyboard(lang));
        return;
      }
      if (flow?.step === 'await_return_date') {
        const lang = await this.getLang(ctx);
        const dt: Date = this.parseDayMonth(ctx.message.text);
        if (!dt) {
          await ctx.reply(T[lang].invalidDate, this.backKeyboard(lang));
          return; // keep waiting for valid return date
        }
        // Validate not past date and not before approved date
        const approvedDate: Date = flow.approvedDate
          ? new Date(flow.approvedDate)
          : null;
        const today = new Date();
        const dateOnly = new Date(
          Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
        );
        const todayOnly = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
          ),
        );
        if (dateOnly < todayOnly) {
          await ctx.reply(T[lang].pastDateNotAllowed, this.backKeyboard(lang));
          return; // keep waiting
        }
        if (approvedDate) {
          const approvedOnly = new Date(
            Date.UTC(
              approvedDate.getUTCFullYear(),
              approvedDate.getUTCMonth(),
              approvedDate.getUTCDate(),
            ),
          );
          if (dateOnly < approvedOnly) {
            await ctx.reply(
              T[lang].returnBeforeApproved,
              this.backKeyboard(lang),
            );
            return; // keep waiting
          }
        }
        ctx.session['req_flow'] = {
          step: 'await_reason',
          approvedDate: flow.approvedDate,
          returnDate: dt.toISOString(),
          type: flow.type, // preserve request type
        };
        await ctx.reply(T[lang].enterReasonShort, this.backKeyboard(lang));
        return;
      }
      // Handle hourly time input
      if (flow?.step === 'await_hourly_time') {
        const tg = ctx.from;
        const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['req_flow'] = undefined;
          return ctx.reply(T[lang].notVerified);
        }

        const timeInput = ctx.message.text.trim();

        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(timeInput)) {
          const errorMsg =
            lang === language.RU
              ? 'Неверный формат времени! Введите время в формате ЧЧ:ММ (например: 14:30)'
              : "Vaqt formati noto'g'ri! Vaqtni SS:DD formatida kiriting (masalan: 14:30)";
          return ctx.reply(errorMsg, this.backKeyboard(lang));
        }

        const [hours, minutes] = timeInput.split(':').map(Number);

        // Validate work hours (must be between 9:00 and 19:00 inclusive)
        if (hours < 9 || hours > 19) {
          const errorMsg =
            lang === language.RU
              ? 'Время должно быть между 9:00 и 19:00 (рабочие часы)!'
              : "Vaqt 9:00 dan 19:00 gacha (ish vaqti) bo'lishi kerak!";
          return ctx.reply(errorMsg, this.backKeyboard(lang));
        }

        // Get current Uzbekistan time for real-time validation
        const currentUzbekTime = getUzbekistanTime();
        const currentHour = currentUzbekTime.getHours();
        const currentMinute = currentUzbekTime.getMinutes();

        // Check if the requested time is in the past (real-time validation)
        const requestedTimeInMinutes = hours * 60 + minutes;
        const currentTimeInMinutes = currentHour * 60 + currentMinute;

        if (requestedTimeInMinutes <= currentTimeInMinutes) {
          const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          const errorMsg =
            lang === language.RU
              ? `Нельзя указать прошедшее время! Текущее время: ${currentTimeStr}. Укажите время позже текущего.`
              : `O'tgan vaqtni kiritib bo'lmaydi! Hozirgi vaqt: ${currentTimeStr}. Hozirgi vaqtdan keyinroq vaqt kiriting.`;
          return ctx.reply(errorMsg, this.backKeyboard(lang));
        }

        // Create the leave time with today's date and specified time
        // Force exact time storage - user entered Uzbekistan time
        const today = new Date();

        // Get today's date in YYYY-MM-DD format
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const date = String(today.getDate()).padStart(2, '0');

        // Create exact time string that user entered (Uzbekistan timezone)
        const userTimeStr = `${year}-${month}-${date} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Store as a simple string in session (we'll handle timezone in database)
        ctx.session['req_flow'] = {
          step: 'await_reason',
          type: RequestTypeEnum.HOURLY,
          hourlyLeaveTime: userTimeStr, // Store as string to avoid timezone conversion
          hourlyRequestType: flow.hourlyRequestType, // Preserve the request type
        };

        // Log for debugging (can be removed later)
        console.log(
          `Time entered: ${hours}:${minutes}, Type: ${flow.hourlyRequestType}, Saved time: ${userTimeStr}`,
        );

        const reasonMsg =
          lang === language.RU
            ? 'Введите причину часового отгула:'
            : 'Soatlik javob sababini kiriting:';
        await ctx.reply(reasonMsg, this.backKeyboard(lang));
        return;
      }
      if (flow?.step === 'await_reason') {
        const tg = ctx.from;
        const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['req_flow'] = undefined;
          return ctx.reply(T[lang].notVerified);
        }
        const reason: string = ctx.message.text.trim();

        let approvedDate: Date;
        let returnDate: Date;

        // Handle hourly vs daily requests differently
        if (flow.type === RequestTypeEnum.HOURLY) {
          // For hourly requests, don't set approved_date and return_date
          // Only set hourly_leave_time
          approvedDate = undefined;
          returnDate = undefined;

          // No automatic attendance handling for hourly requests
          // Manager will decide when to approve/reject
        } else {
          // For daily requests, use the dates from flow (existing logic)
          approvedDate = flow.approvedDate
            ? new Date(flow.approvedDate)
            : undefined;
          returnDate = flow.returnDate ? new Date(flow.returnDate) : undefined;
        }

        // Prepare hourlyLeaveTime and hourlyRequestType for hourly requests
        let hourlyLeaveTime: Date | undefined;
        let hourlyRequestType: HourlyRequestTypeEnum | undefined;
        if (flow.type === RequestTypeEnum.HOURLY) {
          if (flow.hourlyLeaveTime) {
            // Store exactly as entered (treat entered local time as "raw" UTC to keep same numbers in DB)
            try {
              const iso = flow.hourlyLeaveTime.replace(' ', 'T') + 'Z';
              hourlyLeaveTime = new Date(iso); // e.g. 11:00 stays 11:00 (UTC)
            } catch (e) {
              this.logger.warn('Hourly time parse failed, fallback now');
              hourlyLeaveTime = getUzbekistanTime();
            }
          } else {
            hourlyLeaveTime = getUzbekistanTime();
          }
          hourlyRequestType = flow.hourlyRequestType;
        }

        const req: RequestEntity = await this.requests.createRequest(
          worker.id,
          reason,
          flow.type || RequestTypeEnum.DAILY,
          approvedDate,
          returnDate,
          hourlyLeaveTime,
          hourlyRequestType,
        );

        // Log for debugging (can be removed later)
        this.logger.log(
          `Created hourly request: ID=${req.id}, Type=${hourlyRequestType}, Time=${hourlyLeaveTime?.toISOString()}`,
        );

        ctx.session['req_flow'] = undefined;
        await ctx.reply(
          T[lang].requestAccepted(req.id),
          this.mainMenu(true, lang, worker),
        );
        await this.notifyManagersNewRequest(req, worker, reason);
        return; // stop here
      }
      // Legacy single-step fallback
      if (ctx.session?.['awaiting_reason']) {
        const tg = ctx.from;
        const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['awaiting_reason'] = false;
          return ctx.reply(T[lang].notVerified);
        }
        const reason: string = ctx.message.text.trim();
        const req: RequestEntity = await this.requests.createRequest(
          worker.id,
          reason,
          RequestTypeEnum.DAILY, // Default type for legacy flow
          undefined,
          undefined,
        );
        ctx.session['awaiting_reason'] = false;
        await ctx.reply(
          T[lang].requestAccepted(req.id),
          this.mainMenu(true, lang, worker),
        );
        await this.notifyManagersNewRequest(req, worker, reason);
        return;
      }
      // Handle late comment text input
      if (ctx.session?.['awaiting_late_comment']) {
        const tg = ctx.from;
        const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
        const lang = await this.getLang(ctx);
        if (!worker || !worker.is_verified) {
          ctx.session['awaiting_late_comment'] = false;
          return ctx.reply(T[lang].notVerified);
        }
        const comment: string = ctx.message.text.trim();
        if (comment.length < 3) {
          await ctx.reply(
            lang === language.RU
              ? 'Слишком короткий комментарий. Минимум 3 символа.'
              : 'Juda qisqa izoh. Kamida 3 ta belgi.',
            this.backKeyboard(lang),
          );
          return;
        }

        const result = await this.attendance.addLateComment(worker.id, comment);
        ctx.session['awaiting_late_comment'] = false;

        await ctx.reply(T[lang].lateCommentAdded, this.mainMenu(true, lang, worker));
        return;
      }
      return next();
    });

    // Worker: list my requests with pagination
    bot.action(/^my_requests(?:_(\d+))?$/, async (ctx) => {
      const tg = ctx.from;
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      const lang = await this.getLang(ctx);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      const page: number = ctx.match[1] ? Number(ctx.match[1]) : 1;
      const pageSize = 5;
      const allRequests: RequestEntity[] = await this.requests.listByWorker(
        worker.id,
      );

      if (!allRequests.length)
        return this.replyFresh(
          ctx,
          T[lang].noRequests,
          this.backKeyboard(lang),
        );

      // Separate daily and hourly requests
      const dailyRequests = allRequests.filter(
        (r) => r.request_type === RequestTypeEnum.DAILY,
      );
      const hourlyRequests = allRequests.filter(
        (r) => r.request_type === RequestTypeEnum.HOURLY,
      );

      // Helper function to format requests
      const formatRequests = (
        requests: RequestEntity[],
        title: string,
      ): string => {
        if (!requests.length) return '';

        const requestLines = requests
          .slice(0, 3)
          .map((r: RequestEntity): string => {
            const statusText: string = this.statusLabel(lang, r.status);

            let dateInfo = '';

            // For hourly requests, use hourly_leave_time instead of approved_date
            if (
              r.request_type === RequestTypeEnum.HOURLY &&
              r.hourly_leave_time
            ) {
              const leaveTime = new Date(r.hourly_leave_time);
              const formattedTime = formatUzbekistanTime(leaveTime);

              // Add type indicator
              let typeIcon = '⏰';
              let typeText = '';
              if (r.hourly_request_type === HourlyRequestTypeEnum.COMING_LATE) {
                typeIcon = '⏰';
                typeText =
                  lang === language.RU ? ' (Опоздание)' : ' (Kech kelish)';
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
              const startMM: string = String(
                startDate.getUTCMonth() + 1,
              ).padStart(2, '0');
              const startYYYY: number = startDate.getUTCFullYear();

              // For daily requests, show date range
              if (r.return_date) {
                const endDate = new Date(r.return_date);
                const endDD: string = String(endDate.getUTCDate()).padStart(
                  2,
                  '0',
                );
                const endMM: string = String(
                  endDate.getUTCMonth() + 1,
                ).padStart(2, '0');
                const endYYYY: number = endDate.getUTCFullYear();
                dateInfo = `📅 ${startDD}.${startMM}.${startYYYY} - ${endDD}.${endMM}.${endYYYY}`;
              } else {
                dateInfo = `📅 ${startDD}.${startMM}.${startYYYY}`;
              }
            }

            const reasonText = `📝 ${r.reason}`;

            // Show who approved/rejected
            let approverText = '';
            if (r.status !== RequestsStatusEnum.PENDING && r.approved_by) {
              const approverName = r.approved_by.fullname;
              const actionText =
                r.status === RequestsStatusEnum.APPROVED
                  ? lang === language.RU
                    ? 'Одобрил'
                    : 'Tasdiqladi'
                  : lang === language.RU
                    ? 'Отклонил'
                    : 'Rad etdi';
              approverText = `� ${actionText}: ${approverName}`;
            }

            const commentText: string = r.manager_comment
              ? `💬 ${r.manager_comment}`
              : '';

            const parts: string[] = [`#${r.id} • ${statusText}`];
            if (dateInfo) parts.push(dateInfo);
            parts.push(reasonText);
            if (approverText) parts.push(approverText);
            if (commentText) parts.push(commentText);

            return parts.join('\n');
          })
          .join('\n\n');

        return `${title}\n${requestLines}`;
      };

      // Format the message
      let message = T[lang].btnMyRequests + '\n\n';

      const dailyTitle =
        lang === language.RU ? '📋 ЕЖЕДНЕВНЫЕ ЗАЯВКИ:' : '📋 KUNLIK JAVOBLAR:';
      const hourlyTitle =
        lang === language.RU ? '⏰ ЧАСОВЫЕ ЗАЯВКИ:' : '⏰ SOATLIK JAVOBLAR:';

      const dailySection = formatRequests(dailyRequests, dailyTitle);
      const hourlySection = formatRequests(hourlyRequests, hourlyTitle);

      if (dailySection) {
        message += dailySection + '\n\n';
      }

      if (hourlySection) {
        message += hourlySection + '\n\n';
      }

      // Show count info
      const totalDaily = dailyRequests.length;
      const totalHourly = hourlyRequests.length;
      const countInfo =
        lang === language.RU
          ? `📊 Всего: Ежедневных: ${totalDaily}, Часовых: ${totalHourly}`
          : `📊 Jami: Kunlik: ${totalDaily}, Soatlik: ${totalHourly}`;

      message += countInfo;

      const buttons = [
        [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')],
      ];

      await this.replyFresh(ctx, message, Markup.inlineKeyboard(buttons));
    });

    // Back to main menu from lists (legacy handler)
    bot.action('back_to_menu', async (ctx) => {
      const lang = await this.getLang(ctx);
      const tgId: number = Number(ctx.from?.id);
      // Clear any pending flows (date/reason etc.)
      if (ctx.session) {
        ctx.session['req_flow'] = undefined;
        ctx.session['awaiting_reason'] = false;
        ctx.session['awaiting_late_comment'] = false;
        ctx.session['step'] = undefined;
        ctx.session['pending_role'] = undefined;
      }
      const worker: WorkerEntity = await this.workers.findByTelegramId(tgId);
      const isVerified: boolean = !!worker?.is_verified;
      const text: string = worker
        ? isVerified
          ? T[lang].greetingVerified(worker.fullname)
          : T[lang].greetingPending(worker.fullname)
        : T[lang].notFound;
      // If worker has approved leave today, show disabled info instead of check-in/out buttons
      if (worker && isVerified) {
        const hasLeaveToday = await this.hasLeaveForToday(worker.id);
        if (hasLeaveToday) {
          const kb = Markup.inlineKeyboard([
            [
              Markup.button.callback(
                lang === language.RU
                  ? 'Сегодня утверждён отгул'
                  : 'Bugun javob tasdiqlangan',
                'noop',
              ),
            ],
            [Markup.button.callback(T[lang].btnMyRequests, 'my_requests')],
            [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')],
          ]);
          return this.replyFresh(
            ctx,
            `${text}\n\n${lang === language.RU ? 'Сегодня у вас утверждён отгул, посещаемость не требуется.' : 'Bugun sizning javobingiz tasdiqlangan, kelish-ketish belgilanmaydi.'}`,
            kb,
          );
        }
      }
      await this.replyFresh(ctx, text, this.mainMenu(isVerified, lang, worker));
    });

    // Project Manager workers view handler
    bot.action(/^worker_view_workers(?:_(\d+))?$/, async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      
      // Check if user is verified project manager
      if (!worker || !worker.is_verified || worker.role !== WorkerRoleEnum.PROJECT_MANAGER) {
        return ctx.answerCbQuery(
          lang === language.RU 
            ? 'У вас нет доступа' 
            : 'Sizda ruxsat yo\'q'
        );
      }

      const page: number = ctx.match[1] ? Number(ctx.match[1]) : 1;
      const result = await this.workers.listVerifiedPaginated(page, 5);

      if (result.workers.length === 0) {
        return ctx.editMessageText(
          lang === language.RU 
            ? 'Нет подтверждённых работников' 
            : 'Tasdiqlangan ishchilar yo\'q',
          Markup.inlineKeyboard([
            [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')],
          ]),
        );
      }

      const message = `${T[lang].viewWorkersBtn} (${page}/${Math.ceil(result.total / 5)}):\n`;
      const buttons: any[] = [];

      // Get today's attendance for all workers
      const workerIds = result.workers.map((w) => w.id);
      const attendanceMap = await this.attendance.getTodayForWorkers(workerIds);

      // Worker buttons with attendance status
      for (const w of result.workers) {
        const todayAttendance = attendanceMap.get(w.id);
        let status: string;
        
        if (todayAttendance?.check_in) {
          status = lang === language.RU ? '✅ Пришёл' : '✅ Kelgan';
        } else {
          status = lang === language.RU ? '❌ Не пришёл' : '❌ Kelmagan';
        }

        const roleIcon = w.role === WorkerRoleEnum.PROJECT_MANAGER ? '👨‍💼' : '👷';
        
        buttons.push([
          Markup.button.callback(
            `${status} ${roleIcon} ${w.fullname}`,
            `worker_detail_${w.id}`,
          ),
        ]);
      }

      // Pagination buttons
      const navButtons = [];
      if (result.hasPrev) {
        navButtons.push(
          Markup.button.callback(
            T[lang].prevBtn,
            `worker_view_workers_${page - 1}`,
          ),
        );
      }
      if (result.hasNext) {
        navButtons.push(
          Markup.button.callback(
            T[lang].nextBtn,
            `worker_view_workers_${page + 1}`,
          ),
        );
      }
      if (navButtons.length > 0) {
        buttons.push(navButtons);
      }

      // Back button
      buttons.push([
        Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu'),
      ]);

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Project Manager worker detail view
    bot.action(/^worker_detail_(\d+)$/, async (ctx) => {
      const workerId: number = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const currentWorker: WorkerEntity = await this.workers.findByTelegramId(tg.id);
      
      // Check if user is verified project manager
      if (!currentWorker || !currentWorker.is_verified || currentWorker.role !== WorkerRoleEnum.PROJECT_MANAGER) {
        return ctx.answerCbQuery(
          lang === language.RU 
            ? 'У вас нет доступа' 
            : 'Sizda ruxsat yo\'q'
        );
      }

      const worker: WorkerEntity = await this.workers.findById(workerId);
      if (!worker) return ctx.answerCbQuery(T[lang].notFound);

      const todayAttendance: AttendanceEntity = await this.attendance.getToday(worker.id);
      const status = todayAttendance?.check_in
        ? (lang === language.RU ? '✅ Пришёл' : '✅ Kelgan')
        : (lang === language.RU ? '❌ Не пришёл' : '❌ Kelmagan');

      const roleText = worker.role === WorkerRoleEnum.PROJECT_MANAGER 
        ? (lang === language.RU ? 'Проект-менеджер' : 'Loyiha menejeri')
        : (lang === language.RU ? 'Работник' : 'Ishchi');

      let message = `👤 ${worker.fullname}\n📋 ${lang === language.RU ? 'Роль' : 'Rol'}: ${roleText}\n${lang === language.RU ? 'Сегодня' : 'Bugun'}: ${status}`;

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

      const buttons = [
        [Markup.button.callback(T[lang].backBtn, 'worker_view_workers')],
      ];

      try {
        await ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
      } catch {
        await ctx.reply(message, Markup.inlineKeyboard(buttons));
      }
    });

    // Manager flows moved to ScenarioDashboardService
  }

  private async notifyManagersByLang(messageUz: string, messageRu: string) {
    try {
      const managers: ManagerEntity[] = await this.managers.listActive();
      await Promise.all(
        managers.map((m: ManagerEntity) => {
          const msg: string =
            m.language === language.RU ? messageRu : messageUz;
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
  }): Promise<void> {
    try {
      const managers: ManagerEntity[] = await this.managers.listActive();

      // Faqat admin roli bilan managerlarni filter qilish
      const adminManagers = [];
      for (const manager of managers) {
        const isAdminManager: boolean = await this.managers.isAdmin(
          manager.telegram_id,
        );
        if (isAdminManager) {
          adminManagers.push(manager);
        }
      }

      await Promise.all(
        adminManagers.map(async (m): Promise<void> => {
          const text: string =
            m.language === language.RU
              ? `Новый работник: ${worker.fullname} (tg:${worker.telegram_id}). Выберите роль:`
              : `Yangi ishchi: ${worker.fullname} (tg:${worker.telegram_id}). Rolni tanlang:`;
          const kb = Markup.inlineKeyboard([
            [
              Markup.button.callback(
                m.language === language.RU ? 'Работник 👷' : 'Ishchi 👷',
                `approve_worker_worker_${worker.id}`,
              ),
            ],
            [
              Markup.button.callback(
                m.language === language.RU ? 'Проект-менеджер 👨‍�' : 'Loyiha menejeri 👨‍�',
                `approve_worker_project_manager_${worker.id}`,
              ),
            ],
            [
              Markup.button.callback(
                m.language === language.RU ? 'Отклонить ❌' : 'Rad etish ❌',
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
    language: language;
  }): Promise<void> {
    try {
      const superAdmins: ManagerEntity[] =
        await this.managers.listSuperAdmins();
      await Promise.all(
        superAdmins.map(async (admin: ManagerEntity): Promise<void> => {
          const text: string =
            admin.language === language.RU
              ? `Новый менеджер: ${manager.fullname} (tg:${manager.telegram_id}). Выберите роль:`
              : `Yangi menejer: ${manager.fullname} (tg:${manager.telegram_id}). Rolni tanlang:`;
          const kb = Markup.inlineKeyboard([
            [
              Markup.button.callback(
                admin.language === language.RU
                  ? 'Супер Админ �'
                  : 'Super Admin 👑',
                `approve_manager_super_admin_${manager.telegram_id}`,
              ),
            ],
            [
              Markup.button.callback(
                admin.language === language.RU ? 'Админ 👨‍💼' : 'Admin 👨‍�',
                `approve_manager_admin_${manager.telegram_id}`,
              ),
            ],
            [
              Markup.button.callback(
                admin.language === language.RU
                  ? 'Отклонить ❌'
                  : 'Rad etish ❌',
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

  // Project Manager uchun ishchilar ro'yxatini ko'rsatish
  private async showWorkersListForProjectManager(
    ctx: Ctx,
    projectManager: WorkerEntity,
    lang: Lang,
    page: number = 1,
  ): Promise<void> {
    try {
      const result = await this.workers.listVerifiedPaginated(page, 5);

      if (result.workers.length === 0) {
        const message = lang === language.RU 
          ? 'Нет подтверждённых работников' 
          : 'Tasdiqlangan ishchilar yo\'q';
        
        await ctx.reply(message, Markup.inlineKeyboard([
          [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')]
        ]));
        return;
      }

      const tr = T[lang];
      const message = `${tr.viewWorkersBtn} (${page}/${Math.ceil(result.total / 5)}):`;

      const buttons: any[] = [];

      // Get today's attendance and approved leave data for all workers
      const workerIds = result.workers.map((w) => w.id);
      const attendanceMap = await this.attendance.getTodayForWorkers(workerIds);
      const approvedLeaveMap = await this.requests.getApprovedLeaveForToday(workerIds);

      // Worker buttons with enhanced attendance status
      for (const worker of result.workers) {
        const todayAttendance = attendanceMap.get(worker.id);
        const hasApprovedLeave = approvedLeaveMap.get(worker.id) || false;

        let status: string;
        if (hasApprovedLeave) {
          // Worker has approved leave today
          status = lang === language.RU ? '📋 Отгул одобрен' : '📋 Javob berilgan';
        } else if (todayAttendance?.check_in) {
          // Worker checked in (prioritize over late comment)
          status = tr.attendancePresent;
        } else if (todayAttendance?.late_comment) {
          // Worker submitted late comment but hasn't checked in yet
          status = lang === language.RU 
            ? '⏰ Опоздал (не пришёл)' 
            : '⏰ Kech qoldi (kelmagan)';
        } else {
          // Worker absent
          status = tr.attendanceAbsent;
        }

        // Role indicator
        const roleIcon = worker.role === WorkerRoleEnum.PROJECT_MANAGER ? '👨‍💼' : '👷';

        buttons.push([
          Markup.button.callback(
            `${status} ${roleIcon} ${worker.fullname}`,
            `worker_detail_${worker.id}`,
          ),
        ]);
      }

      // Pagination buttons
      const navButtons = [];
      if (result.hasPrev) {
        navButtons.push(
          Markup.button.callback(
            tr.prevBtn,
            `worker_view_workers_${page - 1}`,
          ),
        );
      }
      if (result.hasNext) {
        navButtons.push(
          Markup.button.callback(
            tr.nextBtn,
            `worker_view_workers_${page + 1}`,
          ),
        );
      }
      if (navButtons.length > 0) {
        buttons.push(navButtons);
      }

      // Back button
      buttons.push([
        Markup.button.callback(tr.backBtn, 'back_to_worker_menu'),
      ]);

      await ctx.reply(message, Markup.inlineKeyboard(buttons));
    } catch (e) {
      this.logger.error('showWorkersListForProjectManager error', e);
      await ctx.reply(
        lang === language.RU ? 'Произошла ошибка' : 'Xatolik yuz berdi',
        Markup.inlineKeyboard([
          [Markup.button.callback(T[lang].backBtn, 'back_to_worker_menu')]
        ])
      );
    }
  }

  // Project Manager uchun ishchi tafsilotlarini ko'rsatish
  private async showWorkerDetailForProjectManager(
    ctx: Ctx,
    workerId: number,
    lang: Lang,
  ): Promise<void> {
    try {
      const worker: WorkerEntity = await this.workers.findById(workerId);
      if (!worker) {
        await ctx.reply(
          lang === language.RU ? 'Работник не найден' : 'Ishchi topilmadi',
          Markup.inlineKeyboard([
            [Markup.button.callback(T[lang].backBtn, 'worker_view_workers')]
          ])
        );
        return;
      }

      const todayAttendance: AttendanceEntity = await this.attendance.getToday(workerId);
      const tr = T[lang];
      
      let status = todayAttendance?.check_in ? tr.attendancePresent : tr.attendanceAbsent;

      // Role indicator
      const roleText = worker.role === WorkerRoleEnum.PROJECT_MANAGER 
        ? (lang === language.RU ? 'Проект Менеджер' : 'Project Manager')
        : (lang === language.RU ? 'Работник' : 'Ishchi');

      let message = `👤 ${worker.fullname}\n`;
      message += `💼 ${roleText}\n`;
      message += `📅 ${lang === language.RU ? 'Сегодня' : 'Bugun'}: ${status}`;

      // Show check-in and check-out times if available
      if (todayAttendance?.check_in) {
        const checkInTime = formatUzbekistanTime(todayAttendance.check_in);
        message += `\n⏰ ${lang === language.RU ? 'Пришёл' : 'Kelgan'}: ${checkInTime}`;
      }

      if (todayAttendance?.check_out) {
        const checkOutTime = formatUzbekistanTime(todayAttendance.check_out);
        message += `\n🚪 ${lang === language.RU ? 'Ушёл' : 'Ketgan'}: ${checkOutTime}`;
      }

      // Show late comment if exists
      if (todayAttendance?.late_comment) {
        const commentTime = todayAttendance.comment_time
          ? formatUzbekistanTime(todayAttendance.comment_time)
          : '';
        message += `\n💬 ${lang === language.RU ? 'Причина опоздания' : 'Kech qolish sababi'}: ${todayAttendance.late_comment}`;
        if (commentTime) {
          message += ` (${commentTime})`;
        }
      }

      const buttons = [
        [Markup.button.callback(tr.backBtn, 'worker_view_workers')]
      ];

      await ctx.reply(message, Markup.inlineKeyboard(buttons));
    } catch (e) {
      this.logger.error('showWorkerDetailForProjectManager error', e);
      await ctx.reply(
        lang === language.RU ? 'Произошла ошибка' : 'Xatolik yuz berdi',
        Markup.inlineKeyboard([
          [Markup.button.callback(T[lang].backBtn, 'worker_view_workers')]
        ])
      );
    }
  }

  private startReminderLoop(): void {
    // Tick every 30 seconds
    setInterval(() => this.reminderTick().catch(() => void 0), 30_000);
  }

  private dateKey(d = new Date()): string {
    const y: number = d.getFullYear();
    const m: string = String(d.getMonth() + 1).padStart(2, '0');
    const day: string = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async reminderTick(): Promise<void> {
    // Generate current time in configured timezone to avoid server TZ drift
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE }),
    );
    const key: string = this.dateKey(now);
    if (key !== this.reminderState.lastDateKey) {
      this.reminderState.lastDateKey = key;
      this.reminderState.doneMorning.clear();
      this.reminderState.doneEvening.clear();
    }

    const hh: number = now.getHours();
    const mm: number = now.getMinutes();

    // Configured check-in reminder
    if (hh === REMINDER_CHECKIN_HH && mm === REMINDER_CHECKIN_MM) {
      await this.sendCheckInReminders();
    }

    // Configured check-out reminder
    if (hh === REMINDER_CHECKOUT_HH && mm === REMINDER_CHECKOUT_MM) {
      await this.sendCheckOutReminders();
    }
  }

  private async sendCheckInReminders(): Promise<void> {
    try {
      const workers: WorkerEntity[] = await this.workers.listVerified();
      if (!workers.length) return;
      const workerIds: number[] = workers.map((w) => w.id);
      const todayMap = await this.attendance.getTodayForWorkers(workerIds);
      const now = new Date(
        new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE }),
      );

      await Promise.all(
        workers.map(async (w: WorkerEntity) => {
          if (this.reminderState.doneMorning.has(w.telegram_id)) return;
          const rec: AttendanceEntity = todayMap.get(w.id);
          // Skip if already checked in
          if (rec?.check_in) return;
          const lang: Lang =
            w.language === language.RU ? language.RU : language.UZ;
          const text =
            lang === language.RU
              ? 'Пожалуйста, отметьте прибытие: Пришёл (Check-in) ✅'
              : 'Iltimos, kelganingizni tasdiqlang: Kelish (Check-in) ✅';
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

  private async sendCheckOutReminders(): Promise<void> {
    try {
      const workers: WorkerEntity[] = await this.workers.listVerified();
      if (!workers.length) return;
      const workerIds: number[] = workers.map((w) => w.id);
      const todayMap = await this.attendance.getTodayForWorkers(workerIds);
      await Promise.all(
        workers.map(async (w: WorkerEntity) => {
          if (this.reminderState.doneEvening.has(w.telegram_id)) return;
          const rec: AttendanceEntity = todayMap.get(w.id);
          // Send only if has check_in but no check_out yet
          if (!rec?.check_in || rec.check_out) return;
          const lang: Lang =
            w.language === language.RU ? language.RU : language.UZ;
          const text =
            lang === language.RU
              ? 'Пожалуйста, отметьте уход: Ушёл (Check-out) 🕘'
              : 'Iltimos, ketganingizni tasdiqlang: Ketish (Check-out) 🕘';
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

  // Yangi request haqida managerlarni xabardor qilish (type asosida)
  private async notifyManagersNewRequest(
    request: RequestEntity,
    worker: any,
    reason: string,
  ): Promise<void> {
    try {
      const managers: ManagerEntity[] = await this.managers.listActive();

      let targetManagers: ManagerEntity[] = [];

      if (request.request_type === RequestTypeEnum.DAILY) {
        // Kunlik javob - faqat super admin managerlar
        targetManagers = managers.filter(
          (manager: ManagerEntity): boolean =>
            manager.role === UserRoleEnum.SUPER_ADMIN,
        );
      } else if (request.request_type === RequestTypeEnum.HOURLY) {
        // Soatlik javob - admin role managerlar
        targetManagers = managers.filter(
          (manager: ManagerEntity): boolean =>
            manager.role === UserRoleEnum.ADMIN,
        );
      }

      const approvedDate: Date | null = request?.approved_date || null;
      const returnDate: Date | null = request?.return_date || null;

      for (const manager of targetManagers) {
        const isRu: boolean = manager.language === 'ru';

        // Request type info
        const typeInfo: string =
          request.request_type === RequestTypeEnum.DAILY
            ? isRu
              ? '🗓 Дневной отгул'
              : '🗓 Kunlik javob'
            : isRu
              ? '⏰ Часовой отгул'
              : '⏰ Soatlik javob';

        let dateInfo: string = '';
        let daysInfo: string = '';

        if (approvedDate) {
          const startDate = new Date(approvedDate);
          const startDD: string = String(startDate.getDate()).padStart(2, '0');
          const startMM: string = String(startDate.getMonth() + 1).padStart(
            2,
            '0',
          );
          const startYYYY: number = startDate.getFullYear();

          // For hourly requests, show time as well
          if (request.request_type === RequestTypeEnum.HOURLY) {
            // Format start date with Uzbekistan timezone
            const formattedTime = formatUzbekistanTime(startDate);
            dateInfo = `📅 ${formattedTime}`;
          } else if (returnDate) {
            const endDate = new Date(returnDate);
            const endDD: string = String(endDate.getDate()).padStart(2, '0');
            const endMM: string = String(endDate.getMonth() + 1).padStart(
              2,
              '0',
            );
            const endYYYY: number = endDate.getFullYear();

            // Calculate days between dates
            const timeDiff: number = endDate.getTime() - startDate.getTime();
            const daysDiff: number = Math.ceil(timeDiff / (1000 * 3600 * 24));

            dateInfo = `📅 ${startDD}.${startMM}.${startYYYY} - ${endDD}.${endMM}.${endYYYY}`;
            daysInfo =
              daysDiff > 0
                ? isRu
                  ? `⏱ ${daysDiff} дней`
                  : `⏱ ${daysDiff} kun`
                : '';
          } else {
            dateInfo = `📅 ${startDD}.${startMM}.${startYYYY}`;
          }
        }

        // For hourly requests show the target hour (hourly_leave_time). For daily show creation time.
        let requestTimeInfo: string;
        if (request.request_type === RequestTypeEnum.HOURLY && request.hourly_leave_time) {
          // Show stored raw time (no +5) because we saved exact user input
          const hm = formatRawHourMinute(request.hourly_leave_time);
          requestTimeInfo = isRu ? `⏰ Вaqt: ${hm}` : `⏰ Soat: ${hm}`;
        } else {
          const requestTime = formatUzbekistanTime(request.created_at);
          requestTimeInfo = isRu
            ? `⏰ Время запроса: ${requestTime}`
            : `⏰ So'rov vaqti: ${requestTime}`;
        }

        // Add hourly request type information
        let hourlyTypeInfo = '';
        if (
          request.request_type === RequestTypeEnum.HOURLY &&
          request.hourly_request_type
        ) {
          const typeText =
            request.hourly_request_type === HourlyRequestTypeEnum.COMING_LATE
              ? isRu
                ? 'Опоздание'
                : 'Kechikish'
              : isRu
                ? 'Ранний уход'
                : 'Erta ketish';

          if (request.hourly_leave_time) {
            // Show the same raw hour already shown above (avoid different shifted time)
            const leaveTime = formatRawHourMinute(request.hourly_leave_time);
            hourlyTypeInfo = isRu
              ? `🕐 Тип: ${typeText}`
              : `🕐 Turi: ${typeText}`;
          } else {
            hourlyTypeInfo = isRu
              ? `🕐 Тип: ${typeText}`
              : `🕐 Turi: ${typeText}`;
          }
        }

        const header = isRu
          ? '🔔 Новый запрос на отгул!'
          : "🔔 Yangi ruxsat so'rovi!";
        const workerLine: string = isRu
          ? `👤 Сотрудник: ${worker.fullname}`
          : `👤 Ishchi: ${worker.fullname}`;
        const reasonLine: string = isRu
          ? `📝 Причина: ${reason}`
          : `📝 Sabab: ${reason}`;
        const messageText: string = [
          header,
          '',
          typeInfo,
          workerLine,
          dateInfo,
          daysInfo,
          requestTimeInfo,
          hourlyTypeInfo,
          reasonLine,
        ]
          .filter(Boolean)
          .join('\n');

        const buttons = Markup.inlineKeyboard([
          [
            Markup.button.callback(
              isRu ? 'Одобрить ✅' : 'Tasdiqlash ✅',
              `approve_${request.id}`,
            ),
            Markup.button.callback(
              isRu ? 'Отклонить ❌' : 'Rad etish ❌',
              `reject_${request.id}`,
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
