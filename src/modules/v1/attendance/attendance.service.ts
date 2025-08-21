import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { AttendanceEntity } from '../../../entity/attendance.entity';

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(MODELS.ATTENDANCE_MODEL)
    private readonly repo: Repository<AttendanceEntity>,
  ) {}

  async getToday(
    workerId: number,
    today = new Date(),
  ): Promise<AttendanceEntity> {
    const from: Date = startOfDay(today);
    const to: Date = endOfDay(today);
    return this.repo
      .createQueryBuilder('a')
      .where('a.worker_id = :workerId', { workerId })
      .andWhere('a.date BETWEEN :from AND :to', { from, to })
      .orderBy('a.created_at', 'DESC')
      .getOne();
  }

  async checkIn(workerId: number): Promise<AttendanceEntity> {
    let today: AttendanceEntity = await this.getToday(workerId);
    if (!today) {
      today = this.repo.create({ worker_id: workerId, check_in: new Date() });
    }
    if (!today.check_in) today.check_in = new Date();
    return this.repo.save(today);
  }

  async checkOut(workerId: number): Promise<AttendanceEntity> {
    let today: AttendanceEntity = await this.getToday(workerId);
    if (!today) {
      today = this.repo.create({ worker_id: workerId });
    }
    today.check_out = new Date();
    return this.repo.save(today);
  }
}
