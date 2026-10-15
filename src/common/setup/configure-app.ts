import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/**
 * Applies the HTTP settings shared by the real server and the e2e tests:
 * the `/api` prefix and strict global request validation.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
