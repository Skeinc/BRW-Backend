import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../../database/drizzle.types.js';
import { productImage } from '../../../database/schema/product-image.js';
import type { ProductImageRecord } from '../products.types.js';
import type { NewProductImage } from './product-images.types.js';

@Injectable()
export class ProductImagesRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  /**
   * Images of a product in display order; the first one is the cover.
   */
  async findByProduct(productId: string): Promise<ProductImageRecord[]> {
    return this.database
      .select()
      .from(productImage)
      .where(eq(productImage.productId, productId))
      .orderBy(asc(productImage.sortOrder), asc(productImage.id));
  }

  async findOne({
    productId,
    imageId,
  }: {
    productId: string;
    imageId: string;
  }): Promise<ProductImageRecord | undefined> {
    const [row] = await this.database
      .select()
      .from(productImage)
      .where(and(eq(productImage.productId, productId), eq(productImage.id, imageId)));
    return row;
  }

  /**
   * Adds an image at the end of the product's gallery.
   */
  async createLast(values: NewProductImage): Promise<ProductImageRecord> {
    const [row] = await this.database
      .insert(productImage)
      .values({
        ...values,
        sortOrder: sql`(select coalesce(max(${productImage.sortOrder}), -1) + 1 from ${productImage} where ${productImage.productId} = ${values.productId})`,
      })
      .returning();
    return row;
  }

  async delete(imageId: string): Promise<void> {
    await this.database.delete(productImage).where(eq(productImage.id, imageId));
  }

  /**
   * Writes sort_order = position for the given ids in one transaction.
   */
  async saveOrder({ productId, imageIds }: { productId: string; imageIds: string[] }): Promise<void> {
    await this.database.transaction(async (tx) => {
      await Promise.all(
        imageIds.map((imageId, position) =>
          tx
            .update(productImage)
            .set({ sortOrder: position })
            .where(and(eq(productImage.productId, productId), eq(productImage.id, imageId))),
        ),
      );
    });
  }
}
