import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { UserEntity } from '../../../entity/user.entity';

export const usersProviders = [
  {
    provide: MODELS.USER_MODEL,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(UserEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
