import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { ListPublicNewsQueryDto } from './dto/list-public-news-query.dto.js';
import { NewsService } from './news.service.js';
import type { PublicNewsDetail, PublicNewsListItem } from './types/news.types.js';

/** Public HTTP endpoints of news under `/api/news`. */
@ApiTags('catalog')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  /** Published news, newest first, without the body text; filter isPromo. */
  @Get()
  @ApiOperation({ summary: 'Published news, newest first, without the body text; filter isPromo' })
  list(@Query() query: ListPublicNewsQueryDto): Promise<PaginatedResult<PublicNewsListItem>> {
    return this.newsService.listPublic(query);
  }

  /** One published news item with its body text. */
  @Get(':id')
  @ApiOperation({ summary: 'Published news item with body text and photos (NEWS_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicNewsDetail> {
    return this.newsService.getPublic(id);
  }
}
