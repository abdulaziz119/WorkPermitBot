import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  // Qaysi kun (faqat sana). Bir ishchi uchun har kunda 1 ta yozuv.
  @Column({ type: 'date' })
  date: string | Date;

  @Column({ type: 'timestamp', nullable: true })
  check_in: Date | null; // ishga kelgan vaqti

  @Column({ type: 'timestamp', nullable: true })
  check_out: Date | null; // ishni tark etgan vaqti

  @Column({ type: 'text', nullable: true })
  late_comment: string | null; // kech qolish sababi

  @Column({ type: 'timestamp', nullable: true })
  comment_time: Date | null; // comment qo'shilgan vaqt
}
