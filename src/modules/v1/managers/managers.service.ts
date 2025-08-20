import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { ManagerEntity } from '../../../entity/managers.entity';

@Injectable()
export class ManagersService {
  constructor(
    @Inject(MODELS.MANAGER_MODEL)
    private readonly managerRepo: Repository<ManagerEntity>,
  ) {}

  async findByTelegramId(telegramId: number) {
    return this.managerRepo.findOne({ where: { telegram_id: telegramId } });
  }

  async createIfNotExists(
    telegram_id: number,
    fullname: string,
    language: 'uz' | 'ru' = 'uz',
  ) {
    let manager = await this.findByTelegramId(telegram_id);
    if (manager) return manager;
    manager = this.managerRepo.create({
      telegram_id,
      fullname,
      is_active: false,
      language,
    });
    return this.managerRepo.save(manager);
  }

  async setLanguage(telegram_id: number, language: 'uz' | 'ru') {
    const manager = await this.findByTelegramId(telegram_id);
    if (!manager) throw new NotFoundException('Manager not found');
    manager.language = language;
    return this.managerRepo.save(manager);
  }

  async setActive(telegram_id: number, active: boolean) {
    const manager = await this.findByTelegramId(telegram_id);
    if (!manager) throw new NotFoundException('Manager not found');
    manager.is_active = active;
    return this.managerRepo.save(manager);
  }

  async listActiveManagers() {
    return this.managerRepo.find({ where: { is_active: true } });
  }

  async createOrGet(telegramId: number, fullname: string) {
    let manager = await this.findByTelegramId(telegramId);
    if (!manager) {
      manager = this.managerRepo.create({
        telegram_id: telegramId,
        fullname,
        is_active: false,
      });
      manager = await this.managerRepo.save(manager);
    } else if (fullname && manager.fullname !== fullname) {
      manager.fullname = fullname;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async activate(telegramId: number) {
    const manager = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (!manager.is_active) {
      manager.is_active = true;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async listActive() {
    return this.managerRepo.find({ where: { is_active: true } });
  }

  async deactivate(telegramId: number) {
    const manager = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (manager.is_active) {
      manager.is_active = false;
      await this.managerRepo.save(manager);
    }
    return manager;
  }
}
