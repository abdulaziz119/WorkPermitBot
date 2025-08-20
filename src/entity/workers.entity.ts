import { Entity, Column, OneToMany } from 'typeorm';
import { RequestEntity } from './requests.entity';
import { DB_SCHEMA } from '../utils/env/env';
import { BaseEntity } from './base.entity';

@Entity({ schema: DB_SCHEMA, name: 'workers' })
export class WorkerEntity extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 100 })
  fullname: string;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean; // manager tasdiqlagandan keyin true bo'ladi

  @OneToMany(() => RequestEntity, (request) => request.worker)
  requests: RequestEntity[];
}
