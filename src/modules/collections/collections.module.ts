import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { AdminCollectionsController } from './admin/admin-collections.controller.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsRepository } from './collections.repository.js';
import { CollectionsService } from './collections.service.js';

/** Wires the collections feature. */
@Module({
  imports: [MediaModule, SlugRedirectsModule],
  controllers: [CollectionsController, AdminCollectionsController],
  providers: [CollectionsRepository, CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
