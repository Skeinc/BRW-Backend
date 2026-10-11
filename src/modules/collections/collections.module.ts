import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module.js';
import { SeoModule } from '../seo/seo.module.js';
import { AdminCollectionsController } from './admin/admin-collections.controller.js';
import { CollectionsRepository } from './collections.repository.js';
import { CollectionsService } from './collections.service.js';

@Module({
  imports: [AdminAuthModule, SeoModule],
  controllers: [AdminCollectionsController],
  providers: [CollectionsRepository, CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
