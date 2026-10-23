import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResolveSlugQueryDto } from './dto/resolve-slug-query.dto.js';
import { SeoService } from './seo.service.js';
import type { ResolvedSlug, SeoUrls } from './types/seo.types.js';

/** Public HTTP endpoints for the sitemap and slug redirects under `/api/seo`. */
@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /** Published categories, collections and products with slug and updatedAt. */
  @Get('urls')
  @ApiOperation({ summary: 'Slug and updatedAt of published categories, collections and products (sitemap)' })
  listUrls(): Promise<SeoUrls> {
    return this.seoService.listUrls();
  }

  /** The current slug of an entity that was requested by an old one. */
  @Get('resolve')
  @ApiOperation({ summary: 'New location of a renamed slug for a 301 (REDIRECT_NOT_FOUND)' })
  resolve(@Query() query: ResolveSlugQueryDto): Promise<ResolvedSlug> {
    return this.seoService.resolve(query);
  }
}
