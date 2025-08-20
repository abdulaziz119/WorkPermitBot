import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { attendanceProviders } from './attendance.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...attendanceProviders],
})
export class AttendanceModule {}
