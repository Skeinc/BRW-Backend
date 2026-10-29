import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/slides/:id/images` */
export const AdminSlideImagesController = createEntityImagesController({
  entityType: 'slide',
  route: 'slides',
});
