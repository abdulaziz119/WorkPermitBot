import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WorkersModule } from './v1/workers/workers.module';
import { RequestModule } from './v1/requests/requests.module';
import { ScenarioModule } from './v1/scenario/scenario.module';

@Module({
  imports: [
    DatabaseModule,
    WorkersModule,
    RequestModule,
    ScenarioModule,
    WorkersModule,
  ],
})
export class ModulesModule {}
