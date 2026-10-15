import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { SlugRedirectsModule } from '../slug-redirects/slug-redirects.module.js';
import { ArticlesController } from './articles.controller.js';
import { ArticlesRepository } from './articles.repository.js';
import { ArticlesService } from './articles.service.js';

/** Wires the articles feature. */
@Module({
  imports: [MediaModule, SlugRedirectsModule],
  controllers: [ArticlesController],
  providers: [ArticlesRepository, ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
