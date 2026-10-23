import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import type { PublicCategoryDetail, PublicCategoryNode } from './types/categories.types.js';

/** Public HTTP endpoints of categories under `/api/categories`. */
@ApiTags('catalog')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Published category tree up to 3 levels with productCount and imageUrl. */
  @Get()
  @ApiOperation({ summary: 'Published category tree (3 levels) with productCount and imageUrl' })
  list(): Promise<PublicCategoryNode[]> {
    return this.categoriesService.listPublic();
  }

  /** One published category with its subtree and breadcrumbs. */
  @Get(':id')
  @ApiOperation({ summary: 'Published category with children and breadcrumbs (CATEGORY_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicCategoryDetail> {
    return this.categoriesService.getPublic(id);
  }
}
