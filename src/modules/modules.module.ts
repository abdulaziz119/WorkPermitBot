import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RequestModule } from './v1/requests/requests.module';
import { ScenarioModule } from './v1/scenario/scenario.module';
import { AttendanceModule } from './v1/attendance/attendance.module';
import { UsersModule } from './v1/users/users.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    RequestModule,
    ScenarioModule,
    AttendanceModule,
  ],
})
export class ModulesModule {}
