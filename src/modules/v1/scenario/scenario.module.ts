import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ScenarioFrontendService } from './scenario.frontend.service';
import { UsersModule } from '../users/users.module';
import { RequestModule } from '../requests/requests.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ScenarioDashboardService } from './scenario.dashboard.service';
import { ScenarioNotificationService } from './scenario.notification.service';
import { WorkersExcelService } from '../../../utils/workers.excel';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    RequestModule,
    AttendanceModule,
  ],
  controllers: [],
  providers: [
    ScenarioFrontendService,
    ScenarioDashboardService,
    ScenarioNotificationService,
    WorkersExcelService,
  ],
})
export class ScenarioModule {}
