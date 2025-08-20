import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ManagerEntity } from './managers.entity';
import { WorkerEntity } from './workers.entity';
import { BaseEntity, cascadeUpdateRelationOptions } from './base.entity';
import { DB_SCHEMA } from '../utils/env/env';
import { RequestsStatusEnum } from '../utils/enum/requests.enum';

@Entity({ schema: DB_SCHEMA, name: 'requests' })
export class RequestEntity extends BaseEntity {
  @Column({ type: 'integer', nullable: true })
  worker_id: number;

  @ManyToOne(
    () => WorkerEntity,
    (worker) => worker.requests,
    cascadeUpdateRelationOptions,
  )
  @JoinColumn({ name: 'worker_id' })
  worker: WorkerEntity;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: RequestsStatusEnum,
    default: RequestsStatusEnum.PENDING,
  })
  status: RequestsStatusEnum;

  @Column({ type: 'date', nullable: true })
  approved_date: Date | null; // Qaysi sanaga ruxsat berildi

  @Column({ type: 'integer', nullable: true })
  manager_id: number;

  @ManyToOne(() => ManagerEntity, (manager) => manager.approved_requests, {
    nullable: true,
  })
  @JoinColumn({ name: 'manager_id' })
  approved_by: ManagerEntity;

  @Column({ type: 'text', nullable: true })
  manager_comment: string | null; // Boshliq yozgan sabab
}
