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
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { CreateNewsDto } from '../dto/create-news.dto.js';
import { ListNewsQueryDto } from '../dto/list-news-query.dto.js';
import { UpdateNewsDto } from '../dto/update-news.dto.js';
import { NewsService } from '../news.service.js';
import type { NewsListItem, NewsView } from '../types/news.types.js';

/** HTTP endpoints of news under `/api/admin/news` (admin cookie required). */
@ApiTags('admin-news')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/news')
export class AdminNewsController {
  constructor(private readonly newsService: NewsService) {}

  /** List news (published and not), newest first; filters q, isPublished and isPromo. */
  @Get()
  @ApiOperation({ summary: 'List news (published and not), newest first; filters q, isPublished and isPromo' })
  list(@Query() query: ListNewsQueryDto): Promise<PaginatedResult<NewsListItem>> {
    return this.newsService.list(query);
  }

  /** Get one news item with its body text. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one news item with its body text' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<NewsView> {
    return this.newsService.get(id);
  }

  /** Create a news item; add images with POST /admin/news/{id}/images. */
  @Post()
  @ApiOperation({ summary: 'Create a news item; add images with POST /admin/news/{id}/images' })
  create(@Body() dto: CreateNewsDto): Promise<NewsView> {
    return this.newsService.create(dto);
  }

  /** Update a news item; a changed slug is kept as a redirect. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a news item; a changed slug is kept as a redirect' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNewsDto): Promise<NewsView> {
    return this.newsService.update(id, dto);
  }

  /** Delete a news item and its pictures. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a news item and its pictures' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.newsService.remove(id);
  }
}
