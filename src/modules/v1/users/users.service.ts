import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { UserEntity } from '../../../entity/user.entity';
import { UserRoleEnum } from '../../../utils/enum/user.enum';

@Injectable()
export class UsersService {
  constructor(
    @Inject(MODELS.USER_MODEL)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByTelegramId(telegramId: number): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { telegram_id: telegramId } });
  }

  async findById(id: number): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async createOrUpdate(
    telegramId: number,
    fullname: string,
    language: 'uz' | 'ru' = 'uz',
    role: UserRoleEnum = UserRoleEnum.WORKER,
  ): Promise<UserEntity> {
    let user = await this.findByTelegramId(telegramId);
    if (!user) {
      user = this.repo.create({
        telegram_id: telegramId,
        fullname,
        language,
        role,
        is_active: [UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN].includes(role)
          ? false
          : true,
        is_verified: role === UserRoleEnum.WORKER ? false : true,
      });
    } else {
      if (fullname && user.fullname !== fullname) user.fullname = fullname;
      if (language && user.language !== language) user.language = language;
      if (role && user.role !== role) user.role = role;
    }
    return this.repo.save(user);
  }

  async setLanguage(
    telegramId: number,
    language: 'uz' | 'ru',
  ): Promise<UserEntity> {
    const user = await this.findByTelegramId(telegramId);
    if (!user) throw new NotFoundException('User not found');
    user.language = language;
    return this.repo.save(user);
  }

  async verifyUser(userId: number): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    if (!user.is_verified) {
      user.is_verified = true;
      await this.repo.save(user);
    }
    return user;
  }

  async activateUser(userId: number): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    if (!user.is_active) {
      user.is_active = true;
      await this.repo.save(user);
    }
    return user;
  }

  async deactivateUser(userId: number): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    if (user.is_active) {
      user.is_active = false;
      await this.repo.save(user);
    }
    return user;
  }

  async listByRole(
    role: UserRoleEnum,
    activeOnly = true,
  ): Promise<UserEntity[]> {
    return this.repo.find({
      where: {
        role,
        ...(activeOnly ? { is_active: true } : {}),
      },
      order: { created_at: 'ASC' },
    });
  }

  async listUnverifiedWorkers(limit = 10): Promise<UserEntity[]> {
    return this.repo.find({
      where: { role: UserRoleEnum.WORKER, is_verified: false },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async listVerifiedWorkers(): Promise<UserEntity[]> {
    return this.repo.find({
      where: {
        role: In([
          UserRoleEnum.WORKER,
          UserRoleEnum.PROJECT_MANAGER,
          UserRoleEnum.ADMIN,
        ]),
        is_verified: true,
      },
      order: { created_at: 'ASC' },
    });
  }

  async listVerifiedWorkersPaginated(page = 1, limit = 5) {
    const offset = (page - 1) * limit;
    const [workers, total] = await this.repo.findAndCount({
      where: {
        role: In([
          UserRoleEnum.WORKER,
          UserRoleEnum.PROJECT_MANAGER,
          UserRoleEnum.ADMIN,
        ]),
        is_verified: true,
      },
      order: { created_at: 'ASC' },
      skip: offset,
      take: limit,
    });
    return {
      workers,
      total,
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    };
  }

  async isSuperAdmin(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return !!user && user.role === UserRoleEnum.SUPER_ADMIN && user.is_active;
  }

  async isAdmin(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return !!user && user.role === UserRoleEnum.ADMIN && user.is_active;
  }

  async isProjectManager(telegramId: number): Promise<boolean> {
    const user = await this.findByTelegramId(telegramId);
    return (
      !!user &&
      user.role === UserRoleEnum.PROJECT_MANAGER &&
      user.is_verified &&
      user.is_active
    );
  }

  async setUserRole(
    userId: number,
    role: UserRoleEnum,
  ): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) return null;
    user.role = role;
    return this.repo.save(user);
  }
}
