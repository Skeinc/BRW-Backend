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

export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 99;
export const ORDER_THROTTLE_LIMIT = 10;
export const ORDER_THROTTLE_TTL_MS = 60_000;
/** Mobile operator codes of Belarus accepted in the phone number. */
export const BELARUS_PHONE_PATTERN = /^\+375(25|29|33|44)\d{7}$/;
