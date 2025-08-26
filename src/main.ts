// import { NestFactory } from '@nestjs/core';
// import * as bodyParser from 'body-parser';
// import { ValidationPipe } from '@nestjs/common';
// import { AppFrontendModule } from './app.module';
// import { PORT } from './utils/env/env';
//
// async function bootstrap() {
//   const app = await NestFactory.create(AppFrontendModule);
//
//   app.setGlobalPrefix('api');
//
//   app.use(bodyParser.json({ limit: '100mb' }));
//   app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
//   app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
//
//   await app.listen(PORT);
// }
//
// bootstrap().then(() => 'connected');

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PORT } from './utils/env/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: '*',
    allowedHeaders: '*',
  });

  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  app.disable('etag');
  app.disable('x-powered-by');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const options = new DocumentBuilder()
    .setTitle('Telegram Bot API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/v1/swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  await app.listen(PORT);
}

bootstrap().then(() => console.log(`http://0.0.0.0:${PORT}/api/v1/swagger`));
