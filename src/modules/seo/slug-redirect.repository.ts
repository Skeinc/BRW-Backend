import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { slugRedirect } from '../../database/schema/slug-redirect.js';
import type { SlugEntity } from './seo.types.js';

@Injectable()
export class SlugRedirectRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  /**
   * Stores that `oldSlug` now belongs to `targetId`; an existing record for the same old slug is repointed.
   */
  async upsert({
    entity,
    oldSlug,
    targetId,
  }: {
    entity: SlugEntity;
    oldSlug: string;
    targetId: string;
  }): Promise<void> {
    await this.database
      .insert(slugRedirect)
      .values({ entity, oldSlug, targetId })
      .onConflictDoUpdate({ target: [slugRedirect.entity, slugRedirect.oldSlug], set: { targetId } });
  }

  async deleteBySlug({ entity, slug }: { entity: SlugEntity; slug: string }): Promise<void> {
    await this.database
      .delete(slugRedirect)
      .where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.oldSlug, slug)));
  }

  async deleteByTarget({ entity, targetId }: { entity: SlugEntity; targetId: string }): Promise<void> {
    await this.database
      .delete(slugRedirect)
      .where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.targetId, targetId)));
  }
}
