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
  q?: string;
  page: number;
  pageSize: number;
};

export type OrderListRowsResult = {
  rows: OrderListItem[];
  total: number;
};

/** A line of a new order with the price copied from the product. */
export type NewOrderLine = {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: string;
  quantity: number;
};

export type NewOrderValues = Pick<
  typeof orderRequest.$inferInsert,
  'contactName' | 'phone' | 'email' | 'deliveryMethod' | 'city' | 'address' | 'paymentMethod' | 'comment' | 'total'
>;

/** Why a product of the cart cannot be ordered. */
export type UnavailableReason = 'not_found' | 'out_of_stock';

export type UnavailableItem = {
  productId: string;
  reason: UnavailableReason;
};

/** Response of POST /api/orders. */
export type CreatedOrder = {
  number: string;
};
