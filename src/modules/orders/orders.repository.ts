import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, getTableColumns, ilike, or, sql, type SQL } from 'drizzle-orm';
import { buildContainsPattern } from '../../common/lib/build-contains-pattern.js';
import { DRIZZLE } from '../../database/drizzle.constant.js';
import type { DrizzleDatabase } from '../../database/drizzle.types.js';
import { MIN_PHONE_SEARCH_DIGITS } from './constants/orders.constants.js';
import { orderRequest } from '../../database/schema/order-request.js';
import { orderRequestItem } from '../../database/schema/order-request-item.js';
import type {
  NewOrderLine,
  NewOrderValues,
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
  async findPage({ status, q, page, pageSize }: OrderListFilters): Promise<OrderListRowsResult> {
    const where: SQL | undefined = and(
      status === undefined ? undefined : eq(orderRequest.status, status),
      q === undefined ? undefined : this.buildSearchCondition(q),
    );
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

  /**
   * Case-insensitive substring match on the order number, the contact name or the phone. A phone also matches by
   * its digits only, so "+375 (33) 488-50" finds `+375334885000` whatever separators were typed.
   */
  private buildSearchCondition(q: string): SQL | undefined {
    const pattern: string = buildContainsPattern(q);
    const digits: string = q.replaceAll(/\D/g, '');
    return or(
      ilike(orderRequest.number, pattern),
      ilike(orderRequest.contactName, pattern),
      ilike(orderRequest.phone, pattern),
      digits.length >= MIN_PHONE_SEARCH_DIGITS
        ? sql`regexp_replace(${orderRequest.phone}, '[^0-9]', '', 'g') LIKE ${`%${digits}%`}`
        : undefined,
    );
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

  /** Writes the order and its lines in one transaction and returns the generated number. */
  async createWithLines({ values, lines }: { values: NewOrderValues; lines: NewOrderLine[] }): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orderRequest)
        .values(values)
        .returning({ id: orderRequest.id, number: orderRequest.number });
      await tx.insert(orderRequestItem).values(lines.map((line) => ({ ...line, orderRequestId: created.id })));
      return created.number;
    });
  }
}
