import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup, Context } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { WorkersService } from '../workers/workers.service';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { AttendanceService } from '../attendance/attendance.service';

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
      'Menejer profili yaratildi. /activate buyrugʻi bilan faollashtiring.',
    saved: 'Saqlandi ✅',
    greetingVerified: (name: string) => `Salom, ${name}. Asosiy menyu:`,
    greetingPending: (name: string) =>
      `Salom, ${name}. Roʼyxatdan oʼtish uchun menejer tasdiqlashi kerak.`,
    btnCheckIn: 'Kelish (Check-in) ✅',
    btnCheckOut: 'Ketish (Check-out) 🕘',
    btnRequestLeave: 'Javob soʼrash 📝',
    btnMyRequests: 'Mening soʼrovlarim 📄',
  backBtn: 'Qaytish ◀',
    btnWaiting: 'Tasdiqlashni kutish ⏳',
    notVerified: 'Siz hali tasdiqlanmagansiz',
    checkInDone: 'Check-in qayd etildi ✅',
    checkOutDone: 'Check-out qayd etildi 🕘',
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
    managerCreated: 'Профиль менеджера создан. Активируйте через /activate.',
    saved: 'Сохранено ✅',
    greetingVerified: (name: string) => `Здравствуйте, ${name}. Главное меню:`,
    greetingPending: (name: string) =>
      `Здравствуйте, ${name}. Для завершения регистрации менеджер должен подтвердить вас.`,
    btnCheckIn: 'Пришёл (Check-in) ✅',
    btnCheckOut: 'Ушёл (Check-out) 🕘',
    btnRequestLeave: 'Запросить отгул 📝',
    btnMyRequests: 'Мои запросы 📄',
  backBtn: 'Назад ◀',
    btnWaiting: 'Ожидается подтверждение ⏳',
    notVerified: 'Вы ещё не подтверждены',
    checkInDone: 'Check-in записан ✅',
    checkOutDone: 'Check-out записан 🕘',
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
    notFound: 'Не найдено',
    commentLabel: 'Комментарий',
    approvedByManager: 'Ваш профиль подтверждён менеджером ✅',
  },
} as const;

@Injectable()
export class ScenarioFrontendService implements OnModuleInit {
  private readonly logger = new Logger(ScenarioFrontendService.name);
  private readonly bot: Telegraf<Ctx>;

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
        } else {
          // forward to dashboard commands hint
          await ctx.reply(T[lang].managerMenuHint);
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

    // Role selection
    bot.action(['role_worker', 'role_manager'], async (ctx) => {
      ctx.session ??= {};
      const lang: Lang = ctx.session.lang || 'uz';
      const tr = T[lang];
      const tgId = Number(ctx.from?.id);
      const fullname = ctx.session.fullname || 'User';
      const isWorker = ctx.match[0] === 'role_worker';

      if (isWorker) {
        // Prevent dual creation: if already manager, do not create worker
        const manager = await this.managers.findByTelegramId(tgId);
        if (manager) {
          await ctx.editMessageText(tr.saved);
          return;
        }
        const worker = await this.workers.createOrGet(tgId, fullname, lang);
        await ctx.editMessageText(tr.workerCreated);
        if (!worker.is_verified) {
          await this.notifyManagersByLang(
            T.uz.newWorkerNotify(worker.fullname, tgId),
            T.ru.newWorkerNotify(worker.fullname, tgId),
          );
        }
        await ctx.reply(
          worker.is_verified
            ? T[lang].greetingVerified(worker.fullname)
            : T[lang].greetingPending(worker.fullname),
          this.mainMenu(worker.is_verified, lang),
        );
      } else {
        // Prevent dual creation: if already worker, do not create manager
        const worker = await this.workers.findByTelegramId(tgId);
        if (worker) {
          await ctx.editMessageText(tr.saved);
          return;
        }
        await this.managers.createIfNotExists(tgId, fullname, lang);
        await ctx.editMessageText(tr.managerCreated);
        await ctx.reply(T[lang].managerMenuHint);
      }

      ctx.session.step = undefined;
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
      await this.attendance.checkIn(worker.id);
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
      await this.attendance.checkOut(worker.id);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      try {
        if ('message' in ctx.callbackQuery) await ctx.deleteMessage();
      } catch {}
      await ctx.reply(T[lang].checkOutDone, this.mainMenu(true, lang));
    });

    // Worker: create request
    bot.action('request_leave', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery(T[lang].notVerified);
      ctx.session ??= {};
      ctx.session['awaiting_reason'] = true;
      await ctx.reply(T[lang].enterReason);
    });

    bot.on('text', async (ctx, next) => {
      // Collect reason for worker request
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
        await this.notifyManagersByLang(
          T.uz.newRequestNotify(req.id, worker.id, reason),
          T.ru.newRequestNotify(req.id, worker.id, reason),
        );
        return; // stop here, don't pass to next text handlers
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
        return ctx.editMessageText(T[lang].noRequests, this.backKeyboard(lang));
      const lines = list
        .slice(0, 10)
        .map(
          (r) =>
            `#${r.id} • ${r.status} • ${r.reason}${r.manager_comment ? `\n${T[lang].commentLabel}: ${r.manager_comment}` : ''}`,
        )
        .join('\n\n');
      try {
        await ctx.editMessageText(lines, this.backKeyboard(lang));
      } catch {
        await ctx.reply(lines, this.backKeyboard(lang));
      }
    });

    // Back to main menu from lists
    bot.action('back_to_menu', async (ctx) => {
      const lang = await this.getLang(ctx);
      const tgId = Number(ctx.from?.id);
      const worker = await this.workers.findByTelegramId(tgId);
      const isVerified = !!worker?.is_verified;
      const text = worker
        ? isVerified
          ? T[lang].greetingVerified(worker.fullname)
          : T[lang].greetingPending(worker.fullname)
        : T[lang].notFound;
      try {
        await ctx.editMessageText(text, this.mainMenu(isVerified, lang));
      } catch {
        await ctx.reply(text, this.mainMenu(isVerified, lang));
      }
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

  private async workersListUnverified(limit = 10) {
    return this.workers.listUnverified(limit);
  }
}
