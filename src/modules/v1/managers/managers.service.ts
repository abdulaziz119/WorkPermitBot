import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { ManagerEntity } from '../../../entity/managers.entity';
import { UserRoleEnum } from '../../../utils/enum/user.enum';

@Injectable()
export class ManagersService {
  constructor(
    @Inject(MODELS.MANAGER_MODEL)
    private readonly managerRepo: Repository<ManagerEntity>,
  ) {}

  async findByTelegramId(telegramId: number): Promise<ManagerEntity> {
    return this.managerRepo.findOne({ where: { telegram_id: telegramId } });
  }

  async createIfNotExists(
    telegram_id: number,
    fullname: string,
    language: 'uz' | 'ru' = 'uz',
  ): Promise<ManagerEntity> {
    let manager: ManagerEntity = await this.findByTelegramId(telegram_id);
    if (manager) return manager;
    manager = this.managerRepo.create({
      telegram_id,
      fullname,
      is_active: false,
      language,
      role: UserRoleEnum.ADMIN, // Default to admin, not super_admin
    });
    return this.managerRepo.save(manager);
  }

  async setLanguage(
    telegram_id: number,
    language: 'uz' | 'ru',
  ): Promise<ManagerEntity> {
    const manager: ManagerEntity = await this.findByTelegramId(telegram_id);
    if (!manager) throw new NotFoundException('Manager not found');
    manager.language = language;
    return this.managerRepo.save(manager);
  }

  async setActive(
    telegram_id: number,
    active: boolean,
  ): Promise<ManagerEntity> {
    const manager: ManagerEntity = await this.findByTelegramId(telegram_id);
    if (!manager) throw new NotFoundException('Manager not found');
    manager.is_active = active;
    return this.managerRepo.save(manager);
  }

  async listActiveManagers(): Promise<ManagerEntity[]> {
    return this.managerRepo.find({ where: { is_active: true } });
  }

  async createOrGet(
    telegramId: number,
    fullname: string,
  ): Promise<ManagerEntity> {
    let manager: ManagerEntity = await this.findByTelegramId(telegramId);
    if (!manager) {
      manager = this.managerRepo.create({
        telegram_id: telegramId,
        fullname,
        is_active: false,
        role: UserRoleEnum.ADMIN,
      });
      manager = await this.managerRepo.save(manager);
    } else if (fullname && manager.fullname !== fullname) {
      manager.fullname = fullname;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async activate(telegramId: number): Promise<ManagerEntity> {
    const manager: ManagerEntity = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (!manager.is_active) {
      manager.is_active = true;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async listActive(): Promise<ManagerEntity[]> {
    return this.managerRepo.find({ where: { is_active: true } });
  }

  async deactivate(telegramId: number): Promise<ManagerEntity> {
    const manager: ManagerEntity = await this.findByTelegramId(telegramId);
    if (!manager) return null;
    if (manager.is_active) {
      manager.is_active = false;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async listSuperAdmins(): Promise<ManagerEntity[]> {
    return this.managerRepo.find({
      where: { role: UserRoleEnum.SUPER_ADMIN, is_active: true },
    });
  }

  async listUnverified(): Promise<ManagerEntity[]> {
    return this.managerRepo.find({
      where: { is_active: false },
      order: { created_at: 'DESC' },
    });
  }

  async isSuperAdmin(telegramId: number): Promise<boolean> {
    const manager = await this.findByTelegramId(telegramId);
    return manager?.role === UserRoleEnum.SUPER_ADMIN && manager?.is_active;
  }

  async isAdmin(telegramId: number): Promise<boolean> {
    const manager = await this.findByTelegramId(telegramId);
    return manager?.role === UserRoleEnum.ADMIN && manager?.is_active;
  }

  async verifyManager(managerId: number): Promise<ManagerEntity | null> {
    const manager = await this.managerRepo.findOne({
      where: { id: managerId },
    });
    if (!manager) return null;
    if (!manager.is_active) {
      manager.is_active = true;
      await this.managerRepo.save(manager);
    }
    return manager;
  }

  async verifyManagerWithRole(
    managerId: number,
    role: UserRoleEnum,
  ): Promise<ManagerEntity | null> {
    const manager = await this.managerRepo.findOne({
      where: { id: managerId },
    });
    if (!manager) return null;

    // Role va active holatini yangilash
    manager.is_active = true;
    manager.role =
      role === UserRoleEnum.SUPER_ADMIN
        ? UserRoleEnum.SUPER_ADMIN
        : UserRoleEnum.ADMIN;
    await this.managerRepo.save(manager);

    return manager;
  }

  // Role bo'yicha manager larni topish
  async findByRole(role: UserRoleEnum): Promise<ManagerEntity[]> {
    return this.managerRepo.find({
      where: {
        role: role,
        is_active: true,
      },
      order: { created_at: 'DESC' },
    });
  }
}
