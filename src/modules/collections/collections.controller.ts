import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CollectionsService } from './collections.service.js';
import type { CollectionDetailView, CollectionView } from './types/collections.types.js';
import { CreateCollectionDto } from './dto/create-collection.dto.js';
import { UpdateCollectionDto } from './dto/update-collection.dto.js';

/** HTTP endpoints of collections under `/api/admin/collections` (admin cookie required). */
@ApiTags('admin-collections')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /** List all collections with productCount. */
  @Get()
  @ApiOperation({ summary: 'List all collections with productCount' })
  list(): Promise<CollectionView[]> {
    return this.collectionsService.list();
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

  /** Delete a collection without products (COLLECTION_NOT_EMPTY otherwise). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection without products (COLLECTION_NOT_EMPTY otherwise)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.collectionsService.remove(id);
  }
}
