import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { MediaModule } from '../media/media.module.js';
import { CollectionsModule } from '../collections/collections.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsRepository } from './products.repository.js';
import { ProductsService } from './products.service.js';

/** Wires the products feature. */
@Module({
  imports: [CategoriesModule, CollectionsModule, MediaModule, SlugRedirectsModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
