import type { orderRequest } from '../../database/schema/order-request.js';
import type { orderRequestItem } from '../../database/schema/order-request-item.js';
import type { orderStatus } from '../../database/schema/order-status.js';

export type OrderStatusValue = (typeof orderStatus.enumValues)[number];

export type OrderRecord = typeof orderRequest.$inferSelect;

export type OrderItemRecord = typeof orderRequestItem.$inferSelect;

export type AdminOrder = OrderRecord & {
  items: OrderItemRecord[];
};
