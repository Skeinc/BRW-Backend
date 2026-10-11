import { Body, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminController } from '../../admin-auth/decorators/admin-controller.decorator.js';
import { CollectionsService } from '../collections.service.js';
import type { AdminCollection } from '../collections.types.js';
import { CreateCollectionDto } from '../dto/create-collection.dto.js';
import { UpdateCollectionDto } from '../dto/update-collection.dto.js';

@ApiTags('admin-collections')
@AdminController('collections')
export class AdminCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all collections, including unpublished, with product count' })
  @ApiOkResponse({ description: 'Every collection' })
  findAll(): Promise<AdminCollection[]> {
    return this.collectionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one collection' })
  @ApiOkResponse({ description: 'The collection' })
  @ApiNotFoundResponse({ description: 'COLLECTION_NOT_FOUND' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminCollection> {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a collection. The slug is generated from the name when omitted' })
  @ApiCreatedResponse({ description: 'The created collection' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN' })
  create(@Body() dto: CreateCollectionDto): Promise<AdminCollection> {
    return this.collectionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection. Changing the slug keeps the old one as a redirect' })
  @ApiOkResponse({ description: 'The updated collection' })
  @ApiNotFoundResponse({ description: 'COLLECTION_NOT_FOUND' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectionDto): Promise<AdminCollection> {
    return this.collectionsService.update({ id, dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a collection that has no products' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'COLLECTION_NOT_FOUND' })
  @ApiConflictResponse({ description: 'COLLECTION_NOT_EMPTY' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.collectionsService.remove(id);
  }
}
