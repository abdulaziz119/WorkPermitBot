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

  async createRequest(
    workerId: number,
    reason: string,
    approvedDate?: Date,
  ): Promise<RequestEntity> {
    const entity: RequestEntity = this.repo.create({
      worker_id: workerId,
      reason,
      approved_date: approvedDate || null,
      status: RequestsStatusEnum.PENDING,
    });
    return this.repo.save(entity);
  }

  async listPending(): Promise<RequestEntity[]> {
    return this.repo.find({
      where: { status: RequestsStatusEnum.PENDING },
      relations: ['worker'],
      order: { created_at: 'DESC' },
    });
  }

  async findByIdWithWorker(requestId: number): Promise<RequestEntity | null> {
    return this.repo.findOne({
      where: { id: requestId },
      relations: ['worker', 'approved_by'],
    });
  }

  async listByWorker(workerId: number): Promise<RequestEntity[]> {
    return this.repo.find({
      where: { worker_id: workerId },
      order: { created_at: 'DESC' },
    });
  }

  async approve(
    requestId: number,
    managerId: number,
    comment?: string,
  ): Promise<RequestEntity | null> {
    const entity: RequestEntity = await this.repo.findOne({
      where: { id: requestId },
    });
    if (!entity) return null;
    entity.status = RequestsStatusEnum.APPROVED;
    entity.manager_id = managerId;
    entity.manager_comment = comment || null;
    return this.repo.save(entity);
  }

  async reject(
    requestId: number,
    managerId: number,
    comment?: string,
  ): Promise<RequestEntity | null> {
    const entity: RequestEntity = await this.repo.findOne({
      where: { id: requestId },
    });
    if (!entity) return null;
    entity.status = RequestsStatusEnum.REJECTED;
    entity.manager_id = managerId;
    entity.manager_comment = comment || null;
    return this.repo.save(entity);
  }

  async getRequestsByPeriod(
    workerIds: number[],
    period: 'day' | 'week' | 'month' | 'year',
  ): Promise<RequestEntity[]> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(
          startOfWeek.getFullYear(),
          startOfWeek.getMonth(),
          startOfWeek.getDate(),
        );
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return this.repo
      .createQueryBuilder('request')
      .where('request.worker_id IN (:...workerIds)', { workerIds })
      .andWhere('request.approved_date >= :startDate', { startDate })
      .andWhere('request.approved_date <= :endDate', { endDate: now })
      .getMany();
  }

  // 3 kundan ortiq vaqt oldin javob olgan request larni topish
  async findResponsesOlderThan(dateThreshold: Date): Promise<RequestEntity[]> {
    return this.repo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.worker', 'worker')
      .leftJoinAndSelect('request.approved_by', 'approved_by')
      .where('(request.status = :approved OR request.status = :rejected)', {
        approved: RequestsStatusEnum.APPROVED,
        rejected: RequestsStatusEnum.REJECTED,
      })
      .andWhere('request.updated_at < :dateThreshold', { dateThreshold })
      .orderBy('request.updated_at', 'DESC')
      .getMany();
  }
}
