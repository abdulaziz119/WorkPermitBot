import { DataSource } from 'typeorm';
import {
  MODELS,
  WORK_PERMIT_BOT_DATA_SOURCE,
} from '../../../constants/constants';
import { OtpEntity } from '../../../entity/otp.entity';

export const otpProviders = [
  {
    provide: MODELS.OTP_MODEL,
    useFactory: (dataSource: DataSource) => dataSource.getRepository(OtpEntity),
    inject: [WORK_PERMIT_BOT_DATA_SOURCE],
  },
];
