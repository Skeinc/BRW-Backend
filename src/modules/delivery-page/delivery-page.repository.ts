import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { pageContent } from '../../database/schema/page-content.js';
import { DELIVERY_PAGE_KEY } from './constants/delivery-page.constants.js';
import type { DeliveryPageContent } from './types/delivery-page.types.js';

/** Drizzle queries for the "Delivery and payment" row of `page_content`. */
@Injectable()
export class DeliveryPageRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Saved content, or undefined until the first save. */
  async find(): Promise<DeliveryPageContent | undefined> {
    const [row] = await this.db
      .select({ content: pageContent.content })
      .from(pageContent)
      .where(eq(pageContent.key, DELIVERY_PAGE_KEY));
    return row?.content as DeliveryPageContent | undefined;
  }

  /** Inserts or replaces the content and returns it. */
  async upsert(content: DeliveryPageContent): Promise<DeliveryPageContent> {
    const [row] = await this.db
      .insert(pageContent)
      .values({ key: DELIVERY_PAGE_KEY, content })
      .onConflictDoUpdate({ target: pageContent.key, set: { content } })
      .returning({ content: pageContent.content });
    return row.content as DeliveryPageContent;
  }
}
