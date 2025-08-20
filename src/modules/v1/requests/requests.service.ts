import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { RequestEntity } from '../../../entity/requests.entity';
import { RequestsStatusEnum } from '../../../utils/enum/requests.enum';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(MODELS.REQUEST_MODEL)
    private readonly repo: Repository<RequestEntity>,
  ) {}

  async createRequest(workerId: number, reason: string, approvedDate?: Date) {
    const entity = this.repo.create({
      worker_id: workerId,
      reason,
      approved_date: approvedDate || null,
      status: RequestsStatusEnum.PENDING,
    });
    return this.repo.save(entity);
  }

  async listPending() {
    return this.repo.find({
      where: { status: RequestsStatusEnum.PENDING },
      order: { created_at: 'DESC' },
    });
  }

  async listByWorker(workerId: number) {
    return this.repo.find({
      where: { worker_id: workerId },
      order: { created_at: 'DESC' },
    });
  }

  async approve(requestId: number, managerId: number, comment?: string) {
    const entity = await this.repo.findOne({ where: { id: requestId } });
    if (!entity) return null;
    entity.status = RequestsStatusEnum.APPROVED;
    entity.manager_id = managerId;
    entity.manager_comment = comment || null;
    return this.repo.save(entity);
  }

  async reject(requestId: number, managerId: number, comment?: string) {
    const entity = await this.repo.findOne({ where: { id: requestId } });
    if (!entity) return null;
    entity.status = RequestsStatusEnum.REJECTED;
    entity.manager_id = managerId;
    entity.manager_comment = comment || null;
    return this.repo.save(entity);
  }
}
