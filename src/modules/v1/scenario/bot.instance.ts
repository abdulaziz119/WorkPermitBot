import { Telegraf, session, Context } from 'telegraf';
import { TELEGRAM_BOT_TOKEN } from '../../../utils/env/env';

export type Ctx = Context & { session?: Record<string, any> };

let botInstance: Telegraf<Ctx> | null = null;
let launched = false;
let launchingPromise: Promise<void> | null = null;

export function getBot(): Telegraf<Ctx> {
  if (!botInstance) {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }
    botInstance = new Telegraf<Ctx>(TELEGRAM_BOT_TOKEN);
    // ensure session middleware only once
    botInstance.use(session());
  }
  return botInstance;
}

export async function ensureBotLaunched(log?: {
  log: (m: string) => any;
  error: (m: string, e?: any) => any;
}): Promise<void> {
  if (launched) return;
  if (launchingPromise) return launchingPromise;
  const bot = getBot();
  launchingPromise = (async () => {
    try {
      await bot.launch();
      launched = true;
      log?.log('Telegram bot launched');
    } catch (e) {
      log?.error?.('Bot launch error', e);
      throw e;
    } finally {
      launchingPromise = null;
    }
  })();
  return launchingPromise;
}

export function isLaunched(): boolean {
  return launched;
}
