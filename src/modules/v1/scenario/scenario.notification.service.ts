import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Telegraf } from 'telegraf';
import { getBot } from './bot.instance';
import { RequestsService } from '../requests/requests.service';
import { ManagersService } from '../managers/managers.service';
import { UserRoleEnum } from '../../../utils/enum/user.enum';
import { RequestsStatusEnum } from '../../../utils/enum/requests.enum';

type Lang = 'uz' | 'ru';

@Injectable()
export class ScenarioNotificationService {
  private readonly logger = new Logger(ScenarioNotificationService.name);
  private readonly bot: Telegraf;

  constructor(
    private readonly requests: RequestsService,
    private readonly managers: ManagersService,
  ) {
    this.bot = getBot();
  }

  // Har kuni soat 10:00 da ishga tushadi
  @Cron('0 10 * * *', {
    name: 'checkOldResponses',
    timeZone: 'Asia/Tashkent', // O'zbekiston vaqti
  })
  async handleCheckOldResponses() {
    this.logger.log('Checking for old worker responses...');

    try {
      // Default: 3 kun oldin javob olgan request larni topish
      await this.checkAndNotifyOldResponses(3);
    } catch (error) {
      this.logger.error('Error checking old responses:', error);
    }
  }

  // Universal method - istalgan kun uchun tekshirish
  async checkAndNotifyOldResponses(daysThreshold: number = 3): Promise<void> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const oldResponses =
      await this.requests.findResponsesOlderThan(thresholdDate);

    if (oldResponses.length === 0) {
      this.logger.log(`No responses older than ${daysThreshold} days found`);
      return;
    }

    // Super admin manager larni topish
    const superAdminManagers = await this.managers.findByRole(
      UserRoleEnum.SUPER_ADMIN,
    );

    if (superAdminManagers.length === 0) {
      this.logger.warn('No super admin managers found');
      return;
    }

    // Har bir super admin ga xabar yuborish
    for (const manager of superAdminManagers) {
      await this.notifySuperAdminAboutOldResponses(
        manager,
        oldResponses,
        daysThreshold,
      );
    }

    this.logger.log(
      `Notified ${superAdminManagers.length} super admins about ${oldResponses.length} responses older than ${daysThreshold} days`,
    );
  }

  private async notifySuperAdminAboutOldResponses(
    manager: any,
    oldResponses: any[],
    daysThreshold?: number,
  ): Promise<void> {
    try {
      const managerLang: Lang = (manager.language as Lang) || 'uz';

      let messageText =
        managerLang === 'ru'
          ? '🚨 Уведомление о старых ответах\n\nСледующие работники получили ответ:\n\n'
          : '🚨 Eski javoblar haqida xabar\n\nQuyidagi ishchilar javob olgan:\n\n';

      // Har bir eski javob uchun ma'lumot qo'shish
      oldResponses.forEach((response, index) => {
        const workerName =
          response.worker?.fullname || `Worker ID: ${response.worker_id}`;
        const responseDate = new Date(response.updated_at).toLocaleDateString(
          'uz-UZ',
        );
        const daysAgo = Math.floor(
          (Date.now() - new Date(response.updated_at).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (managerLang === 'ru') {
          messageText += `${index + 1}. 👤 ${workerName}\n`;
          messageText += `   📅 Ответ получен: ${responseDate} (${daysAgo} дней назад)\n`;
          messageText += `   📝 Статус: ${response.status === RequestsStatusEnum.APPROVED ? 'Одобрено ✅' : 'Отклонено ❌'}\n\n`;
        } else {
          messageText += `${index + 1}. 👤 ${workerName}\n`;
          messageText += `   📅 Javob olgan: ${responseDate} (${daysAgo} kun oldin)\n`;
          messageText += `   📝 Holat: ${response.status === RequestsStatusEnum.APPROVED ? 'Tasdiqlandi ✅' : 'Rad etildi ❌'}\n\n`;
        }
      });

      // Xabar uzunligi Telegram limitidan oshmasligi uchun tekshirish
      if (messageText.length > 4000) {
        // Eng eski va eng yangi javob kunlarini topish
        const daysAgoList = oldResponses.map((response) =>
          Math.floor(
            (Date.now() - new Date(response.updated_at).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        const minDays = Math.min(...daysAgoList);
        const maxDays = Math.max(...daysAgoList);

        let daysText = '';
        if (minDays === maxDays) {
          daysText =
            managerLang === 'ru'
              ? `${minDays} дней назад`
              : `${minDays} kun oldin`;
        } else {
          daysText =
            managerLang === 'ru'
              ? `${minDays}-${maxDays} дней назад`
              : `${minDays}-${maxDays} kun oraliqda`;
        }

        const thresholdText = daysThreshold
          ? managerLang === 'ru'
            ? `более ${daysThreshold} дней назад`
            : `${daysThreshold} kundan ortiq oldin`
          : daysText;

        // Worker ismlarini qisqacha ro'yxat qilish
        const workerNames = oldResponses
          .slice(0, 5) // Faqat birinchi 5 ta worker ismini ko'rsatish
          .map(
            (response) =>
              response.worker?.fullname || `Worker ID: ${response.worker_id}`,
          )
          .join(', ');

        const remainingCount =
          oldResponses.length > 5 ? oldResponses.length - 5 : 0;
        const workerListText =
          remainingCount > 0
            ? `${workerNames} va yana ${remainingCount} ta`
            : workerNames;

        const summaryText =
          managerLang === 'ru'
            ? `🚨 Уведомление о старых ответах\n\n📊 ${thresholdText} ответ получили:\n👥 ${workerListText}\n\nВсего: ${oldResponses.length} работников`
            : `🚨 Eski javoblar haqida xabar\n\n📊 ${thresholdText} javob olganlar:\n👥 ${workerListText}\n\nJami: ${oldResponses.length} ta ishchi`;

        messageText = summaryText;
      }

      await this.bot.telegram.sendMessage(manager.telegram_id, messageText);
    } catch (error) {
      this.logger.warn(
        `Could not notify super admin ${manager.id}:`,
        error.message,
      );
    }
  }

  // Manual test uchun method
  async manualCheckOldResponses(daysThreshold: number = 3): Promise<string> {
    this.logger.log(
      `Manual check for responses older than ${daysThreshold} days...`,
    );

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const oldResponses =
        await this.requests.findResponsesOlderThan(thresholdDate);

      if (oldResponses.length === 0) {
        return `${daysThreshold} kundan ortiq eski javoblar topilmadi`;
      }

      const superAdminManagers = await this.managers.findByRole(
        UserRoleEnum.SUPER_ADMIN,
      );

      if (superAdminManagers.length === 0) {
        return 'Super admin manager lar topilmadi';
      }

      for (const manager of superAdminManagers) {
        await this.notifySuperAdminAboutOldResponses(
          manager,
          oldResponses,
          daysThreshold,
        );
      }

      return `${superAdminManagers.length} ta super admin ga ${daysThreshold} kundan ortiq eski ${oldResponses.length} ta javob haqida xabar yuborildi`;
    } catch (error) {
      this.logger.error('Manual check error:', error);
      return `Xatolik: ${error.message}`;
    }
  }
}
