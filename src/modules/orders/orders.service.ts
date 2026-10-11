import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { toPage } from '../../common/lib/pagination.js';
import type { Page } from '../../common/lib/pagination.types.js';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import type { UpdateOrderDto } from './dto/update-order.dto.js';
import { OrdersRepository } from './orders.repository.js';
import type { AdminOrder, OrderRecord } from './orders.types.js';

/**
 * Order requests as the admin sees them: listing, details and status changes.
 * Requests are created by the public checkout endpoint.
 */
@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async findPage(query: ListOrdersQueryDto): Promise<Page<OrderRecord>> {
    const params = { page: query.page, pageSize: query.pageSize };
    const [items, total] = await Promise.all([
      this.ordersRepository.findPage({ status: query.status, params }),
      this.ordersRepository.count(query.status),
    ]);
    return toPage({ items, total, params });
  }

  async findOne(id: string): Promise<AdminOrder> {
    const order: OrderRecord | undefined = await this.ordersRepository.findById(id);
    if (!order) {
      throw new AppException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Order request not found');
    }
    return { ...order, items: await this.ordersRepository.findItems(id) };
  }

  async updateStatus({ id, dto }: { id: string; dto: UpdateOrderDto }): Promise<AdminOrder> {
    await this.findOne(id);
    await this.ordersRepository.updateStatus({ id, status: dto.status });
    return this.findOne(id);
  }
}
