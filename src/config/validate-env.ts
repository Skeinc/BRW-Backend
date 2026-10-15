import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import { EnvironmentVariables } from './environment-variables.js';
import { KNOWN_PLACEHOLDER_SECRETS } from './known-placeholder-secrets.js';

function formatErrors(errors: ValidationError[]): string {
  return errors.map((error) => `- ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`).join('\n');
}

/**
 * Validates raw environment variables and returns a typed copy.
 * Error messages name the variables but never echo their values (they may be secrets).
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated: EnvironmentVariables = plainToInstance(EnvironmentVariables, config, { exposeDefaultValues: true });
  const errors: ValidationError[] = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${formatErrors(errors)}`);
  }
  if (validated.NODE_ENV === 'production' && KNOWN_PLACEHOLDER_SECRETS.includes(validated.JWT_SECRET)) {
    throw new Error(
      'Invalid environment variables:\n- JWT_SECRET: must not be a placeholder from the repo, generate one (openssl rand -hex 32)',
    );
  }
  return validated;
}
