import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { AdminNewsController } from './admin/admin-news.controller.js';
import { NewsController } from './news.controller.js';
import { NewsRepository } from './news.repository.js';
import { NewsService } from './news.service.js';

/** Wires the news feature. */
@Module({
  imports: [MediaModule, SlugRedirectsModule],
  controllers: [NewsController, AdminNewsController],
  providers: [NewsRepository, NewsService],
  exports: [NewsService],
})
export class NewsModule {}
