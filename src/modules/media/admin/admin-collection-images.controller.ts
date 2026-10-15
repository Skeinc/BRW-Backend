import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/collections/:id/images` */
export const AdminCollectionImagesController = createEntityImagesController({
  entityType: 'collection',
  route: 'collections',
});
