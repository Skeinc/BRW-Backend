import { article } from './schema/article.js';
import { category } from './schema/category.js';
import { collection } from './schema/collection.js';
import { deliveryMethodEnum } from './schema/delivery-method.enum.js';
import { mediaEntityTypeEnum } from './schema/media-entity-type.enum.js';
import { mediaImage } from './schema/media-image.js';
import { news } from './schema/news.js';
import { orderRequest } from './schema/order-request.js';
import { orderRequestItem } from './schema/order-request-item.js';
import { orderRequestNumberSequence } from './schema/order-request-number.sequence.js';
import { orderStatusEnum } from './schema/order-status.enum.js';
import { paymentMethodEnum } from './schema/payment-method.enum.js';
import { product } from './schema/product.js';
import { room } from './schema/room.js';
import { slide } from './schema/slide.js';
import { solution } from './schema/solution.js';
import { solutionProduct } from './schema/solution-product.js';
import { slugRedirect } from './schema/slug-redirect.js';
import { slugRedirectEntityEnum } from './schema/slug-redirect-entity.enum.js';
import { stockStatusEnum } from './schema/stock-status.enum.js';

/**
 * Registry of Drizzle tables. Each stage adds its table files from `schema/` here.
 */
export const schema = {
  article,
  category,
  collection,
  deliveryMethodEnum,
  mediaEntityTypeEnum,
  mediaImage,
  news,
  orderRequest,
  orderRequestItem,
  orderRequestNumberSequence,
  orderStatusEnum,
  paymentMethodEnum,
  product,
  room,
  slide,
  solution,
  solutionProduct,
  slugRedirect,
  slugRedirectEntityEnum,
  stockStatusEnum,
};
