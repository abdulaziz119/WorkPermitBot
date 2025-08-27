import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { WORK_PERMIT_BOT_DATA_SOURCE } from '../constants/constants';
import {
  DB_DB,
  DB_HOST,
  DB_PASS,
  DB_PORT,
  DB_SCHEMA,
  DB_USER,
} from '../utils/env/env';
import { WorkerEntity } from '../entity/workers.entity';
import { ManagerEntity } from '../entity/managers.entity';
import { RequestEntity } from '../entity/requests.entity';
import { AttendanceEntity } from '../entity/attendance.entity';

export const databaseProviders = [
  {
    provide: WORK_PERMIT_BOT_DATA_SOURCE,
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'postgres',
        host: DB_HOST,
        port: DB_PORT,
        username: DB_USER,
        password: DB_PASS,
        database: DB_DB,
        synchronize: false,
        logging: false,
        schema: DB_SCHEMA,
        entities: [
          WorkerEntity,
          ManagerEntity,
          RequestEntity,
          AttendanceEntity,
        ],
        // extra: {
        //   timezone: 'UTC',
        // },
      });
      await dataSource.initialize();
      return dataSource;
    },
  },
];
