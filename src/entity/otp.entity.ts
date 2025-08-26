import { Column, Entity, Unique } from 'typeorm';
import { DB_SCHEMA } from '../utils/env/env';
import { BaseEntity } from './base.entity';

@Entity({ schema: DB_SCHEMA, name: 'otps' })
@Unique(['email'])
export class OtpEntity extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ length: 6, nullable: false })
  otp: string;

  @Column({ type: 'timestamp', nullable: false })
  otpSendAt: Date;

  @Column({ type: 'int', default: 0, nullable: false })
  retryCount: number;

  @Column({ type: 'int', default: 0, nullable: false })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  blockedUntil: Date | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;
}
