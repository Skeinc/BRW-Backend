import { Injectable } from '@nestjs/common';
import { SlugRedirectRepository } from './slug-redirect.repository.js';
import type { SlugChange, SlugEntity } from './seo.types.js';

/**
 * Keeps old slugs of renamed entities so the storefront can answer them with a 301.
 */
@Injectable()
export class SlugRedirectService {
  constructor(private readonly slugRedirectRepository: SlugRedirectRepository) {}

  /**
   * Records that an entity moved from `oldSlug` to `newSlug`. A redirect that pointed at `newSlug` is dropped
   * because the slug is live again.
   */
  async recordChange({ entity, oldSlug, newSlug, targetId }: SlugChange): Promise<void> {
    await this.slugRedirectRepository.deleteBySlug({ entity, slug: newSlug });
    await this.slugRedirectRepository.upsert({ entity, oldSlug, targetId });
  }

  /**
   * Removes every redirect of a deleted entity.
   */
  async removeForTarget({ entity, targetId }: { entity: SlugEntity; targetId: string }): Promise<void> {
    await this.slugRedirectRepository.deleteByTarget({ entity, targetId });
  }
}
