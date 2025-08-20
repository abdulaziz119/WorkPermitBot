import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RequestEntity } from './requests.entity';
import { DB_SCHEMA } from '../utils/env/env';

@Entity({ schema: DB_SCHEMA, name: 'managers' })
export class ManagerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', unique: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 100 })
  fullname: string;

  @OneToMany(() => RequestEntity, (request) => request.approved_by)
  approved_requests: RequestEntity[];
}
