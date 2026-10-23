import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { PaginatedResult } from '../../../common/lib/pagination.types.js';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto.js';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto.js';
import { OrdersService } from '../orders.service.js';
import type { OrderListItem, OrderView } from '../types/orders.types.js';

/** HTTP endpoints of orders under `/api/admin/orders` (admin cookie required). */
@ApiTags('admin-orders')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'UNAUTHORIZED: no valid admin cookie' })
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** List order requests, newest first (filter by status, search by number, name or phone). */
  @Get()
  @ApiOperation({
    summary: 'List order requests, newest first (filter by status, search by number, name or phone)',
  })
  list(@Query() query: ListOrdersQueryDto): Promise<PaginatedResult<OrderListItem>> {
    return this.ordersService.list(query);
  }

  /** Get one order request with its lines. */
  @Get(':id')
  @ApiOperation({ summary: 'Get one order request with its lines' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<OrderView> {
    return this.ordersService.get(id);
  }

  /** Change the status of an order request; only the allowed transitions are accepted. */
  @Patch(':id')
  @ApiOperation({
    summary: 'Change the status of an order request (ORDER_STATUS_INVALID for a transition that is not allowed)',
  })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto): Promise<OrderView> {
    return this.ordersService.updateStatus({ id, status: dto.status });
  }
}
