import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { attendanceProviders } from './attendance.providers';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...attendanceProviders, AttendanceService],
  exports: [AttendanceService, ...attendanceProviders],
})
export class AttendanceModule {}
