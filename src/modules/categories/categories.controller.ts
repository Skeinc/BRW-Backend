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
import { CategoriesService } from './categories.service.js';
import { MoveItemDto } from '../../common/dto/move-item.dto.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import type { CategoryDetailView, CategoryView } from './types/categories.types.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/** HTTP endpoints of categories under `/api/admin/categories` (admin cookie required). */
@ApiTags('admin-categories')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** One page of the flat tree (parents first), filtered by name, publication state and level. */
  @Get()
  @ApiOperation({
    summary: 'One page of categories as a flat tree (parents first), with search by name and filters',
  })
  list(@Query() query: ListCategoriesQueryDto): Promise<PaginatedResult<CategoryView>> {
    return this.categoriesService.list(query);
  }

  /** The whole tree as a flat list, for parent pickers. Declared before `:id`. */
  @Get('tree')
  @ApiOperation({ summary: 'All categories as a flat tree (parents first), not paged' })
  listTree(): Promise<CategoryView[]> {
    return this.categoriesService.listTree();
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

  /** Move a category to the position of a sibling (changes the sort order of the siblings). */
  @Patch(':id/move')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Put a category where a sibling is now; both must have the same parent' })
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveItemDto): Promise<void> {
    return this.categoriesService.move({ id, overId: dto.overId });
  }

  /** Delete an empty category (CATEGORY_NOT_EMPTY when it has children or products). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty category (CATEGORY_NOT_EMPTY when it has children or products)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
