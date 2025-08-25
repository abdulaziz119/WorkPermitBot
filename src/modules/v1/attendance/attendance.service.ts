import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { AttendanceEntity } from '../../../entity/attendance.entity';
import { nowInTz, currentDateString } from '../../../utils/time/timezone';

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
  ): Promise<AttendanceEntity | null> {
    const from = startOfDay(today);
    const to = endOfDay(today);
    // Select the latest record created today for this worker (should be at most one)
    return this.repo
      .createQueryBuilder('a')
      .where('a.worker_id = :workerId', { workerId })
      .andWhere('a.created_at BETWEEN :from AND :to', {
        from,
        to,
      })
      .orderBy('a.created_at', 'DESC')
      .getOne();
  }

  async checkIn(workerId: number): Promise<AttendanceEntity> {
    const now = nowInTz();
    let today: AttendanceEntity | null = await this.getToday(workerId, now);
    if (!today) {
      const dateStr = currentDateString();
      today = this.repo.create({
        worker_id: workerId,
        date: dateStr,
        check_in: now,
      });
    } else if (!today.check_in) {
      today.check_in = now;
    } else {
      // Already checked in today
      const err = new Error('CHECKIN_ALREADY_DONE');
      // @ts-ignore custom code for callers
      (err as any).code = 'CHECKIN_ALREADY_DONE';
      throw err;
    }
    return this.repo.save(today);
  }

  async checkOut(workerId: number): Promise<AttendanceEntity> {
    const now = nowInTz();
    const today: AttendanceEntity | null = await this.getToday(workerId, now);
    if (!today || !today.check_in) {
      const err = new Error('CHECKIN_REQUIRED');
      // @ts-ignore
      (err as any).code = 'CHECKIN_REQUIRED';
      throw err;
    }
    if (today.check_out) {
      const err = new Error('CHECKOUT_ALREADY_DONE');
      // @ts-ignore
      (err as any).code = 'CHECKOUT_ALREADY_DONE';
      throw err;
    }
    today.check_out = now;
    return this.repo.save(today);
  }

  // Create or update attendance for today with both check_in and check_out in one call
  async upsertToday(
    workerId: number,
    payload: { check_in?: Date; check_out?: Date },
    onDate = new Date(),
  ): Promise<AttendanceEntity> {
    const day: Date = startOfDay(onDate);
    const yyyy: number = day.getFullYear();
    const mm: string = String(day.getMonth() + 1).padStart(2, '0');
    const dd: string = String(day.getDate()).padStart(2, '0');
    const dateOnly = `${yyyy}-${mm}-${dd}`;

    let rec: AttendanceEntity = await this.getToday(workerId, day);
    if (!rec) {
      rec = this.repo.create({ worker_id: workerId, date: dateOnly });
    }
    if (payload.check_in) rec.check_in = payload.check_in;
    if (payload.check_out) rec.check_out = payload.check_out;
    return this.repo.save(rec);
  }

  async getAttendanceByPeriod(
    workerIds: number[],
    period: 'day' | 'week' | 'month' | 'year',
  ): Promise<AttendanceEntity[]> {
    const now = new Date();
    let startDate: Date;
    const endDate: Date = endOfDay(now);

    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate = startOfDay(startDate);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfDay(startDate);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate = startOfDay(startDate);
        break;
    }

    return this.repo
      .createQueryBuilder('a')
      .where('a.worker_id IN (:...workerIds)', { workerIds })
      .andWhere('a.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('a.worker_id', 'ASC')
      .addOrderBy('a.created_at', 'DESC')
      .getMany();
  }
}
