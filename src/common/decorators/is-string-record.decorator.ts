import { registerDecorator, type ValidationOptions } from 'class-validator';

const MAX_RECORD_ENTRIES = 50;
const MAX_TEXT_LENGTH = 500;

function isStringRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const entries: [string, unknown][] = Object.entries(value);
  return (
    entries.length <= MAX_RECORD_ENTRIES &&
    entries.every(
      ([key, text]) =>
        key.length > 0 && key.length <= MAX_TEXT_LENGTH && typeof text === 'string' && text.length <= MAX_TEXT_LENGTH,
    )
  );
}

/**
 * Validates a flat `{ "key": "text" }` object with a bounded size.
 */
export function IsStringRecord(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isStringRecord',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: `${String(propertyName)} must be an object of short text values`, ...options },
      validator: { validate: isStringRecord },
    });
  };
}
