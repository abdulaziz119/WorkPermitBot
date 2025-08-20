import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { ManagerEntity } from '../../../entity/managers.entity';

export const managersProviders = [
  {
    provide: MODELS.MANAGER_MODEL,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(ManagerEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
