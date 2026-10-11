import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { CollectionsModule } from '../collections/collections.module.js';
import { SeoModule } from '../seo/seo.module.js';
import { AdminProductsController } from './admin/admin-products.controller.js';
import { ProductImagesController } from './images/product-images.controller.js';
import { ProductImagesRepository } from './images/product-images.repository.js';
import { ProductImagesService } from './images/product-images.service.js';
import { ProductsRepository } from './products.repository.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [AdminAuthModule, SeoModule, CategoriesModule, CollectionsModule],
  controllers: [AdminProductsController, ProductImagesController],
  providers: [ProductsRepository, ProductsService, ProductImagesRepository, ProductImagesService],
  exports: [ProductsService],
})
export class ProductsModule {}
