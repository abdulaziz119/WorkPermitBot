import { Entity, Column, OneToMany } from 'typeorm';
import { RequestEntity } from './requests.entity';
import { DB_SCHEMA } from '../utils/env/env';
import { BaseEntity } from './base.entity';
import { UserRoleEnum } from '../utils/enum/user.enum';

@Entity({ schema: DB_SCHEMA, name: 'managers' })
export class ManagerEntity extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  telegram_id: number;

  @Column({ type: 'varchar', length: 100 })
  fullname: string;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    default: UserRoleEnum.SUPER_ADMIN,
  })
  role: UserRoleEnum;

  @Column({ type: 'boolean', default: false })
  is_active: boolean; // faqat active managerlar ga xabar boradi

  @Column({ type: 'varchar', length: 5, default: 'uz' })
  language: 'uz' | 'ru';

  @OneToMany(() => RequestEntity, (request) => request.approved_by)
  approved_requests: RequestEntity[];
}
