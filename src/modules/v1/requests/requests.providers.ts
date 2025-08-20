import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { RequestEntity } from '../../../entity/requests.entity';

export const requestProviders = [
  {
    provide: MODELS.REQUEST_MODEL,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(RequestEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
