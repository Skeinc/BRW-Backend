import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
import { ArticlesService } from './articles.service.js';
import type { ArticleListItem, ArticleView } from './types/articles.types.js';

/** HTTP endpoints of articles under `/api/admin/articles` (admin cookie required). */
@ApiTags('admin-articles')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  /** List articles (published and not), newest first; filters q and isPublished. */
  @Get()
  @ApiOperation({ summary: 'List articles (published and not), newest first; filters q and isPublished' })
  list(@Query() query: ListArticlesQueryDto): Promise<PaginatedResult<ArticleListItem>> {
    return this.articlesService.list(query);
  }

  /** Get one article with its body text. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one article with its body text' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ArticleView> {
    return this.articlesService.get(id);
  }

  /** Create a article; add images with POST /admin/articles/{id}/images. */
  @Post()
  @ApiOperation({ summary: 'Create a article; add images with POST /admin/articles/{id}/images' })
  create(@Body() dto: CreateArticleDto): Promise<ArticleView> {
    return this.articlesService.create(dto);
  }

  /** Update a article; a changed slug is kept as a redirect. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a article; a changed slug is kept as a redirect' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateArticleDto): Promise<ArticleView> {
    return this.articlesService.update(id, dto);
  }

  /** Delete a article and its picture. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a article and its picture' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.articlesService.remove(id);
  }
}
