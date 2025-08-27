import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { usersProviders } from './users.providers';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  providers: [...usersProviders, UsersService],
  exports: [UsersService, ...usersProviders],
})
export class UsersModule {}
