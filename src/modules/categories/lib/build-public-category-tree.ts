import type { CategoryRecord, PublicCategoryNode } from '../types/categories.types.js';

type BuildPublicCategoryTreeInput = {
  /** Visible categories in display order. */
  records: CategoryRecord[];
  /** Published products directly in each category. */
  directCounts: Map<string, number>;
  imageUrls: Map<string, string>;
};

/** Builds the nested storefront tree; a node counts the products of its whole subtree. */
export function buildPublicCategoryTree({
  records,
  directCounts,
  imageUrls,
}: BuildPublicCategoryTreeInput): PublicCategoryNode[] {
  const childrenByParentId = new Map<string | null, CategoryRecord[]>();
  records.forEach((record) => {
    const siblings: CategoryRecord[] = childrenByParentId.get(record.parentId) ?? [];
    siblings.push(record);
    childrenByParentId.set(record.parentId, siblings);
  });
  const build = (record: CategoryRecord): PublicCategoryNode => {
    const children: PublicCategoryNode[] = (childrenByParentId.get(record.id) ?? []).map(build);
    const productCount: number = children.reduce(
      (sum, child) => sum + child.productCount,
      directCounts.get(record.id) ?? 0,
    );
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      imageUrl: imageUrls.get(record.id) ?? null,
      productCount,
      children,
    };
  };
  return (childrenByParentId.get(null) ?? []).map(build);
}
