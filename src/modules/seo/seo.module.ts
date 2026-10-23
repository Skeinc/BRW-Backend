import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller.js';
import { SeoRepository } from './seo.repository.js';
import { SeoService } from './seo.service.js';

/** Wires the SEO feature: sitemap data and slug redirects. */
@Module({
  controllers: [SeoController],
  providers: [SeoRepository, SeoService],
})
export class SeoModule {}
