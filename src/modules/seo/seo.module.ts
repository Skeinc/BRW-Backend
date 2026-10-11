import { Module } from '@nestjs/common';
import { SlugRedirectRepository } from './slug-redirect.repository.js';
import { SlugRedirectService } from './slug-redirect.service.js';

@Module({
  providers: [SlugRedirectRepository, SlugRedirectService],
  exports: [SlugRedirectService],
})
export class SeoModule {}
