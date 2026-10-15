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
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductsService } from './products.service.js';
import type { ProductListItem, ProductView } from './types/products.types.js';

/** HTTP endpoints of products under `/api/admin/products` (admin cookie required). */
@ApiTags('admin-products')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** List products (published and not) with filters categoryId, collectionId, q, isPublished. */
  @Get()
  @ApiOperation({ summary: 'List products (published and not) with filters categoryId, collectionId, q, isPublished' })
  list(@Query() query: ListProductsQueryDto): Promise<PaginatedResult<ProductListItem>> {
    return this.productsService.list(query);
  }

  /** Get one product with its photos. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one product with its photos' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ProductView> {
    return this.productsService.get(id);
  }

  /** Create a product; add photos with POST /admin/products/{id}/images. */
  @Post()
  @ApiOperation({ summary: 'Create a product; add photos with POST /admin/products/{id}/images' })
  create(@Body() dto: CreateProductDto): Promise<ProductView> {
    return this.productsService.create(dto);
  }

  /** Update a product; a changed slug is kept as a redirect. */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product; a changed slug is kept as a redirect' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto): Promise<ProductView> {
    return this.productsService.update(id, dto);
  }

  /** Delete a product and its photo files (PRODUCT_HAS_ORDERS if an order references it). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product and its photo files (PRODUCT_HAS_ORDERS if an order references it)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
