import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/.+/;
const MIN_JWT_SECRET_LENGTH = 16;
const MAX_PORT = 65535;

function parseBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
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

  @IsUrl({ require_protocol: true, require_tld: false })
  S3_ENDPOINT: string;

  @IsString()
  @IsNotEmpty()
  S3_REGION: string;

  @IsString()
  @IsNotEmpty()
  S3_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY: string;

  /** Browser-facing base URL of the bucket, for example http://localhost:9000/brw-media. */
  @IsUrl({ require_protocol: true, require_tld: false })
  S3_PUBLIC_URL: string;

  @Transform(parseBoolean)
  @IsBoolean()
  S3_FORCE_PATH_STYLE: boolean = true;

  @IsEmail()
  ADMIN_EMAIL: string;

  @Matches(BCRYPT_HASH_PATTERN, { message: 'ADMIN_PASSWORD_HASH must be a bcrypt hash' })
  ADMIN_PASSWORD_HASH: string;

  @IsString()
  @MinLength(MIN_JWT_SECRET_LENGTH)
  JWT_SECRET: string;

  @Transform(parseBoolean)
  @IsBoolean()
  COOKIE_SECURE: boolean = false;
}
