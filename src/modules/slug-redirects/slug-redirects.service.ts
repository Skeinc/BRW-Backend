import { Injectable } from '@nestjs/common';
import { SlugRedirectsRepository } from './slug-redirects.repository.js';
import type {
  RecordSlugChangeInput,
  ReleaseSlugInput,
  RemoveSlugRedirectsInput,
} from './types/slug-redirects.types.js';

/**
 * Keeps old links alive: a renamed slug is remembered and resolved to its current slug by `GET /api/seo/resolve`.
 */
@Injectable()
export class SlugRedirectsService {
  constructor(private readonly slugRedirectsRepository: SlugRedirectsRepository) {}

  /** Remembers the old slug of a renamed entity. */
  async recordChange(input: RecordSlugChangeInput): Promise<void> {
    await this.slugRedirectsRepository.upsert(input);
  }

  /** Forgets a redirect when its slug becomes a live slug again. */
  async release(input: ReleaseSlugInput): Promise<void> {
    await this.slugRedirectsRepository.deleteByOldSlug(input);
  }

  /** Drops all redirects of a deleted entity. */
  async removeForTarget(input: RemoveSlugRedirectsInput): Promise<void> {
    await this.slugRedirectsRepository.deleteByTarget(input);
  }
}
