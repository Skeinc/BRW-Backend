import { Module } from '@nestjs/common';
import { SlugRedirectsRepository } from './slug-redirects.repository.js';
import { SlugRedirectsService } from './slug-redirects.service.js';

/** Wires the slug redirects feature. */
@Module({
  providers: [SlugRedirectsRepository, SlugRedirectsService],
  exports: [SlugRedirectsService],
})
export class SlugRedirectsModule {}
