import { Inject, Injectable } from '@nestjs/common';
import { asc, count, desc, eq } from 'drizzle-orm';
import type { PageParams } from '../../common/lib/pagination.types.js';
import { toOffset } from '../../common/lib/pagination.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { orderRequest } from '../../database/schema/order-request.js';
import { orderRequestItem } from '../../database/schema/order-request-item.js';
import type { OrderItemRecord, OrderRecord, OrderStatusValue } from './orders.types.js';

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly database: DrizzleDatabase,
  ) {}

  /**
   * One page of order requests, newest first, optionally only those with the given status.
   */
  async findPage({
    status,
    params,
  }: {
    status: OrderStatusValue | undefined;
    params: PageParams;
  }): Promise<OrderRecord[]> {
    return this.database
      .select()
      .from(orderRequest)
      .where(status ? eq(orderRequest.status, status) : undefined)
      .orderBy(desc(orderRequest.createdAt), desc(orderRequest.id))
      .limit(params.pageSize)
      .offset(toOffset(params));
  }

  async count(status: OrderStatusValue | undefined): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(orderRequest)
      .where(status ? eq(orderRequest.status, status) : undefined);
    return row.total;
  }

  async findById(id: string): Promise<OrderRecord | undefined> {
    const [row] = await this.database.select().from(orderRequest).where(eq(orderRequest.id, id));
    return row;
  }

  async findItems(orderRequestId: string): Promise<OrderItemRecord[]> {
    return this.database
      .select()
      .from(orderRequestItem)
      .where(eq(orderRequestItem.orderRequestId, orderRequestId))
      .orderBy(asc(orderRequestItem.name), asc(orderRequestItem.id));
  }

  async updateStatus({ id, status }: { id: string; status: OrderStatusValue }): Promise<void> {
    await this.database.update(orderRequest).set({ status }).where(eq(orderRequest.id, id));
  }
}
