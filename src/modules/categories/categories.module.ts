import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { AdminCategoriesController } from './admin/admin-categories.controller.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';

/** Wires the categories feature. */
@Module({
  imports: [MediaModule, SlugRedirectsModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesRepository, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
