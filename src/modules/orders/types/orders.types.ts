import type { orderRequest } from '../../../database/schema/order-request.js';
import type { orderRequestItem } from '../../../database/schema/order-request-item.js';

export type OrderRecord = typeof orderRequest.$inferSelect;

export type OrderItemRecord = typeof orderRequestItem.$inferSelect;

export type OrderStatus = OrderRecord['status'];

/** One row of the admin order list; `total` is a numeric string such as "1299.00". */
export type OrderListItem = OrderRecord & {
  itemsCount: number;
};

/** An order with its lines. */
export type OrderView = OrderRecord & {
  items: OrderItemRecord[];
};

export type OrderListFilters = {
  status?: OrderStatus;
  page: number;
  pageSize: number;
};

export type OrderListRowsResult = {
  rows: OrderListItem[];
  total: number;
};
