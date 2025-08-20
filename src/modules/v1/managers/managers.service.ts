import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { ManagerEntity } from '../../../entity/managers.entity';

@Injectable()
export class ManagersService {
  constructor(
    @Inject(MODELS.MANAGER_MODEL)
    private readonly repo: Repository<ManagerEntity>,
  ) {}

  async findByTelegramId(telegramId: number) {
    return this.repo.findOne({ where: { telegram_id: telegramId } });
  }

  async createOrGet(telegramId: number, fullname: string) {
    let manager = await this.findByTelegramId(telegramId);
    if (!manager) {
      manager = this.repo.create({ telegram_id: telegramId, fullname, is_active: false });
      manager = await this.repo.save(manager);
    } else if (fullname && manager.fullname !== fullname) {
      manager.fullname = fullname;
      await this.repo.save(manager);
    }
    return manager;
  }

  async activate(telegramId: number) {
    const manager = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (!manager.is_active) {
      manager.is_active = true;
      await this.repo.save(manager);
    }
    return manager;
  }

  async listActive() {
    return this.repo.find({ where: { is_active: true } });
  }

  async deactivate(telegramId: number) {
    const manager = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (manager.is_active) {
      manager.is_active = false;
      await this.repo.save(manager);
    }
    return manager;
  }
}
