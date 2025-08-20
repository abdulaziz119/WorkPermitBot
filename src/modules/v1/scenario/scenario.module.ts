import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ScenarioService } from './scenario.service';
import { WorkersModule } from '../workers/workers.module';
import { ManagersModule } from '../managers/managers.module';
import { RequestModule } from '../requests/requests.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    DatabaseModule,
    WorkersModule,
    ManagersModule,
    RequestModule,
    AttendanceModule,
  ],
  controllers: [],
  providers: [ScenarioService],
})
export class ScenarioModule {}
