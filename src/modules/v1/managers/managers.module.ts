import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { managersProviders } from './managers.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...managersProviders],
})
export class ManagersModule {}
