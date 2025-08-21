import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ScenarioFrontendService } from './scenario.frontend.service';
import { WorkersModule } from '../workers/workers.module';
import { ManagersModule } from '../managers/managers.module';
import { RequestModule } from '../requests/requests.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ScenarioDashboardService } from './scenario.dashboard.service';

@Module({
  imports: [
    DatabaseModule,
    WorkersModule,
    ManagersModule,
    RequestModule,
    AttendanceModule,
  ],
  controllers: [],
  providers: [ScenarioFrontendService, ScenarioDashboardService],
})
export class ScenarioModule {}
