import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { managersProviders } from './managers.providers';
import { ManagersService } from './managers.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...managersProviders, ManagersService],
  exports: [ManagersService, ...managersProviders],
})
export class ManagersModule {}
