import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import type { ResolveSlugQueryDto } from './dto/resolve-slug-query.dto.js';
import { SeoRepository } from './seo.repository.js';
import type { ResolvedSlug, SeoUrl, SeoUrls } from './types/seo.types.js';

/** Data for the sitemap and for 301 redirects from renamed slugs. */
@Injectable()
export class SeoService {
  constructor(private readonly seoRepository: SeoRepository) {}

  /** Slug and `updatedAt` of every published category, collection, product, article and news item. */
  async listUrls(): Promise<SeoUrls> {
    const [categories, collections, products, articles, news]: SeoUrl[][] = await Promise.all([
      this.seoRepository.findPublishedUrls('category'),
      this.seoRepository.findPublishedUrls('collection'),
      this.seoRepository.findPublishedUrls('product'),
      this.seoRepository.findPublishedUrls('article'),
      this.seoRepository.findPublishedUrls('news'),
    ]);
    return { categories, collections, products, articles, news };
  }

  /** The new location of an old slug; fails with 404 REDIRECT_NOT_FOUND when the slug was never renamed. */
  async resolve({ type, slug }: ResolveSlugQueryDto): Promise<ResolvedSlug> {
    const resolved: ResolvedSlug | undefined = await this.seoRepository.findCurrentSlug({ type, slug });
    if (resolved === undefined) {
      throw new AppException(ErrorCode.REDIRECT_NOT_FOUND, HttpStatus.NOT_FOUND, 'No redirect for this slug');
    }
    return resolved;
  }
}
