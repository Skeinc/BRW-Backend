import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { pageContent } from '../../database/schema/page-content.js';
import { INSTALLMENT_PAGE_KEY } from './constants/installment-page.constants.js';
import type { InstallmentPageContent } from './types/installment-page.types.js';

/** Drizzle queries for the "Installment" row of `page_content`. */
@Injectable()
export class InstallmentPageRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** Saved content, or undefined until the first save. */
  async find(): Promise<InstallmentPageContent | undefined> {
    const [row] = await this.db
      .select({ content: pageContent.content })
      .from(pageContent)
      .where(eq(pageContent.key, INSTALLMENT_PAGE_KEY));
    return row?.content as InstallmentPageContent | undefined;
  }

  /** Inserts or replaces the content and returns it. */
  async upsert(content: InstallmentPageContent): Promise<InstallmentPageContent> {
    const [row] = await this.db
      .insert(pageContent)
      .values({ key: INSTALLMENT_PAGE_KEY, content })
      .onConflictDoUpdate({ target: pageContent.key, set: { content } })
      .returning({ content: pageContent.content });
    return row.content as InstallmentPageContent;
  }
}
