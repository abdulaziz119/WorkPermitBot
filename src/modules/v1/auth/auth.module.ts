import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { otpProviders } from './otp.providers';
import { AuthController } from './auth.controller';
import { JWT_SECRET } from '../../../utils/env/env';
import { DatabaseModule } from '../../../database/database.module';
import { AuthService } from './auth.service';
import { managersProviders } from '../managers/managers.providers';
import { workersProviders } from '../workers/workers.providers';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: JWT_SECRET,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    ...managersProviders,
    ...workersProviders,
    ...otpProviders,
    JwtStrategy,
    AuthService,
  ],
  exports: [PassportModule, JwtStrategy, AuthService],
})
export class AuthModule {}
