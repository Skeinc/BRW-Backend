import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/categories/:id/images` */
export const AdminCategoryImagesController = createEntityImagesController({
  entityType: 'category',
  route: 'categories',
});
