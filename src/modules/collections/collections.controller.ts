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
import { CollectionsService } from './collections.service.js';
import { MoveItemDto } from '../../common/dto/move-item.dto.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import type { CollectionDetailView, CollectionOption, CollectionView } from './types/collections.types.js';
import { ListCollectionsQueryDto } from './dto/list-collections-query.dto.js';
import { CreateCollectionDto } from './dto/create-collection.dto.js';
import { UpdateCollectionDto } from './dto/update-collection.dto.js';

/** HTTP endpoints of collections under `/api/admin/collections` (admin cookie required). */
@ApiTags('admin-collections')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /** One page of collections with productCount, filtered by name, publication state and contents. */
  @Get()
  @ApiOperation({ summary: 'One page of collections with productCount, with search by name and filters' })
  list(@Query() query: ListCollectionsQueryDto): Promise<PaginatedResult<CollectionView>> {
    return this.collectionsService.list(query);
  }

  /** Every collection as id and name, for pickers. Declared before `:id`. */
  @Get('options')
  @ApiOperation({ summary: 'All collections as id and name in sort order, not paged' })
  listOptions(): Promise<CollectionOption[]> {
    return this.collectionsService.listOptions();
  }

  /** Get one collection. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one collection' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CollectionDetailView> {
    return this.collectionsService.get(id);
  }

  /** Create a collection (SLUG_TAKEN on a duplicate slug). */
  @Post()
  @ApiOperation({ summary: 'Create a collection (SLUG_TAKEN on a duplicate slug)' })
  create(@Body() dto: CreateCollectionDto): Promise<CollectionDetailView> {
    return this.collectionsService.create(dto);
  }

  /** Update a collection; a changed slug is kept as a redirect. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection; a changed slug is kept as a redirect' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto): Promise<CollectionDetailView> {
    return this.collectionsService.update(id, dto);
  }

  /** Move a collection to the position of another one (changes the sort order of those in between). */
  @Patch(':id/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Put a collection where another one is now' })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveItemDto): Promise<void> {
    return this.collectionsService.move({ id, overId: dto.overId });
  }

  /** Delete a collection without products (COLLECTION_NOT_EMPTY otherwise). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection without products (COLLECTION_NOT_EMPTY otherwise)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.collectionsService.remove(id);
  }
}
