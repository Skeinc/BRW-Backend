import { category } from './schema/category.js';
import { collection } from './schema/collection.js';
import { deliveryMethod } from './schema/delivery-method.js';
import { orderNumberSequence } from './schema/order-number-sequence.js';
import { orderRequest } from './schema/order-request.js';
import { orderRequestItem } from './schema/order-request-item.js';
import { orderStatus } from './schema/order-status.js';
import { paymentMethod } from './schema/payment-method.js';
import { product } from './schema/product.js';
import { productImage } from './schema/product-image.js';
import { slugEntity } from './schema/slug-entity.js';
import { slugRedirect } from './schema/slug-redirect.js';
import { stockStatus } from './schema/stock-status.js';

/**
 * Registry of Drizzle tables, enums and sequences. Every file in `schema/` is listed here.
 */
export const schema = {
  category,
  collection,
  deliveryMethod,
  orderNumberSequence,
  orderRequest,
  orderRequestItem,
  orderStatus,
  paymentMethod,
  product,
  productImage,
  slugEntity,
  slugRedirect,
  stockStatus,
};
