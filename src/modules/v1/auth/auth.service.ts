import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { MODELS } from '../../../constants/constants';
import { WorkerEntity } from '../../../entity/workers.entity';
import { OtpEntity } from '../../../entity/otp.entity';
import { ManagerEntity } from '../../../entity/managers.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject(MODELS.WORKERS_MODEL)
    private readonly workerRepo: Repository<WorkerEntity>,
    @Inject(MODELS.MANAGER_MODEL)
    private readonly managerRepo: Repository<ManagerEntity>,
    @Inject(MODELS.OTP_MODEL)
    private readonly otpRepo: Repository<OtpEntity>,
  ) {}
}
