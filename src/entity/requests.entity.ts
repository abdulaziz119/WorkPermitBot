import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ManagerEntity } from './managers.entity';
import { WorkerEntity } from './workers.entity';
import { cascadeUpdateRelationOptions } from './base.entity';
import { DB_SCHEMA } from '../utils/env/env';
import { RequestsStatusEnum } from '../utils/enum/requests.enum';

@Entity({ schema: DB_SCHEMA, name: 'requests' })
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => WorkerEntity,
    (worker) => worker.requests,
    cascadeUpdateRelationOptions,
  )
  worker: WorkerEntity;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: RequestsStatusEnum,
    default: RequestsStatusEnum.APPROVED,
  })
  status: RequestsStatusEnum;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ManyToOne(() => ManagerEntity, (manager) => manager.approved_requests, {
    nullable: true,
  })
  approved_by: ManagerEntity;

  @Column({ type: 'text', nullable: true })
  manager_comment: string | null; // Boshliq yozgan sabab
}
