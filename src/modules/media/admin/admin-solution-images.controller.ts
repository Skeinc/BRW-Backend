import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/solutions/:id/images` */
export const AdminSolutionImagesController = createEntityImagesController({
  entityType: 'solution',
  route: 'solutions',
});
