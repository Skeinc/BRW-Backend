import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.js';
import { slugify } from './slugify.js';

type ResolveSlugCandidateInput = {
  name: string;
  slug?: string;
  maxLength: number;
};

/**
 * Returns the explicit slug when given, otherwise a slug built from the name (Cyrillic is transliterated).
 * Fails with VALIDATION_ERROR when the name has no letters or digits to build a slug from.
 */
export function resolveSlugCandidate({ name, slug, maxLength }: ResolveSlugCandidateInput): string {
  const candidate: string = slug ?? slugify(name, maxLength);
  if (candidate.length === 0) {
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      HttpStatus.BAD_REQUEST,
      'Cannot build a slug from the name; pass slug explicitly',
    );
  }
  return candidate;
}
