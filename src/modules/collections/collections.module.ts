import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { CollectionsController } from './collections.controller.js';
import { CollectionsRepository } from './collections.repository.js';
import { CollectionsService } from './collections.service.js';

/** Wires the collections feature. */
@Module({
  imports: [MediaModule, SlugRedirectsModule],
  controllers: [CollectionsController],
  providers: [CollectionsRepository, CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
