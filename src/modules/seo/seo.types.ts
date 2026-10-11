import type { slugEntity } from '../../database/schema/slug-entity.js';

export type SlugEntity = (typeof slugEntity.enumValues)[number];

export type SlugChange = {
  entity: SlugEntity;
  oldSlug: string;
  newSlug: string;
  targetId: string;
};
