import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { AttendanceEntity } from '../../../entity/attendance.entity';

export const attendanceProviders = [
  {
    provide: MODELS.ATTENDANCE_MODEL,
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(AttendanceEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
