import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { article } from '../../database/schema/article.js';
import { category } from '../../database/schema/category.js';
import { collection } from '../../database/schema/collection.js';
import { mediaImage } from '../../database/schema/media-image.js';
import { product } from '../../database/schema/product.js';
import type {
  MediaEntityType,
  MediaImageRecord,
  MediaOwner,
  NewMediaImageValues,
  ReorderImagesInput,
} from './types/media.types.js';

const OWNER_TABLES = { product, category, collection, article } as const;

/** Drizzle queries for the `media_image` table. Every list query is served by the `(entity_type, entity_id, sort_order)` index. */
@Injectable()
export class MediaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Images of one owner, cover first. */
  async findByOwner({ entityType, entityId }: MediaOwner): Promise<MediaImageRecord[]> {
    return this.db
      .select()
      .from(mediaImage)
      .where(and(eq(mediaImage.entityType, entityType), eq(mediaImage.entityId, entityId)))
      .orderBy(asc(mediaImage.sortOrder));
  }

  /** The first image of each given owner in one query (one row per owner that has images). */
  async findCovers({
    entityType,
    entityIds,
  }: {
    entityType: MediaEntityType;
    entityIds: string[];
  }): Promise<MediaImageRecord[]> {
    if (entityIds.length === 0) {
      return [];
    }
    return this.db
      .selectDistinctOn([mediaImage.entityId])
      .from(mediaImage)
      .where(and(eq(mediaImage.entityType, entityType), inArray(mediaImage.entityId, entityIds)))
      .orderBy(asc(mediaImage.entityId), asc(mediaImage.sortOrder));
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<MediaImageRecord | undefined> {
    const [record] = await this.db.select().from(mediaImage).where(eq(mediaImage.id, id));
    return record;
  }

  /**
   * Appends an image after the owner's last one. The inserts of one owner are serialised with a transaction-level
   * advisory lock, so parallel uploads get distinct sort orders and the cover stays well defined.
   */
  async insertLast({ entityType, entityId, key, alt, width, height }: NewMediaImageValues): Promise<MediaImageRecord> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`media:${entityType}:${entityId}`}, 0))`);
      const [last] = await tx
        .select({ highest: max(mediaImage.sortOrder) })
        .from(mediaImage)
        .where(and(eq(mediaImage.entityType, entityType), eq(mediaImage.entityId, entityId)));
      const sortOrder: number = last.highest === null ? 0 : last.highest + 1;
      const [record] = await tx
        .insert(mediaImage)
        .values({ entityType, entityId, key, alt, width, height, sortOrder })
        .returning();
      return record;
    });
  }

  /** Sets the alt text of an image and returns it. */
  async updateAlt({ id, alt }: { id: string; alt: string | null }): Promise<MediaImageRecord> {
    const [record] = await this.db.update(mediaImage).set({ alt }).where(eq(mediaImage.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(mediaImage).where(eq(mediaImage.id, id));
  }

  /** Deletes every image of an owner and returns the storage keys to remove. */
  async deleteByOwner({ entityType, entityId }: MediaOwner): Promise<string[]> {
    const rows = await this.db
      .delete(mediaImage)
      .where(and(eq(mediaImage.entityType, entityType), eq(mediaImage.entityId, entityId)))
      .returning({ key: mediaImage.key });
    return rows.map((row) => row.key);
  }

  /** Rewrites the sort order of an owner's images in one statement: the n-th id gets n. */
  async saveOrder({ entityType, entityId, imageIds }: ReorderImagesInput): Promise<void> {
    const idList = sql.join(
      imageIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    await this.db.execute(sql`
      UPDATE ${mediaImage} SET sort_order = ordered.position - 1
      FROM unnest(ARRAY[${idList}]) WITH ORDINALITY AS ordered(id, position)
      WHERE ${mediaImage.id} = ordered.id
        AND ${mediaImage.entityType} = ${entityType} AND ${mediaImage.entityId} = ${entityId}
    `);
  }

  /** True when the owner row exists in its own table. */
  async hasOwner({ entityType, entityId }: MediaOwner): Promise<boolean> {
    const table = OWNER_TABLES[entityType];
    const rows = await this.db.select({ id: table.id }).from(table).where(eq(table.id, entityId)).limit(1);
    return rows.length > 0;
  }
}
