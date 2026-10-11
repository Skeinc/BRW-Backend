import { Body, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Page } from '../../../common/lib/pagination.types.js';
import { AdminController } from '../../admin-auth/decorators/admin-controller.decorator.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { ListProductsQueryDto } from '../dto/list-products-query.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductsService } from '../products.service.js';
import type { AdminProduct, AdminProductListItem } from '../products.types.js';

@ApiTags('admin-products')
@AdminController('products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products, including unpublished. Filter by category, collection and text' })
  @ApiOkResponse({ description: '{ items, page, pageSize, total }, newest first' })
  findPage(@Query() query: ListProductsQueryDto): Promise<Page<AdminProductListItem>> {
    return this.productsService.findPage(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one product with its photos' })
  @ApiOkResponse({ description: 'The product' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminProduct> {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product. It is unpublished until isPublished is true' })
  @ApiCreatedResponse({ description: 'The created product' })
  @ApiNotFoundResponse({ description: 'CATEGORY_NOT_FOUND or COLLECTION_NOT_FOUND' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN or SKU_TAKEN' })
  create(@Body() dto: CreateProductDto): Promise<AdminProduct> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product. Changing the slug keeps the old one as a redirect' })
  @ApiOkResponse({ description: 'The updated product' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND, CATEGORY_NOT_FOUND or COLLECTION_NOT_FOUND' })
  @ApiConflictResponse({ description: 'SLUG_TAKEN or SKU_TAKEN' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto): Promise<AdminProduct> {
    return this.productsService.update({ id, dto });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product and its photos' })
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  @ApiConflictResponse({ description: 'PRODUCT_HAS_ORDERS' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
