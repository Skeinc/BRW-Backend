import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { ListPublicArticlesQueryDto } from './dto/list-public-articles-query.dto.js';
import { ArticlesService } from './articles.service.js';
import type { PublicArticleDetail, PublicArticleListItem } from './types/articles.types.js';

/** Public HTTP endpoints of articles under `/api/articles`. */
@ApiTags('catalog')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /** Published articles, newest first, without the body text. */
  @Get()
  @ApiOperation({ summary: 'Published articles, newest first, without the body text' })
  list(@Query() query: ListPublicArticlesQueryDto): Promise<PaginatedResult<PublicArticleListItem>> {
    return this.articlesService.listPublic(query);
  }

  /** One published article with its body text. */
  @Get(':id')
  @ApiOperation({ summary: 'Published article with body text and photos (ARTICLE_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicArticleDetail> {
    return this.articlesService.getPublic(id);
  }
}
