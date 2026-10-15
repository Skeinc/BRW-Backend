import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/products/:id/images` */
export const AdminProductImagesController = createEntityImagesController({ entityType: 'product', route: 'products' });
