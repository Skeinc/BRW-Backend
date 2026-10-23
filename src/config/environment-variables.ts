import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/.+/;
const MIN_JWT_SECRET_LENGTH = 16;
const MIN_ADMIN_PASSWORD_LENGTH = 6;
const MAX_PORT = 65535;
const MAX_TRUSTED_PROXIES = 10;

function parseBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function emptyToUndefined({ value }: { value: unknown }): unknown {
  return value === '' ? undefined : value;
}

/**
 * Typed and validated process environment. A missing or malformed value stops the app at startup.
 */
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  PORT: number = 3000;

  @Matches(POSTGRES_URL_PATTERN, { message: 'DATABASE_URL must be a postgres:// or postgresql:// URL' })
  DATABASE_URL: string;

  /** One origin or a comma-separated list of origins. */
  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string;

  /** Directory for uploaded media; created on first write. Relative paths resolve from the working directory. */
  @IsString()
  @IsNotEmpty()
  UPLOADS_DIR: string = './uploads';

  /** Browser-facing base URL of /media, for example http://localhost:3000/media. */
  @IsUrl({ require_protocol: true, require_tld: false })
  PUBLIC_MEDIA_URL: string;

  @IsEmail()
  ADMIN_EMAIL: string;

  /** Admin password in plain text. When set, it is used for login and ADMIN_PASSWORD_HASH is ignored. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(MIN_ADMIN_PASSWORD_LENGTH)
  ADMIN_PASSWORD?: string;

  /** Optional bcrypt hash (`npm run admin:hash`), required only when ADMIN_PASSWORD is not set. */
  @Transform(emptyToUndefined)
  @ValidateIf((env: EnvironmentVariables) => env.ADMIN_PASSWORD === undefined)
  @Matches(BCRYPT_HASH_PATTERN, { message: 'Set ADMIN_PASSWORD or ADMIN_PASSWORD_HASH (a bcrypt hash)' })
  ADMIN_PASSWORD_HASH?: string;

  /** Signs the admin cookie. In production a known placeholder is rejected (see `validateEnv`). */
  @IsString()
  @MinLength(MIN_JWT_SECRET_LENGTH)
  JWT_SECRET: string;

  /** Number of reverse proxies in front of the API (nginx = 1). Needed so the login limit sees real client IPs. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_TRUSTED_PROXIES)
  TRUST_PROXY?: number;

  @Transform(parseBoolean)
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  /** Serves Swagger at `/api/docs`. Defaults to on outside production and off in production. */
  @IsOptional()
  @Transform(({ value }) => parseBoolean({ value: emptyToUndefined({ value }) }))
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;
}
