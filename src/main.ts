import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppFrontendModule } from './app.module';
import { PORT } from './utils/env/env';

async function bootstrap() {
  const app = await NestFactory.create(AppFrontendModule);
  app.setGlobalPrefix('api');
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(PORT);
}

void bootstrap();
