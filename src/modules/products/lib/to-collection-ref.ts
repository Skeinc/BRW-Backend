import type { NamedRef } from '../types/products.types.js';

type CollectionColumns = {
  collectionId: string | null;
  collectionSlug: string | null;
  collectionName: string | null;
};

/** Folds the left-joined collection columns into a ref, or null when the product has no published collection. */
export function toCollectionRef({ collectionId, collectionSlug, collectionName }: CollectionColumns): NamedRef | null {
  return collectionId === null || collectionSlug === null || collectionName === null
    ? null
    : { id: collectionId, slug: collectionSlug, name: collectionName };
}
