import type { CategoryNode } from './categories.types.js';

export const MAX_CATEGORY_LEVELS = 3;

/**
 * In-memory view of the category hierarchy used to enforce the depth limit and to avoid cycles.
 * The catalog has about 70 categories, so the whole tree is cheap to load.
 */
export class CategoryTree {
  private readonly parentById: ReadonlyMap<string, string | null>;
  private readonly childrenById: ReadonlyMap<string, readonly string[]>;

  constructor(nodes: readonly CategoryNode[]) {
    this.parentById = new Map(nodes.map((node) => [node.id, node.parentId]));
    const children = new Map<string, string[]>();
    nodes.forEach((node) => {
      if (node.parentId) {
        children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
      }
    });
    this.childrenById = children;
  }

  /**
   * Level of a category: 1 for a root, 2 for its children, and so on.
   */
  getLevel(id: string): number {
    let level = 1;
    let parentId: string | null | undefined = this.parentById.get(id);
    while (parentId) {
      level += 1;
      parentId = this.parentById.get(parentId);
    }
    return level;
  }

  /**
   * Number of levels in the subtree rooted at `id`, counting `id` itself.
   */
  getHeight(id: string): number {
    const children: readonly string[] = this.childrenById.get(id) ?? [];
    return 1 + Math.max(0, ...children.map((childId) => this.getHeight(childId)));
  }

  /**
   * Ids of every category below `id`, at any depth.
   */
  getDescendantIds(id: string): string[] {
    const children: readonly string[] = this.childrenById.get(id) ?? [];
    return children.flatMap((childId) => [childId, ...this.getDescendantIds(childId)]);
  }
}
