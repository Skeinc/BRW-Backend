import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import { ListPublicProductsQueryDto } from './dto/list-public-products-query.dto.js';
import { PublicProductFiltersDto } from './dto/public-product-filters.dto.js';
import { ProductsService } from './products.service.js';
import type { ProductFacets, PublicProductDetail, PublicProductListItem } from './types/products.types.js';

/** Public HTTP endpoints of products under `/api/products`. */
@ApiTags('catalog')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /** Published products with filters, sorting and paging. */
  @Get()
  @ApiOperation({ summary: 'Published products: filters, sort (price_asc, price_desc, new, popular), paging up to 48' })
  list(@Query() query: ListPublicProductsQueryDto): Promise<PaginatedResult<PublicProductListItem>> {
    return this.productsService.listPublic(query);
  }

  /** Available filter values for the current selection. Declared before `:id`. */
  @Get('facets')
  @ApiOperation({ summary: 'Available filter values with counts for the current selection' })
  facets(@Query() query: PublicProductFiltersDto): Promise<ProductFacets> {
    return this.productsService.getFacets(query);
  }

  /** One published product with photos, category and breadcrumbs. */
  @Get(':id')
  @ApiOperation({ summary: 'Published product with images, category and breadcrumbs (PRODUCT_NOT_FOUND)' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PublicProductDetail> {
    return this.productsService.getPublic(id);
  }
}
