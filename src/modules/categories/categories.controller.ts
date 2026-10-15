import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import type { CategoryDetailView, CategoryView } from './types/categories.types.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/** HTTP endpoints of categories under `/api/admin/categories` (admin cookie required). */
@ApiTags('admin-categories')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** List all categories as a flat tree (parents first) with depth and productCount. */
  @Get()
  @ApiOperation({ summary: 'List all categories as a flat tree (parents first) with depth and productCount' })
  list(): Promise<CategoryView[]> {
    return this.categoriesService.list();
  }

  /** Get one category. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one category' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDetailView> {
    return this.categoriesService.get(id);
  }

  /** Create a category (max 3 levels; CATEGORY_DEPTH_EXCEEDED, SLUG_TAKEN). */
  @Post()
  @ApiOperation({ summary: 'Create a category (max 3 levels; CATEGORY_DEPTH_EXCEEDED, SLUG_TAKEN)' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDetailView> {
    return this.categoriesService.create(dto);
  }

  /** Update a category; a changed slug is kept as a redirect. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a category; a changed slug is kept as a redirect' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryDetailView> {
    return this.categoriesService.update(id, dto);
  }

  /** Delete an empty category (CATEGORY_NOT_EMPTY when it has children or products). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty category (CATEGORY_NOT_EMPTY when it has children or products)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
