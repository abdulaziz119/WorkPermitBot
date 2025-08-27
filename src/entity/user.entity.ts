import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { DB_SCHEMA } from '../utils/env/env';
import { UserRoleEnum } from '../utils/enum/user.enum';
import { RequestEntity } from './requests.entity';
import { AttendanceEntity } from './attendance.entity';

@Entity({ schema: DB_SCHEMA, name: 'users' })
export class UserEntity extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 100 })
  fullname: string;

  // Worker specific flag (old is_verified)
  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  // Manager specific activation flag (old is_active)
  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.WORKER,
  })
  role: UserRoleEnum;

  @Column({ type: 'varchar', length: 5, default: 'uz' })
  language: 'uz' | 'ru';

  // Requests created by (as worker)
  @OneToMany(() => RequestEntity, (request) => request.worker)
  requests: RequestEntity[];

  // Requests approved (as manager)
  @OneToMany(() => RequestEntity, (request) => request.approved_by)
  approved_requests: RequestEntity[];

  @OneToMany(() => AttendanceEntity, (attendance) => attendance.worker)
  attendance_records: AttendanceEntity[];
}
