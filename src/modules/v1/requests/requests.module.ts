import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { requestProviders } from './requests.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [...requestProviders],
})
export class RequestModule {}
