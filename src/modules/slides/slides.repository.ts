import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, max } from 'drizzle-orm';
import type { SortOrderChange } from '../../common/lib/reorder-items.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { slide } from '../../database/schema/slide.js';
import type { NewSlideValues, SlidePatch, SlideRecord } from './types/slides.types.js';

/** Drizzle queries for the `slide` table. */
@Injectable()
export class SlidesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** All slides by sort order, then by creation time. */
  async findAll(): Promise<SlideRecord[]> {
    return this.db.select().from(slide).orderBy(asc(slide.sortOrder), asc(slide.createdAt));
  }

  /** Sort order that puts a slide after the existing ones. */
  async nextSortOrder(): Promise<number> {
    const [row] = await this.db.select({ last: max(slide.sortOrder) }).from(slide);
    return (row.last ?? -1) + 1;
  }

  /** Saves new sort orders in one transaction. */
  async applySortOrders(changes: SortOrderChange[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const change of changes) {
        await tx.update(slide).set({ sortOrder: change.sortOrder }).where(eq(slide.id, change.id));
      }
    });
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<SlideRecord | undefined> {
    const [record] = await this.db.select().from(slide).where(eq(slide.id, id));
    return record;
  }

  /** Inserts a row and returns it. */
  async insert(values: NewSlideValues): Promise<SlideRecord> {
    const [record] = await this.db.insert(slide).values(values).returning();
    return record;
  }

  /** Updates a row by id and returns it. */
  async update({ id, patch }: { id: string; patch: SlidePatch }): Promise<SlideRecord> {
    const [record] = await this.db.update(slide).set(patch).where(eq(slide.id, id)).returning();
    return record;
  }

  /** Deletes a row by id. */
  async delete(id: string): Promise<void> {
    await this.db.delete(slide).where(eq(slide.id, id));
  }
}
