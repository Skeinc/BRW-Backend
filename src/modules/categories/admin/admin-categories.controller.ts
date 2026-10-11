import { Body, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AdminController } from '../../admin-auth/decorators/admin-controller.decorator.js';
import { CategoriesService } from '../categories.service.js';
import type { AdminCategory } from '../categories.types.js';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { UpdateCategoryDto } from '../dto/update-category.dto.js';

@ApiTags('admin-categories')
@AdminController('categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (flat), including unpublished, with level and product count' })
  @ApiOkResponse({ description: 'Every category; build the tree from parentId' })
  findAll(): Promise<AdminCategory[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one category' })
  @ApiOkResponse({ description: 'The category' })
  @ApiNotFoundResponse({ description: 'CATEGORY_NOT_FOUND' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminCategory> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category (up to 3 levels). The slug is generated from the name when omitted' })
  @ApiCreatedResponse({ description: 'The created category' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN' })
  @ApiUnprocessableEntityResponse({ description: 'CATEGORY_DEPTH_EXCEEDED' })
  create(@Body() dto: CreateCategoryDto): Promise<AdminCategory> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category. Changing the slug keeps the old one as a redirect' })
  @ApiOkResponse({ description: 'The updated category' })
  @ApiNotFoundResponse({ description: 'CATEGORY_NOT_FOUND' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN' })
  @ApiUnprocessableEntityResponse({ description: 'CATEGORY_DEPTH_EXCEEDED or CATEGORY_CYCLE' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto): Promise<AdminCategory> {
    return this.categoriesService.update({ id, dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category that has no subcategories and no products' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'CATEGORY_NOT_FOUND' })
  @ApiConflictResponse({ description: 'CATEGORY_NOT_EMPTY' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
