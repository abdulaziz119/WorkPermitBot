import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { DB_SCHEMA } from '../utils/env/env';
import { WorkerEntity } from './workers.entity';
import { BaseEntity, cascadeUpdateRelationOptions } from './base.entity';

@Entity({ schema: DB_SCHEMA, name: 'attendance' })
export class AttendanceEntity extends BaseEntity {
  @Column({ type: 'integer' })
  worker_id: number;
  @ManyToOne(() => WorkerEntity, cascadeUpdateRelationOptions)
  @JoinColumn({ name: 'worker_id' })
  worker: WorkerEntity;

  @CreateDateColumn()
  date: Date; // Qaysi kun

  @Column({ type: 'timestamp', nullable: true })
  check_in: Date | null; // ishga kelgan vaqti

  @Column({ type: 'timestamp', nullable: true })
  check_out: Date | null; // ishni tark etgan vaqti
}
