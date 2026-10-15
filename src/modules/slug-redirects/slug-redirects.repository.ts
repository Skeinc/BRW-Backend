import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { slugRedirect } from '../../database/schema/slug-redirect.js';
import type {
  RecordSlugChangeInput,
  ReleaseSlugInput,
  RemoveSlugRedirectsInput,
} from './types/slug-redirects.types.js';

/** Drizzle queries for the `slug_redirect` table. */
@Injectable()
export class SlugRedirectsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Saves `oldSlug -> targetId`; an existing redirect for the same old slug is repointed. */
  async upsert({ entity, oldSlug, targetId }: RecordSlugChangeInput): Promise<void> {
    await this.db
      .insert(slugRedirect)
      .values({ entity, oldSlug, targetId })
      .onConflictDoUpdate({ target: [slugRedirect.entity, slugRedirect.oldSlug], set: { targetId } });
  }

  /** Deletes the redirect for one old slug. */
  async deleteByOldSlug({ entity, slug }: ReleaseSlugInput): Promise<void> {
    await this.db.delete(slugRedirect).where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.oldSlug, slug)));
  }

  /** Deletes every redirect that points to a removed entity. */
  async deleteByTarget({ entity, targetId }: RemoveSlugRedirectsInput): Promise<void> {
    await this.db.delete(slugRedirect).where(and(eq(slugRedirect.entity, entity), eq(slugRedirect.targetId, targetId)));
  }
}
