import path from 'node:path';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import packageJson from '../package.json' with { type: 'json' };
import { AppModule } from './app.module.js';
import { configureApp } from './common/setup/configure-app.js';
import type { EnvironmentVariables } from './config/environment-variables.js';

import { ADMIN_COOKIE_NAME } from './modules/admin-auth/admin-cookie-name.js';

const MEDIA_CACHE_MAX_AGE = '1y';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  configureApp(app);
  // Uploaded media. Keys are unique per upload, so files never change and can be cached forever.
  app.useStaticAssets(path.resolve(configService.getOrThrow('UPLOADS_DIR', { infer: true })), {
    prefix: '/media',
    index: false,
    dotfiles: 'deny',
    immutable: true,
    maxAge: MEDIA_CACHE_MAX_AGE,
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle(packageJson.name)
    .setDescription(packageJson.description)
    .setVersion(packageJson.version)
    .addCookieAuth(ADMIN_COOKIE_NAME)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
  });
  app.enableCors({
    origin: configService
      .getOrThrow('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  const port: number = configService.getOrThrow('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`API http://localhost:${port}/api`);
  logger.log(`Health http://localhost:${port}/api/health`);
  logger.log(`Swagger http://localhost:${port}/api/docs`);
  logger.log(`Media http://localhost:${port}/media`);
}

await bootstrap();
