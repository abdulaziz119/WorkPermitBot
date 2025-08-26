import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AxiosService } from './axios.service';
import { DatabaseModule } from '../database/database.module';

const services = [AxiosService];

@Module({
  imports: [HttpModule, DatabaseModule],
  exports: services,
  providers: services,
})
export class AxiosModule {}
