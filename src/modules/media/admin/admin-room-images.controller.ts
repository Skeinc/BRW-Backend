import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/rooms/:id/images` */
export const AdminRoomImagesController = createEntityImagesController({
  entityType: 'room',
  route: 'rooms',
});
