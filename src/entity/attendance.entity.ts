import { Entity, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { DB_SCHEMA } from '../utils/env/env';
import { WorkerEntity } from './workers.entity';
import { BaseEntity, cascadeUpdateRelationOptions } from './base.entity';

@Entity({ schema: DB_SCHEMA, name: 'attendance' })
export class AttendanceEntity extends BaseEntity {
  @ManyToOne(() => WorkerEntity, cascadeUpdateRelationOptions)
  worker: WorkerEntity;

  @CreateDateColumn()
  date: Date; // Qaysi kun

  @Column({ type: 'timestamp', nullable: true })
  check_in: Date | null; // ishga kelgan vaqti

  @Column({ type: 'timestamp', nullable: true })
  check_out: Date | null; // ishni tark etgan vaqti
}
