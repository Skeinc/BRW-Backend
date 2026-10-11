import { Body, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Page } from '../../../common/lib/pagination.types.js';
import { AdminController } from '../../admin-auth/decorators/admin-controller.decorator.js';
import { ListOrdersQueryDto } from '../dto/list-orders-query.dto.js';
import { UpdateOrderDto } from '../dto/update-order.dto.js';
import { OrdersService } from '../orders.service.js';
import type { AdminOrder, OrderRecord } from '../orders.types.js';

@ApiTags('admin-orders')
@AdminController('orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List order requests, newest first. Filter by status' })
  @ApiOkResponse({ description: '{ items, page, pageSize, total }' })
  findPage(@Query() query: ListOrdersQueryDto): Promise<Page<OrderRecord>> {
    return this.ordersService.findPage(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one order request with its lines' })
  @ApiOkResponse({ description: 'The order request' })
  @ApiNotFoundResponse({ description: 'ORDER_NOT_FOUND' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminOrder> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change the status of an order request' })
  @ApiOkResponse({ description: 'The updated order request' })
  @ApiNotFoundResponse({ description: 'ORDER_NOT_FOUND' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto): Promise<AdminOrder> {
    return this.ordersService.updateStatus({ id, dto });
  }
}
