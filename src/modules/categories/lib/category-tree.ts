import type { CategoryRecord } from '../types/categories.types.js';

type OrderedNode = {
  record: CategoryRecord;
  depth: number;
};

/**
 * In-memory view of the whole category tree (a few dozen rows), used for depth checks and ordering.
 */
export class CategoryTree {
  private readonly recordsById = new Map<string, CategoryRecord>();
  private readonly childrenByParentId = new Map<string | null, CategoryRecord[]>();

  constructor(records: CategoryRecord[]) {
    records.forEach((record) => {
      this.recordsById.set(record.id, record);
      const siblings: CategoryRecord[] = this.childrenByParentId.get(record.parentId) ?? [];
      siblings.push(record);
      this.childrenByParentId.set(record.parentId, siblings);
    });
  }

  /** Depth of a category: 1 for a root. Returns 0 for an unknown id. */
  getDepth(id: string): number {
    let depth = 0;
    let currentId: string | null = id;
    while (currentId !== null && this.recordsById.has(currentId)) {
      depth += 1;
      currentId = this.recordsById.get(currentId)?.parentId ?? null;
    }
    return depth;
  }

  /** Number of levels in the subtree under (and including) a category: 1 for a leaf. */
  getHeight(id: string): number {
    const children: CategoryRecord[] = this.childrenByParentId.get(id) ?? [];
    return 1 + Math.max(0, ...children.map((child) => this.getHeight(child.id)));
  }

  /** True when `candidateId` is `ancestorId` itself or lies below it. */
  isSelfOrDescendant({ candidateId, ancestorId }: { candidateId: string; ancestorId: string }): boolean {
    let currentId: string | null = candidateId;
    while (currentId !== null) {
      if (currentId === ancestorId) {
        return true;
      }
      currentId = this.recordsById.get(currentId)?.parentId ?? null;
    }
    return false;
  }

  /** Depth-first order: each parent is followed by its children, siblings by sort order then name. */
  toOrderedList(): OrderedNode[] {
    const ordered: OrderedNode[] = [];
    const visit = (parentId: string | null, depth: number): void => {
      (this.childrenByParentId.get(parentId) ?? []).forEach((record) => {
        ordered.push({ record, depth });
        visit(record.id, depth + 1);
      });
    };
    visit(null, 1);
    return ordered;
  }
}
