import { Module } from '@nestjs/common';
import { AdminArticleImagesController } from './admin/admin-article-images.controller.js';
import { AdminCategoryImagesController } from './admin/admin-category-images.controller.js';
import { AdminCollectionImagesController } from './admin/admin-collection-images.controller.js';
import { AdminNewsImagesController } from './admin/admin-news-images.controller.js';
import { MediaController } from './media.controller.js';
import { AdminProductImagesController } from './admin/admin-product-images.controller.js';
import { MediaRepository } from './media.repository.js';
import { MediaService } from './media.service.js';

/** Wires the media feature. */
@Module({
  controllers: [
    MediaController,
    AdminProductImagesController,
    AdminCategoryImagesController,
    AdminCollectionImagesController,
    AdminArticleImagesController,
    AdminNewsImagesController,
  ],
  providers: [MediaRepository, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
