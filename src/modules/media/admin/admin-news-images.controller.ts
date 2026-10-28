import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/news/:id/images` */
export const AdminNewsImagesController = createEntityImagesController({ entityType: 'news', route: 'news' });
