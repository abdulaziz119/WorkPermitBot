import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
// import { ManagerEntity } from './managers.entity';
// import { WorkerEntity } from './workers.entity';
import { UserEntity } from './user.entity';
import { BaseEntity, cascadeUpdateRelationOptions } from './base.entity';
import { DB_SCHEMA } from '../utils/env/env';
import {
  RequestsStatusEnum,
  RequestTypeEnum,
  HourlyRequestTypeEnum,
} from '../utils/enum/requests.enum';

@Entity({ schema: DB_SCHEMA, name: 'requests' })
export class RequestEntity extends BaseEntity {
  @Column({ type: 'integer', nullable: true })
  worker_id: number;

  @ManyToOne(
    () => UserEntity,
    (worker) => worker.requests,
    cascadeUpdateRelationOptions,
  )
  @JoinColumn({ name: 'worker_id' })
  worker: UserEntity;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: RequestTypeEnum,
    default: RequestTypeEnum.DAILY,
  })
  request_type: RequestTypeEnum;

  @Column({
    type: 'enum',
    enum: RequestsStatusEnum,
    default: RequestsStatusEnum.PENDING,
  })
  status: RequestsStatusEnum;

  @Column({ type: 'date', nullable: true })
  approved_date: Date | null; // Qaysi sanaga ruxsat berildi

  @Column({ type: 'date', nullable: true })
  return_date: Date | null; // Qaysi sanada ishga qaytadi

  @Column({ type: 'timestamptz', nullable: true })
  hourly_leave_time: Date | null; // Soatlik javob vaqti (O'zbekiston vaqti)

  @Column({
    type: 'enum',
    enum: HourlyRequestTypeEnum,
    nullable: true,
  })
  hourly_request_type: HourlyRequestTypeEnum | null; // Kech kelish yoki erta ketish

  @Column({ type: 'integer', nullable: true })
  manager_id: number;

  @ManyToOne(() => UserEntity, (manager) => manager.approved_requests, {
    nullable: true,
  })
  @JoinColumn({ name: 'manager_id' })
  approved_by: UserEntity;

  @Column({ type: 'text', nullable: true })
  manager_comment: string | null; // Boshliq yozgan sabab
}
