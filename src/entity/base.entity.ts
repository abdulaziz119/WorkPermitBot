import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  BeforeUpdate,
  BeforeRemove,
} from 'typeorm';
import * as Orm from 'typeorm';
import { getUzbekistanTime } from '../utils/time/uzbekistan-time';

export class BaseEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @BeforeInsert()
  setCreateDate() {
    this.created_at = getUzbekistanTime();
    this.updated_at = getUzbekistanTime();
  }

  @BeforeUpdate()
  setUpdateDate() {
    this.updated_at = getUzbekistanTime();
  }

  @BeforeRemove()
  setDeleteDate() {
    this.deleted_at = getUzbekistanTime();
  }
}

export const cascadeUpdateRelationOptions: Orm.RelationOptions = {
  cascade: ['update'],
  onDelete: 'CASCADE',
  eager: false,
};
