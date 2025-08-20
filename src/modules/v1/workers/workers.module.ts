import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { workersProviders } from './workers.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...workersProviders],
})
export class WorkersModule {}
