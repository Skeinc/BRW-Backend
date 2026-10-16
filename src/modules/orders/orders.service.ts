import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.js';
import { buildPaginatedResult } from '../../common/lib/build-paginated-result.js';
import type { PaginatedResult } from '../../common/lib/pagination.types.js';
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { ORDER_STATUS_TRANSITIONS } from './constants/orders.constants.js';
import { OrdersRepository } from './orders.repository.js';
import type { OrderListItem, OrderRecord, OrderStatus, OrderView } from './types/orders.types.js';

/** Admin view of order requests: browse and change status. Orders are created by the public API (stage 5). */
@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  /** A page of orders, optionally filtered by status. */
  async list(query: ListOrdersQueryDto): Promise<PaginatedResult<OrderListItem>> {
    const { rows, total } = await this.ordersRepository.findPage(query);
    return buildPaginatedResult({ items: rows, page: query.page, pageSize: query.pageSize, total });
  }

  /** One order with its lines; fails with 404 ORDER_NOT_FOUND. */
  async get(id: string): Promise<OrderView> {
    return this.toView(await this.getRecordOrThrow(id));
  }

  /** Sets the status of an order; fails with 409 ORDER_STATUS_INVALID when the order cannot move there. */
  async updateStatus({ id, status }: { id: string; status: OrderStatus }): Promise<OrderView> {
    const existing: OrderRecord = await this.getRecordOrThrow(id);
    if (existing.status === status) {
      return this.toView(existing);
    }
    if (!ORDER_STATUS_TRANSITIONS[existing.status].includes(status)) {
      throw new AppException(
        ErrorCode.ORDER_STATUS_INVALID,
        HttpStatus.CONFLICT,
        `Order status cannot change from ${existing.status} to ${status}`,
        { from: existing.status, to: status },
      );
    }
    return this.toView(await this.ordersRepository.updateStatus({ id, status }));
  }

  private async getRecordOrThrow(id: string): Promise<OrderRecord> {
    const record: OrderRecord | undefined = await this.ordersRepository.findById(id);
    if (record === undefined) {
      throw new AppException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND, 'Order not found');
    }
    return record;
  }

  private async toView(record: OrderRecord): Promise<OrderView> {
    return { ...record, items: await this.ordersRepository.findItems(record.id) };
  }
}
