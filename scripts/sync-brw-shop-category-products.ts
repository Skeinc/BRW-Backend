/**
 * Makes every category list the same products as on brw-shop.by. Input is a JSON file shaped like
 * `{ "<category slug>": ["<product slug>", ...] }`. Every listed product is stored in `product_category`
 * with its position, which the storefront uses as the default order of the category.
 *
 * Usage (dry run by default, nothing is written):
 *   npx tsx --env-file=.env scripts/sync-brw-shop-category-products.ts --file <path> [--apply]
 */
import { readFile } from 'node:fs/promises';
import postgres, { type Sql } from 'postgres';

type CategoryListing = Record<string, string[]>;

const args: string[] = process.argv.slice(2);
const isApply: boolean = args.includes('--apply');
const filePath: string | undefined = args[args.indexOf('--file') + 1];
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
if (!args.includes('--file') || !filePath) {
  throw new Error('--file needs a path');
}
const sql: Sql = postgres(process.env.DATABASE_URL);

async function loadIds(table: 'product' | 'category'): Promise<Map<string, { id: string; categoryId: string | null }>> {
  const rows =
    table === 'product'
      ? await sql<{ id: string; slug: string; category_id: string }[]>`select id, slug, category_id from product`
      : await sql<
          { id: string; slug: string; category_id: null }[]
        >`select id, slug, null as category_id from category`;
  return new Map(rows.map((row) => [row.slug, { id: row.id, categoryId: row.category_id }]));
}

async function main(): Promise<void> {
  const listing: CategoryListing = JSON.parse(await readFile(filePath as string, 'utf8'));
  const products = await loadIds('product');
  const categories = await loadIds('category');
  const pairs: [string, string, number][] = [];
  const unknown = new Set<string>();
  for (const [categorySlug, productSlugs] of Object.entries(listing)) {
    const category = categories.get(categorySlug);
    if (category === undefined) {
      continue;
    }
    productSlugs.forEach((productSlug, position) => {
      const found = products.get(productSlug);
      if (found === undefined) {
        unknown.add(productSlug);
      } else {
        pairs.push([found.id, category.id, position]);
      }
    });
  }
  console.log(`Listings: ${pairs.length}; products not in the catalog: ${unknown.size}`);
  if (unknown.size > 0) {
    console.log(`  missing: ${[...unknown].join(', ')}`);
  }
  if (!isApply) {
    console.log('Dry run: pass --apply to write.');
    return;
  }
  await sql.begin(async (tx) => {
    await tx`delete from product_category`;
    for (let i = 0; i < pairs.length; i += 1000) {
      await tx`insert into product_category ${tx(pairs.slice(i, i + 1000).map(([productId, categoryId, position]) => ({ product_id: productId, category_id: categoryId, position })))} on conflict do nothing`;
    }
  });
  console.log('Done.');
}

try {
  await main();
} finally {
  await sql.end();
}
