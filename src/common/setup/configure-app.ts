import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

const NANOSECONDS_PER_MILLISECOND = 1e6;
const HEALTH_PATH = '/api/health';
const requestLogger = new Logger('HTTP');

/** Logs one line per finished request: method, path (no query string, it may carry personal data), status and duration. */
function logRequests(req: Request, res: Response, next: NextFunction): void {
  if (req.path === HEALTH_PATH) {
    next();
    return;
  }
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / NANOSECONDS_PER_MILLISECOND;
    requestLogger.log(`${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });
  next();
}

/**
 * Applies the HTTP settings shared by the real server and the e2e tests:
 * helmet, compression, request logging, the `/api` prefix, `a[]=1&a[]=2` query arrays and strict global request validation.
 */
export function configureApp(app: NestExpressApplication): void {
  app.use(logRequests);
  // /media is loaded cross-origin by the storefront, so the default same-origin resource policy would block it.
  // The API serves JSON, so CSP adds nothing; its defaults would also break the Swagger page.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(compression());
  app.setGlobalPrefix('api');
  app.set('query parser', 'extended');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
