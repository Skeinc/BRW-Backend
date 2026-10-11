import { validateEnv } from './validate-env.js';

const VALID_ENV: Record<string, string> = {
  PORT: '3000',
  DATABASE_URL: 'postgresql://brw:brw@localhost:5434/brw',
  CORS_ORIGIN: 'http://localhost:8080',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'brw-media',
  S3_ACCESS_KEY: 'access-key',
  S3_SECRET_KEY: 'secret-key',
  S3_PUBLIC_URL: 'http://localhost:9000/brw-media',
  S3_FORCE_PATH_STYLE: 'true',
  ADMIN_EMAIL: 'admin@brw.local',
  ADMIN_PASSWORD_HASH: `$2b$10$${'A'.repeat(53)}`,
  JWT_SECRET: 'a-long-enough-secret-value',
  COOKIE_SECURE: 'false',
};

function withoutKeys(keys: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(VALID_ENV).filter(([key]) => !keys.includes(key)));
}

function getErrorMessage(env: Record<string, unknown>): string {
  try {
    validateEnv(env);
    return '';
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

describe('validateEnv', () => {
  it('returns typed values for a valid environment', () => {
    const env = validateEnv({ ...VALID_ENV, S3_FORCE_PATH_STYLE: 'false', COOKIE_SECURE: 'true' });
    expect(env.PORT).toBe(3000);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('applies defaults for optional variables', () => {
    const env = validateEnv(withoutKeys(['PORT', 'S3_FORCE_PATH_STYLE', 'COOKIE_SECURE']));
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('fails when a required variable is missing', () => {
    expect(getErrorMessage(withoutKeys(['DATABASE_URL']))).toContain('DATABASE_URL');
  });

  it('names every invalid variable and never echoes secret values', () => {
    const message = getErrorMessage({ ...VALID_ENV, JWT_SECRET: 'tiny-secret', PORT: 'abc' });
    expect(message).toContain('JWT_SECRET');
    expect(message).toContain('PORT');
    expect(message).not.toContain('tiny-secret');
  });
});
