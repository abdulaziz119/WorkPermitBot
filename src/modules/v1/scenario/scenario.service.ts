import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Markup, Context, session } from 'telegraf';
import { TELEGRAM_BOT_TOKEN } from '../../../utils/env/env';
import { WorkersService } from '../workers/workers.service';
import { ManagersService } from '../managers/managers.service';
import { RequestsService } from '../requests/requests.service';
import { AttendanceService } from '../attendance/attendance.service';
import { RequestsStatusEnum } from '../../../utils/enum/requests.enum';

type Ctx = Context & { session?: Record<string, any> };

@Injectable()
export class ScenarioService implements OnModuleInit {
  private readonly logger = new Logger(ScenarioService.name);
  private readonly bot: Telegraf<Ctx>;

  constructor(
    private readonly workers: WorkersService,
    private readonly managers: ManagersService,
    private readonly requests: RequestsService,
    private readonly attendance: AttendanceService,
  ) {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }
    this.bot = new Telegraf<Ctx>(TELEGRAM_BOT_TOKEN);
    // enable in-memory session
    this.bot.use(session());
  }

  onModuleInit() {
    this.registerHandlers();
    this.bot
      .launch()
      .then(() => this.logger.log('Telegram bot launched'))
      .catch((e) => this.logger.error('Bot launch error', e));
  }

  private mainMenu(isVerified: boolean) {
    const buttons = [] as any[];
    if (isVerified) {
      buttons.push([
        Markup.button.callback('Kelish (Check-in) ✅', 'check_in'),
      ]);
      buttons.push([
        Markup.button.callback('Ketish (Check-out) 🕘', 'check_out'),
      ]);
      buttons.push([
        Markup.button.callback('Javob soʼrash 📝', 'request_leave'),
      ]);
      buttons.push([
        Markup.button.callback('Mening soʼrovlarim 📄', 'my_requests'),
      ]);
    } else {
      buttons.push([Markup.button.callback('Tasdiqlashni kutish ⏳', 'noop')]);
    }
    return Markup.inlineKeyboard(buttons);
  }

  private managerMenu() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('Kutilayotgan soʼrovlar 🔔', 'mgr_pending')],
      [
        Markup.button.callback(
          'Tasdiqlanmagan ishchilar 👤',
          'mgr_workers_pending',
        ),
      ],
    ]);
  }

  private registerHandlers() {
    const bot = this.bot;

    bot.start(async (ctx) => {
      const tg = ctx.from;
      const full =
        [tg.first_name, tg.last_name].filter(Boolean).join(' ') ||
        tg.username ||
        'Worker';
      const worker = await this.workers.createOrGet(tg.id, full);
      // If this user is a manager, ensure manager record exists but not auto-active
      await this.managers.createOrGet(tg.id, full).catch(() => undefined);

      const text = worker.is_verified
        ? `Salom, ${worker.fullname}. Asosiy menyu:`
        : `Salom, ${worker.fullname}. Roʼyxatdan oʼtish uchun menejer tasdiqlashi kerak. Koʼrsatmalar yuborildi.`;

      await ctx.reply(text, this.mainMenu(worker.is_verified));
      if (!worker.is_verified) {
        // notify active managers once
        await this.notifyManagers(
          `Yangi ishchi: ${worker.fullname} (tg:${tg.id}). Tasdiqlash kerak.`,
        );
      }
    });

    // No-op button
    bot.action('noop', async (ctx) =>
      ctx.answerCbQuery('Tasdiqlash kutilmoqda'),
    );

    // Worker flow: Check-in / Check-out
    bot.action('check_in', async (ctx) => {
      const tg = ctx.from;
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery('Siz hali tasdiqlanmagansiz');
      await this.attendance.checkIn(worker.id);
      await ctx.editMessageReplyMarkup(undefined);
      await ctx.reply('Check-in qayd etildi ✅', this.mainMenu(true));
    });

    bot.action('check_out', async (ctx) => {
      const tg = ctx.from;
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery('Siz hali tasdiqlanmagansiz');
      await this.attendance.checkOut(worker.id);
      await ctx.editMessageReplyMarkup(undefined);
      await ctx.reply('Check-out qayd etildi 🕘', this.mainMenu(true));
    });

    // Worker: create request
    bot.action('request_leave', async (ctx) => {
      const tg = ctx.from;
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker || !worker.is_verified)
        return ctx.answerCbQuery('Siz hali tasdiqlanmagansiz');
      ctx.session ??= {};
      ctx.session['awaiting_reason'] = true;
      await ctx.reply(
        'Iltimos, javob sababi va sanasini kiriting. Masalan: "22-avgust – oilaviy ishlar"',
      );
    });

    bot.on('text', async (ctx) => {
      // Collect reason for worker request
      if (ctx.session?.['awaiting_reason']) {
        const tg = ctx.from;
        const worker = await this.workers.findByTelegramId(tg.id);
        if (!worker || !worker.is_verified) {
          ctx.session['awaiting_reason'] = false;
          return ctx.reply('Tasdiqlanmagansiz');
        }
        const reason = ctx.message.text.trim();
        const req = await this.requests.createRequest(worker.id, reason);
        ctx.session['awaiting_reason'] = false;
        await ctx.reply(
          `Soʼrovingiz qabul qilindi (#${req.id}). Menejer tasdiqlashi kutilmoqda.`,
          this.mainMenu(true),
        );
        await this.notifyManagers(
          `Yangi soʼrov #${req.id} • Worker:${worker.id} • ${reason}`,
        );
      }
    });

    // Worker: list my requests
    bot.action('my_requests', async (ctx) => {
      const tg = ctx.from;
      const worker = await this.workers.findByTelegramId(tg.id);
      if (!worker) return ctx.answerCbQuery('Topilmadi');
      const list = await this.requests.listByWorker(worker.id);
      if (!list.length) return ctx.editMessageText('Sizda soʼrovlar yoʼq.');
      const lines = list
        .slice(0, 10)
        .map(
          (r) =>
            `#${r.id} • ${r.status} • ${r.reason}${r.manager_comment ? `\nIzoh: ${r.manager_comment}` : ''}`,
        )
        .join('\n\n');
      await ctx.editMessageText(lines, this.mainMenu(true));
    });

    // Manager: pending requests
    bot.command('manager', async (ctx) => {
      const tg = ctx.from;
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.reply('Siz active manager emassiz.');
      await ctx.reply('Manager menyusi:', this.managerMenu());
    });

    bot.command('activate', async (ctx) => {
      const tg = ctx.from;
      const m = await this.managers.activate(tg.id);
      if (!m) return ctx.reply('Manager sifatida roʼyxatda topilmadingiz.');
      await ctx.reply(
        'Siz manager sifatida faollashtirildingiz ✅. /manager buyrugʼini bosing.',
      );
    });

    bot.command('deactivate', async (ctx) => {
      const tg = ctx.from;
      const m = await this.managers.deactivate(tg.id);
      if (!m) return ctx.reply('Manager sifatida topilmadingiz');
      await ctx.reply('Manager holati oʼchirildi.');
    });

    bot.action('mgr_pending', async (ctx) => {
      const tg = ctx.from;
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery('Ruxsat yoʼq');
      const pending = await this.requests.listPending();
      if (!pending.length)
        return ctx.editMessageText('Kutilayotgan soʼrovlar yoʼq.');
      for (const r of pending.slice(0, 10)) {
        await ctx.reply(
          `#${r.id} • Worker:${r.worker_id} • ${r.reason}`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback('Tasdiqlash ✅', `approve_${r.id}`),
              Markup.button.callback('Rad etish ❌', `reject_${r.id}`),
            ],
          ]),
        );
      }
    });

    bot.action(/^(approve|reject)_(\d+)$/, async (ctx) => {
      const [, action, idStr] = ctx.match;
      const requestId = Number(idStr);
      const tg = ctx.from;
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery('Ruxsat yoʼq');
      ctx.session ??= {};
      ctx.session['approval_target'] = { action, requestId };
      await ctx.reply(
        'Izoh kiriting (ixtiyoriy). Ushbu xabar yuborilgach qaror saqlanadi.',
      );
    });

    bot.on('text', async (ctx, next) => {
      // manager approval comment capture
      const target = ctx.session?.['approval_target'];
      if (target) {
        const tg = ctx.from;
        const manager = await this.managers.findByTelegramId(tg.id);
        if (!manager || !manager.is_active) {
          ctx.session['approval_target'] = undefined;
          return ctx.reply('Ruxsat yoʼq');
        }
        const comment = ctx.message.text.trim();
        if (target.action === 'approve') {
          await this.requests.approve(target.requestId, manager.id, comment);
          await ctx.reply(`#${target.requestId} tasdiqlandi ✅`);
        } else {
          await this.requests.reject(target.requestId, manager.id, comment);
          await ctx.reply(`#${target.requestId} rad etildi ❌`);
        }
        ctx.session['approval_target'] = undefined;
      }
      return next?.();
    });

    // Manager: pending worker verifications
    bot.action('mgr_workers_pending', async (ctx) => {
      const tg = ctx.from;
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery('Ruxsat yoʼq');
      // list first 10 unverified workers
      const list = await this.workersListUnverified(10);
      if (!list.length)
        return ctx.editMessageText('Tasdiqlanmagan ishchilar yoʼq.');
      for (const w of list) {
        await ctx.reply(
          `Ishchi: ${w.fullname} (tg:${w.telegram_id})`,
          Markup.inlineKeyboard([
            [Markup.button.callback('Tasdiqlash 👌', `verify_worker_${w.id}`)],
          ]),
        );
      }
    });

    bot.action(/^verify_worker_(\d+)$/, async (ctx) => {
      const id = Number(ctx.match[1]);
      const tg = ctx.from;
      const manager = await this.managers.findByTelegramId(tg.id);
      if (!manager || !manager.is_active)
        return ctx.answerCbQuery('Ruxsat yoʼq');
      const verified = await this.workers.verifyWorker(id);
      if (!verified) return ctx.answerCbQuery('Topilmadi');
      await ctx.reply(`Ishchi tasdiqlandi: ${verified.fullname}`);
    });
  }

  private async notifyManagers(message: string) {
    try {
      const managers = await this.managers.listActive();
      await Promise.all(
        managers.map((m) =>
          this.bot.telegram
            .sendMessage(m.telegram_id, message)
            .catch((e) =>
              this.logger.warn(`Notify fail to ${m.telegram_id}: ${e.message}`),
            ),
        ),
      );
    } catch (e: any) {
      this.logger.error('notifyManagers error', e?.message || e);
    }
  }

  private async workersListUnverified(limit = 10) {
    return this.workers.listUnverified(limit);
  }
}
