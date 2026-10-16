import type { OrderStatus } from '../types/orders.types.js';

/** A search text needs at least this many digits to be compared with the digits of phone numbers. */
export const MIN_PHONE_SEARCH_DIGITS = 3;

/**
 * Statuses an order can move to from each status. The chain is new, in progress, then done or cancelled;
 * a finished or cancelled order can be reopened so a misclick can be undone.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  new: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: ['in_progress'],
  cancelled: ['new'],
};
