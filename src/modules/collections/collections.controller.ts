import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service.js';
import type { PublicCollectionDetail, PublicCollectionItem } from './types/collections.types.js';

/** Public HTTP endpoints of collections under `/api/collections`. */
@ApiTags('catalog')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /** Published collections with productCount. */
  @Get()
  @ApiOperation({ summary: 'Published collections with productCount and imageUrl' })
  list(): Promise<PublicCollectionItem[]> {
    return this.collectionsService.listPublic();
  }

  /** One published collection with breadcrumbs. */
  @Get(':id')
  @ApiOperation({ summary: 'Published collection with breadcrumbs (COLLECTION_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicCollectionDetail> {
    return this.collectionsService.getPublic(id);
  }
}
