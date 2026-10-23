import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ORDER_THROTTLE_LIMIT, ORDER_THROTTLE_TTL_MS } from './constants/orders.constants.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';
import type { CreatedOrder } from './types/orders.types.js';

/** Public HTTP endpoint of order requests under `/api/orders`. */
@ApiTags('catalog')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Create an order request from the cart; prices and stock are checked on the server. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: ORDER_THROTTLE_LIMIT, ttl: ORDER_THROTTLE_TTL_MS } })
  @ApiOperation({ summary: 'Create an order request (10 per minute per IP); returns { number } like BRW-000123' })
  @ApiConflictResponse({ description: 'ORDER_ITEM_UNAVAILABLE: a product is unpublished or out of stock' })
  @ApiTooManyRequestsResponse({ description: 'TOO_MANY_REQUESTS' })
  create(@Body() dto: CreateOrderDto): Promise<CreatedOrder> {
    return this.ordersService.create(dto);
  }
}
