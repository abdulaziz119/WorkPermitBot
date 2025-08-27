import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { WorkerEntity } from '../../../entity/workers.entity';
import { WorkerRoleEnum } from '../../../utils/enum/user.enum';

@Injectable()
export class WorkersService {
  constructor(
    @Inject(MODELS.WORKERS_MODEL)
    private readonly repo: Repository<WorkerEntity>,
  ) {}

  async findByTelegramId(telegramId: number): Promise<WorkerEntity> {
    return this.repo.findOne({ where: { telegram_id: telegramId } });
  }

  async findById(id: number): Promise<WorkerEntity> {
    return this.repo.findOne({ where: { id } });
  }

  async createOrGet(
    telegramId: number,
    fullname: string,
    language: 'uz' | 'ru' = 'uz',
  ): Promise<WorkerEntity> {
    let worker: WorkerEntity = await this.findByTelegramId(telegramId);
    if (!worker) {
      worker = this.repo.create({
        telegram_id: telegramId,
        fullname,
        language,
      });
      worker = await this.repo.save(worker);
    } else if (fullname && worker.fullname !== fullname) {
      worker.fullname = fullname;
      await this.repo.save(worker);
    }
    return worker;
  }

  async setLanguage(
    telegramId: number,
    language: 'uz' | 'ru',
  ): Promise<WorkerEntity> {
    const worker: WorkerEntity = await this.findByTelegramId(telegramId);
    if (!worker) throw new NotFoundException('Worker not found');
    worker.language = language;
    return this.repo.save(worker);
  }

  async verifyWorker(workerId: number): Promise<WorkerEntity | null> {
    const worker: WorkerEntity = await this.findById(workerId);
    if (!worker) return null;
    if (!worker.is_verified) {
      worker.is_verified = true;
      await this.repo.save(worker);
    }
    return worker;
  }

  async listUnverified(limit = 10): Promise<WorkerEntity[]> {
    return this.repo.find({
      where: { is_verified: false },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async listVerified(): Promise<WorkerEntity[]> {
    return this.repo.find({
      where: { is_verified: true },
      order: { created_at: 'ASC' },
    });
  }

  async listVerifiedPaginated(
    page = 1,
    limit = 5,
  ): Promise<{
    workers: WorkerEntity[];
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const offset: number = (page - 1) * limit;
    const [workers, total] = await this.repo.findAndCount({
      where: { is_verified: true },
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

  // Role bilan bog'liq metodlar
  async setWorkerRole(
    workerId: number,
    role: WorkerRoleEnum,
  ): Promise<WorkerEntity | null> {
    const worker: WorkerEntity = await this.findById(workerId);
    if (!worker) return null;
    worker.role = role;
    return this.repo.save(worker);
  }

  async isProjectManager(telegramId: number): Promise<boolean> {
    const worker: WorkerEntity = await this.findByTelegramId(telegramId);
    return (
      worker &&
      worker.is_verified &&
      worker.role === WorkerRoleEnum.PROJECT_MANAGER
    );
  }

  async listProjectManagers(): Promise<WorkerEntity[]> {
    return this.repo.find({
      where: {
        is_verified: true,
        role: WorkerRoleEnum.PROJECT_MANAGER,
      },
      order: { created_at: 'ASC' },
    });
  }

  async listWorkersByRole(role: WorkerRoleEnum): Promise<WorkerEntity[]> {
    return this.repo.find({
      where: {
        is_verified: true,
        role: role,
      },
      order: { created_at: 'ASC' },
    });
  }
}
