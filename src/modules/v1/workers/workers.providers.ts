import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { WorkerEntity } from '../../../entity/workers.entity';

export const workersProviders = [
  {
    provide: MODELS.WORKERS_MODEL,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(WorkerEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
