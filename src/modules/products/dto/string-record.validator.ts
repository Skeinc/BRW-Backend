import { registerDecorator, type ValidationOptions } from 'class-validator';

function isStringRecord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === 'string');
}

/**
 * The value must be a plain object whose values are all strings, for example `{ "Материал": "ЛДСП" }`.
 */
export function IsStringRecord(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'isStringRecord',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: `${String(propertyName)} must be an object with string values`, ...options },
      validator: { validate: isStringRecord },
    });
  };
}
