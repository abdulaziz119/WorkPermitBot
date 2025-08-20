import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { workersProviders } from './workers.providers';
import { WorkersService } from './workers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...workersProviders, WorkersService],
  exports: [WorkersService, ...workersProviders],
})
export class WorkersModule {}
