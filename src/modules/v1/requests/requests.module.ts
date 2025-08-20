import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { requestProviders } from './requests.providers';
import { RequestsService } from './requests.service';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...requestProviders, RequestsService],
  exports: [RequestsService, ...requestProviders],
})
export class RequestModule {}
