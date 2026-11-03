/**
 * Fills the ready-made solutions from the brw-shop.by export: matches each solution to an export set
 * (same collection and price), creates the products the set needs and links them to the solution.
 *
 * Usage (dry run by default, nothing is written):
 *   npx tsx --env-file=.env scripts/import-brw-shop-solutions.ts [--apply] [--export <path>]
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres, { type Sql } from 'postgres';
import { convertToWebp } from '../src/modules/media/lib/convert-to-webp.js';
import { getThumbnailKey } from '../src/modules/media/lib/get-thumbnail-key.js';

type ExportProduct = {
  slug: string;
  name: string;
  price: string;
  availability: string | null;
  categoryUrl: string | null;
  code: string | null;
  collection: string | null;
  images: string[];
  specs: Record<string, string>;
};

type ExportSet = {
  name: string;
  collectionName: string;
  priceText: string;
  elementLinks?: string[];
};

type ExportFile = { sets: ExportSet[]; products: ExportProduct[] };

type SolutionRow = {
  id: string;
  name: string;
  collection: string;
  price: string;
  slugs: string[];
};

type Match = { solution: SolutionRow; set: ExportSet };

const DEFAULT_EXPORT_PATH = '../brw-shop-export/brw-shop-export.json';
const UPLOADS_DIR: string = process.env.UPLOADS_DIR ?? './uploads';
const MM_PER_CM = 10;
const SKU_PREFIX = 'BRW-';
const SKU_DIGITS = 6;
const EMPTY_SPEC = '---';
const DIMENSION_COLUMNS: Readonly<Record<string, string>> = {
  Ширина: 'width_mm',
  Высота: 'height_mm',
  Глубина: 'depth_mm',
  Длина: 'length_mm',
};
const SKIPPED_SPECS: readonly string[] = [
  'Инструкция по сборке',
  'Цвет корпуса',
  'Цвет фасада',
  ...Object.keys(DIMENSION_COLUMNS),
];
const CATEGORY_BY_NAME_WORD: Readonly<Record<string, string>> = {
  тумба: 'tumby',
  шкаф: 'shkafy',
  полка: 'polki',
  зеркало: 'zerkala',
  стол: 'stoly',
  кровать: 'krovati',
};
const FALLBACK_CATEGORY = 'tumby';
const IMAGE_TIMEOUT_MS = 30_000;
const EXCLUDED_NAME_PART = 'Ликвидация товара';

const args: string[] = process.argv.slice(2);
const isApply: boolean = args.includes('--apply');
const exportPath: string = args.includes('--export') ? args[args.indexOf('--export') + 1] : DEFAULT_EXPORT_PATH;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
if (args.includes('--export') && !args[args.indexOf('--export') + 1]) {
  throw new Error('--export needs a path');
}
const sql: Sql = postgres(process.env.DATABASE_URL);

function lastSegment(url: string): string {
  return url.replace(/\/+$/, '').split('/').pop() ?? '';
}

function normalizePrice(text: string): string {
  return text.replace(/\s/g, '').replace(',', '.');
}

function parseMillimeters(value: string): number | null {
  const parsed: number = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * MM_PER_CM) : null;
}

function resolveCategorySlug(product: ExportProduct, categories: Set<string>): string {
  const own: string = lastSegment(product.categoryUrl ?? '');
  if (categories.has(own)) {
    return own;
  }
  const word: string = product.name.split(' ')[0].toLowerCase();
  return CATEGORY_BY_NAME_WORD[word] ?? FALLBACK_CATEGORY;
}

function buildAttributes(product: ExportProduct): Record<string, string> {
  const entries: [string, string][] = Object.entries(product.specs).filter(
    ([key, value]) => !SKIPPED_SPECS.includes(key) && value !== EMPTY_SPEC && value !== '',
  );
  return { ...(product.code ? { Код: product.code } : {}), ...Object.fromEntries(entries) };
}

function buildDimensions(specs: Record<string, string>): Record<string, number | null> {
  return Object.fromEntries(
    Object.entries(DIMENSION_COLUMNS).map(([label, column]) => [
      column,
      specs[label] ? parseMillimeters(specs[label]) : null,
    ]),
  );
}

async function loadSolutions(): Promise<SolutionRow[]> {
  const rows = await sql<SolutionRow[]>`
    select s.id, s.name, c.name as collection, s.price::text as price,
      coalesce(array_agg(p.slug order by sp.sort_order) filter (where p.slug is not null), '{}') as slugs
    from solution s
    join collection c on c.id = s.collection_id
    left join solution_product sp on sp.solution_id = s.id
    left join product p on p.id = sp.product_id
    group by s.id, c.name order by c.name, s.name`;
  return [...rows];
}

function matchSolutions({ solutions, sets }: { solutions: SolutionRow[]; sets: ExportSet[] }): {
  matches: Match[];
  ambiguous: SolutionRow[];
  unmatched: SolutionRow[];
} {
  const matches: Match[] = [];
  const ambiguous: SolutionRow[] = [];
  const unmatched: SolutionRow[] = [];
  for (const solution of solutions) {
    const candidates: ExportSet[] = sets.filter(
      (set) =>
        (set.elementLinks?.length ?? 0) > 0 &&
        set.collectionName === solution.collection &&
        normalizePrice(set.priceText) === solution.price,
    );
    const distinct = new Set(candidates.map((set) => (set.elementLinks ?? []).map(lastSegment).sort().join(',')));
    if (candidates.length === 0) {
      unmatched.push(solution);
    } else if (distinct.size > 1) {
      ambiguous.push(solution);
    } else {
      matches.push({ solution, set: candidates[0] });
    }
  }
  return { matches, ambiguous, unmatched };
}

async function downloadImage(url: string): Promise<Buffer> {
  const response: Response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Image ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function storeImages({ productId, product }: { productId: string; product: ExportProduct }): Promise<number> {
  let stored = 0;
  for (const [index, url] of product.images.entries()) {
    try {
      const processed = await convertToWebp(await downloadImage(url));
      const key = `products/${productId}/${randomUUID()}.webp`;
      const target: string = path.join(UPLOADS_DIR, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, processed.main);
      await writeFile(path.join(UPLOADS_DIR, getThumbnailKey(key)), processed.thumbnail);
      await sql`insert into media_image (entity_type, entity_id, key, alt, width, height, sort_order)
        values ('product', ${productId}, ${key}, ${product.name}, ${processed.width}, ${processed.height}, ${index})`;
      stored += 1;
    } catch (err) {
      console.warn(`  ! ${product.slug}: ${err instanceof Error ? err.message : 'image failed'}`);
    }
  }
  return stored;
}

async function nextSkuNumber(): Promise<number> {
  const [row] = await sql<{ highest: number | null }[]>`
    select max(substring(sku from '^BRW-([0-9]+)$')::int) as highest from product`;
  return (row.highest ?? 0) + 1;
}

async function createProduct({
  product,
  skuNumber,
  categories,
  collections,
}: {
  product: ExportProduct;
  skuNumber: number;
  categories: Map<string, string>;
  collections: Map<string, string>;
}): Promise<string> {
  const categorySlug: string = resolveCategorySlug(product, new Set(categories.keys()));
  const categoryId: string | undefined = categories.get(categorySlug);
  if (categoryId === undefined) {
    throw new Error(`Category ${categorySlug} not found for ${product.slug}`);
  }
  const dimensions = buildDimensions(product.specs);
  const sku = `${SKU_PREFIX}${String(skuNumber).padStart(SKU_DIGITS, '0')}`;
  const stock: string = product.availability?.endsWith('InStock') ? 'in_stock' : 'on_order';
  const [row] = await sql<{ id: string }[]>`
    insert into product (category_id, collection_id, slug, sku, name, price, stock_status, width_mm, height_mm, depth_mm,
      length_mm, color_body, color_facade, attributes, is_published)
    values (${categoryId}, ${collections.get(product.collection ?? '') ?? null}, ${product.slug}, ${sku}, ${product.name},
      ${product.price}, ${stock}::stock_status, ${dimensions.width_mm}, ${dimensions.height_mm}, ${dimensions.depth_mm},
      ${dimensions.length_mm}, ${product.specs['Цвет корпуса'] ?? null}, ${product.specs['Цвет фасада'] ?? null},
      ${sql.json(buildAttributes(product))}, true)
    returning id`;
  return row.id;
}

async function linkProducts({ match, ids }: { match: Match; ids: Map<string, string> }): Promise<number> {
  const slugs: string[] = (match.set.elementLinks ?? []).map(lastSegment);
  let added = 0;
  for (const [index, slug] of slugs.entries()) {
    const productId: string | undefined = ids.get(slug);
    if (productId === undefined || match.solution.slugs.includes(slug)) {
      continue;
    }
    await sql`insert into solution_product (solution_id, product_id, sort_order)
      values (${match.solution.id}, ${productId}, ${index}) on conflict do nothing`;
    added += 1;
  }
  return added;
}

async function main(): Promise<void> {
  const data: ExportFile = JSON.parse(await readFile(exportPath, 'utf8'));
  const solutions: SolutionRow[] = await loadSolutions();
  const { matches, ambiguous, unmatched } = matchSolutions({ solutions, sets: data.sets });
  const exportProducts = new Map(data.products.map((product) => [product.slug, product]));
  const existing = new Map(
    (await sql<{ id: string; slug: string }[]>`select id, slug from product`).map((r) => [r.slug, r.id]),
  );
  const categories = new Map(
    (await sql<{ id: string; slug: string }[]>`select id, slug from category`).map((r) => [r.slug, r.id]),
  );
  const collections = new Map(
    (await sql<{ id: string; name: string }[]>`select id, name from collection`).map((r) => [r.name, r.id]),
  );
  const needed: string[] = [...new Set(matches.flatMap(({ set }) => (set.elementLinks ?? []).map(lastSegment)))];
  const toCreate: ExportProduct[] = needed
    .filter((slug) => !existing.has(slug))
    .flatMap((slug) => exportProducts.get(slug) ?? [])
    .filter((product) => !product.name.includes(EXCLUDED_NAME_PART));
  const notInExport: string[] = needed.filter((slug) => !existing.has(slug) && !exportProducts.has(slug));
  console.log(
    `Solutions: ${solutions.length}; matched ${matches.length}; ambiguous ${ambiguous.length}; unmatched ${unmatched.length}`,
  );
  console.log(`Products to create: ${toCreate.length}; missing in the export too: ${notInExport.length}`);
  const ids = new Map(existing);
  let skuNumber: number = await nextSkuNumber();
  if (isApply) {
    for (const product of toCreate) {
      const id: string = await createProduct({ product, skuNumber, categories, collections });
      skuNumber += 1;
      ids.set(product.slug, id);
      const images: number = await storeImages({ productId: id, product });
      console.log(`  + ${product.slug} (${images}/${product.images.length} images)`);
    }
  }
  let linked = 0;
  for (const match of matches) {
    const missing: number = (match.set.elementLinks ?? [])
      .map(lastSegment)
      .filter((slug) => !match.solution.slugs.includes(slug)).length;
    if (missing > 0) {
      console.log(
        `  ${match.solution.collection} / ${match.solution.name}: has ${match.solution.slugs.length}, adds ${missing}`,
      );
    }
    linked += isApply ? await linkProducts({ match, ids }) : missing;
  }
  console.log(`${isApply ? 'Linked' : 'Would link'} ${linked} solution-product rows`);
  for (const solution of [...ambiguous, ...unmatched]) {
    console.log(
      `  no set: ${solution.collection} / ${solution.name} (${solution.price}, ${solution.slugs.length} items)`,
    );
  }
  if (!isApply) {
    console.log('Dry run: pass --apply to write.');
  }
}

try {
  await main();
} finally {
  await sql.end();
}
