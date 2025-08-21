import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Markup, Context, Telegraf } from 'telegraf';
import { ensureBotLaunched, getBot } from './bot.instance';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { WorkersService } from '../workers/workers.service';

type Ctx = Context & { session?: Record<string, any> };
type Lang = 'uz' | 'ru';

const T = {
  uz: {
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
    managerPendingBtn: 'Kutilayotgan soʼrovlar 🔔',
    managerUnverifiedBtn: 'Tasdiqlanmagan ishchilar 👤',
    notFound: 'Topilmadi',
  },
  ru: {
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
    managerPendingBtn: 'Ожидающие запросы 🔔',
    managerUnverifiedBtn: 'Неподтверждённые работники 👤',
    notFound: 'Не найдено',
  },
} as const;

@Injectable()
export class ScenarioDashboardService implements OnModuleInit {
  private readonly logger = new Logger(ScenarioDashboardService.name);
  private readonly bot: Telegraf<Ctx>;

  constructor(
    private readonly managers: ManagersService,
    private readonly requests: RequestsService,
    private readonly workers: WorkersService,
  ) {
    this.bot = getBot();
  }

  onModuleInit() {
    this.registerHandlers();
    ensureBotLaunched(this.logger).catch(() => void 0);
  }

  private async getLang(ctx: Ctx): Promise<Lang> {
    const sessLang = ctx.session?.lang as Lang | undefined;
    if (sessLang) return sessLang;
    const tgId = Number(ctx.from?.id);
    if (tgId) {
      const m = await this.managers.findByTelegramId(tgId);
      if (m?.language) return m.language as Lang;
    }
    return 'uz';
  }

  private managerMenu(lang: Lang) {
    const tr = T[lang];
    return Markup.inlineKeyboard([
      [Markup.button.callback(tr.managerPendingBtn, 'mgr_pending')],
      [Markup.button.callback(tr.managerUnverifiedBtn, 'mgr_workers_pending')],
    ]);
  }

  private registerHandlers() {
    const bot = this.bot;

    // Manager menu
    bot.command('manager', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.reply(T[lang].notActiveManager);
      await ctx.reply(T[lang].managerMenuTitle, this.managerMenu(lang));
    });

    bot.command('activate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m = await this.managers.activate(tg.id);
      if (!m) return ctx.reply(T[lang].activateNotFound);
      await ctx.reply(T[lang].activateOk);
    });

    bot.command('deactivate', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const m = await this.managers.deactivate(tg.id);
      if (!m) return ctx.reply(T[lang].deactivateNotFound);
      await ctx.reply(T[lang].deactivateOk);
    });

    // Pending requests list
    bot.action('mgr_pending', async (ctx) => {
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const pending = await this.requests.listPending();
      if (!pending.length) return ctx.editMessageText(T[lang].pendingEmpty);
      for (const r of pending.slice(0, 10)) {
        await ctx.reply(
          `#${r.id} • Worker:${r.worker_id} • ${r.reason}`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(T[lang].approveBtn, `approve_${r.id}`),
              Markup.button.callback(T[lang].rejectBtn, `reject_${r.id}`),
            ],
          ]),
        );
      }
    });

    // Approve / Reject capture
    bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId = Number(idStr);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      ctx.session ??= {};
      ctx.session['approval_target'] = { action, requestId };
      await ctx.reply(T[lang].approvalCommentPrompt);
    });

    bot.on('text', async (ctx, next) => {
      const target = ctx.session?.['approval_target'];
      if (target) {
        const tg = ctx.from;
        const lang = await this.getLang(ctx);
        const manager = await this.managers.findByTelegramId(tg.id);
        if (!manager || !manager.is_active) {
          ctx.session['approval_target'] = undefined;
          return ctx.reply(T[lang].noPermission);
        }
        const comment = ctx.message.text.trim();
        if (target.action === 'approve') {
          await this.requests.approve(target.requestId, manager.id, comment);
          await ctx.reply(T[lang].approvedMsg(target.requestId));
        } else {
          await this.requests.reject(target.requestId, manager.id, comment);
          await ctx.reply(T[lang].rejectedMsg(target.requestId));
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
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      const list = await this.workers.listUnverified(10);
      if (!list.length)
        return ctx.editMessageText(T[lang].unverifiedWorkersEmpty);
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
    });

    bot.action(/^verify_worker_(\d+)$/, async (ctx) => {
      const id = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      const verified = await this.workers.verifyWorker(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);
      await ctx.reply(T[lang].workerVerifiedMsg(verified.fullname));
      // Notify worker about approval in their own language and show menu
      try {
        const wLang = (verified.language as Lang) || 'uz';
        // build minimal worker menu (check-in/out etc.) inline keyboard
        const buttons: any[] = [];
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Пришёл (Check-in) ✅' : 'Kelish (Check-in) ✅',
            'check_in',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Ушёл (Check-out) 🕘' : 'Ketish (Check-out) 🕘',
            'check_out',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Запросить отгул 📝' : 'Javob soʼrash 📝',
            'request_leave',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Мои запросы 📄' : 'Mening soʼrovlarim 📄',
            'my_requests',
          ),
        ]);
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          wLang === 'ru'
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
      const id = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      const verified = await this.workers.verifyWorker(id);
      if (!verified) return ctx.answerCbQuery(T[lang].notFound);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(T[lang].workerVerifiedMsg(verified.fullname));
      // Notify worker about approval
      try {
        const wLang = (verified.language as Lang) || 'uz';
        const buttons: any[] = [];
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Пришёл (Check-in) ✅' : 'Kelish (Check-in) ✅',
            'check_in',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Ушёл (Check-out) 🕘' : 'Ketish (Check-out) 🕘',
            'check_out',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Запросить отгул 📝' : 'Javob soʼrash 📝',
            'request_leave',
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            wLang === 'ru' ? 'Мои запросы 📄' : 'Mening soʼrovlarim 📄',
            'my_requests',
          ),
        ]);
        await this.bot.telegram.sendMessage(
          verified.telegram_id,
          wLang === 'ru'
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
      const id = Number(ctx.match[1]);
      const tg = ctx.from;
      const lang = await this.getLang(ctx);
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery(T[lang].noPermission);
      try {
        await ctx.editMessageReplyMarkup(undefined);
      } catch {}
      await ctx.reply(
        lang === 'ru'
          ? `Заявка работника #${id} отклонена ❌`
          : `Ishchi #${id} arizasi rad etildi ❌`,
      );
      // Optionally notify the worker of rejection
      try {
        const w = await this.workers.findById(id);
        if (w) {
          const wLang = (w.language as Lang) || 'uz';
          await this.bot.telegram.sendMessage(
            w.telegram_id,
            wLang === 'ru'
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
  }
}
