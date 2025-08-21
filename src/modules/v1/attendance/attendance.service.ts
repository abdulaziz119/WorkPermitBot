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
    const day = startOfDay(today);
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const dateOnly = `${yyyy}-${mm}-${dd}`; // matches date column
    return this.repo
      .createQueryBuilder('a')
      .where('a.worker_id = :workerId', { workerId })
      .andWhere('a.date = :dateOnly', { dateOnly })
      .getOne();
  }

  async checkIn(workerId: number): Promise<AttendanceEntity> {
    const now = new Date();
    let today: AttendanceEntity | null = await this.getToday(workerId, now);
    if (!today) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      today = this.repo.create({
        worker_id: workerId,
        date: `${yyyy}-${mm}-${dd}`,
        check_in: now,
      });
    } else if (!today.check_in) {
      today.check_in = now;
    }
    return this.repo.save(today);
  }

  async checkOut(workerId: number): Promise<AttendanceEntity> {
    const now = new Date();
    let today: AttendanceEntity | null = await this.getToday(workerId, now);
    if (!today) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      today = this.repo.create({
        worker_id: workerId,
        date: `${yyyy}-${mm}-${dd}`,
        check_out: now,
      });
    } else {
      today.check_out = now;
    }
    return this.repo.save(today);
  }

  // Create or update attendance for today with both check_in and check_out in one call
  async upsertToday(
    workerId: number,
    payload: { check_in?: Date; check_out?: Date },
    onDate = new Date(),
  ): Promise<AttendanceEntity> {
    const day = startOfDay(onDate);
    const yyyy = day.getFullYear();
    const mm = String(day.getMonth() + 1).padStart(2, '0');
    const dd = String(day.getDate()).padStart(2, '0');
    const dateOnly = `${yyyy}-${mm}-${dd}`;

    let rec = await this.getToday(workerId, day);
    if (!rec) {
      rec = this.repo.create({ worker_id: workerId, date: dateOnly });
    }
    if (payload.check_in) rec.check_in = payload.check_in;
    if (payload.check_out) rec.check_out = payload.check_out;
    return this.repo.save(rec);
  }
}
