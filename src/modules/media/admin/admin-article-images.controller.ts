import { createEntityImagesController } from '../lib/create-entity-images-controller.js';

/** `/api/admin/articles/:id/images` */
export const AdminArticleImagesController = createEntityImagesController({ entityType: 'article', route: 'articles' });
