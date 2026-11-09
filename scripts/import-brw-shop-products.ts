/**
 * Creates the products that exist on brw-shop.by but not in our catalog, from a JSON file shaped like the
 * brw-shop export (`{ products: [...] }`). Products already in the catalog are skipped.
 *
 * Usage (dry run by default, nothing is written):
 *   npx tsx --env-file=.env scripts/import-brw-shop-products.ts --file <path> [--apply]
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

const UPLOADS_DIR: string = process.env.UPLOADS_DIR ?? './uploads';
const MM_PER_CM = 10;
const SKU_PREFIX = 'BRW-';
const SKU_DIGITS = 6;
const EMPTY_SPEC = '---';
const IMAGE_TIMEOUT_MS = 30_000;
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

function lastSegment(url: string): string {
  return url.replace(/\/+$/, '').split('/').pop() ?? '';
}

function parseMillimeters(value: string): number | null {
  const parsed: number = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.round(parsed * MM_PER_CM) : null;
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
  const categoryId: string | undefined = categories.get(lastSegment(product.categoryUrl ?? ''));
  if (categoryId === undefined) {
    throw new Error(`Category ${product.categoryUrl} not found for ${product.slug}`);
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

async function main(): Promise<void> {
  const data: { products: ExportProduct[] } = JSON.parse(await readFile(filePath as string, 'utf8'));
  const existing = new Set((await sql<{ slug: string }[]>`select slug from product`).map((row) => row.slug));
  const categories = new Map(
    (await sql<{ id: string; slug: string }[]>`select id, slug from category`).map((row) => [row.slug, row.id]),
  );
  const collections = new Map(
    (await sql<{ id: string; name: string }[]>`select id, name from collection`).map((row) => [row.name, row.id]),
  );
  const toCreate: ExportProduct[] = data.products.filter((product) => !existing.has(product.slug));
  console.log(`Products in file: ${data.products.length}; to create: ${toCreate.length}`);
  let skuNumber: number = await nextSkuNumber();
  for (const product of toCreate) {
    if (!isApply) {
      console.log(
        `  would create ${product.slug} (${product.collection}, ${product.price}, ${product.images.length} images)`,
      );
      continue;
    }
    const id: string = await createProduct({ product, skuNumber, categories, collections });
    skuNumber += 1;
    const images: number = await storeImages({ productId: id, product });
    console.log(`  + ${product.slug} (${images}/${product.images.length} images)`);
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
