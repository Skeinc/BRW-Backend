import type { PublicCategoryNode } from '../types/categories.types.js';

/** Depth-first search of a node by id, or undefined when the tree does not contain it. */
export function findCategoryNode({
  nodes,
  id,
}: {
  nodes: PublicCategoryNode[];
  id: string;
}): PublicCategoryNode | undefined {
  for (const node of nodes) {
    const found: PublicCategoryNode | undefined =
      node.id === id ? node : findCategoryNode({ nodes: node.children, id });
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
