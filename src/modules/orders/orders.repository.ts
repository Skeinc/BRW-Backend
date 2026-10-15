import { Inject, Injectable } from '@nestjs/common';
import { asc, count, desc, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { orderRequest } from '../../database/schema/order-request.js';
import { orderRequestItem } from '../../database/schema/order-request-item.js';
import type {
  OrderItemRecord,
  OrderListFilters,
  OrderListRowsResult,
  OrderRecord,
  OrderStatus,
} from './types/orders.types.js';

/** Drizzle queries for `order_request` and `order_request_item`. */
@Injectable()
export class OrdersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  /** One page of orders, newest first, with the number of lines in each. */
  async findPage({ status, page, pageSize }: OrderListFilters): Promise<OrderListRowsResult> {
    const where: SQL | undefined = status === undefined ? undefined : eq(orderRequest.status, status);
    const rows = await this.db
      .select({ ...getTableColumns(orderRequest), itemsCount: count(orderRequestItem.id) })
      .from(orderRequest)
      .leftJoin(orderRequestItem, eq(orderRequestItem.orderRequestId, orderRequest.id))
      .where(where)
      .groupBy(orderRequest.id)
      .orderBy(desc(orderRequest.createdAt), desc(orderRequest.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [totalRow] = await this.db.select({ total: count() }).from(orderRequest).where(where);
    return { rows, total: totalRow.total };
  }

  /** Finds one row by id, or undefined when it does not exist. */
  async findById(id: string): Promise<OrderRecord | undefined> {
    const [record] = await this.db.select().from(orderRequest).where(eq(orderRequest.id, id));
    return record;
  }

  /** Lines of one order request, sorted by name. */
  async findItems(orderId: string): Promise<OrderItemRecord[]> {
    return this.db
      .select()
      .from(orderRequestItem)
      .where(eq(orderRequestItem.orderRequestId, orderId))
      .orderBy(asc(orderRequestItem.name));
  }

  /** Sets the status of an order request and returns it. */
  async updateStatus({ id, status }: { id: string; status: OrderStatus }): Promise<OrderRecord> {
    const [record] = await this.db.update(orderRequest).set({ status }).where(eq(orderRequest.id, id)).returning();
    return record;
  }
}
