import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { WorkerEntity } from '../../../entity/workers.entity';

@Injectable()
export class WorkersService {
  constructor(
    @Inject(MODELS.WORKERS_MODEL)
    private readonly repo: Repository<WorkerEntity>,
  ) {}

  async findByTelegramId(telegramId: number) {
    return this.repo.findOne({ where: { telegram_id: telegramId } });
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async createOrGet(telegramId: number, fullname: string) {
    let worker = await this.findByTelegramId(telegramId);
    if (!worker) {
      worker = this.repo.create({ telegram_id: telegramId, fullname });
      worker = await this.repo.save(worker);
    } else if (fullname && worker.fullname !== fullname) {
      worker.fullname = fullname;
      await this.repo.save(worker);
    }
    return worker;
  }

  async verifyWorker(workerId: number) {
    const worker = await this.findById(workerId);
    if (!worker) return null;
    if (!worker.is_verified) {
      worker.is_verified = true;
      await this.repo.save(worker);
    }
    return worker;
  }

  async listUnverified(limit = 10) {
    return this.repo.find({
      where: { is_verified: false },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
