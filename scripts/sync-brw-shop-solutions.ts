/**
 * Makes the ready-made solutions match brw-shop.by: price without discount, place in the room, the list of
 * elements and the cover photo. Input is a JSON array of
 * `{ id | null, room, price, sortOrder, elements: [product slug], image, name?, collectionSlug? }`;
 * an entry without `id` creates the solution in the room.
 *
 * Usage (dry run by default, nothing is written):
 *   npx tsx --env-file=.env scripts/sync-brw-shop-solutions.ts --file <path> [--apply]
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres, { type Sql } from 'postgres';
import { convertToWebp } from '../src/modules/media/lib/convert-to-webp.js';
import { getThumbnailKey } from '../src/modules/media/lib/get-thumbnail-key.js';

type PlanEntry = {
  id: string | null;
  room: string;
  price: string;
  sortOrder: number;
  elements: string[];
  image: string;
  name?: string;
  collectionSlug?: string;
};

type CoverRow = { width: number; height: number };

const SITE_URL = 'https://brw-shop.by';
const IMAGE_TIMEOUT_MS = 60_000;
const UPLOADS_DIR: string = process.env.UPLOADS_DIR ?? './uploads';
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

async function downloadImage(url: string): Promise<Buffer> {
  const response: Response = await fetch(`${SITE_URL}${url}`, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Image ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function replaceCover({ solutionId, entry }: { solutionId: string; entry: PlanEntry }): Promise<boolean> {
  const processed = await convertToWebp(await downloadImage(entry.image));
  const [cover] = await sql<CoverRow[]>`
    select width, height from media_image where entity_type = 'solution' and entity_id = ${solutionId}
    order by sort_order limit 1`;
  if (cover?.width === processed.width && cover.height === processed.height) {
    return false;
  }
  const key = `solutions/${solutionId}/${randomUUID()}.webp`;
  const target: string = path.join(UPLOADS_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, processed.main);
  await writeFile(path.join(UPLOADS_DIR, getThumbnailKey(key)), processed.thumbnail);
  await sql`delete from media_image where entity_type = 'solution' and entity_id = ${solutionId}`;
  await sql`insert into media_image (entity_type, entity_id, key, alt, width, height, sort_order)
    values ('solution', ${solutionId}, ${key}, ${entry.name ?? null}, ${processed.width}, ${processed.height}, 0)`;
  return true;
}

async function createSolution(entry: PlanEntry): Promise<string> {
  const [created] = await sql<{ id: string }[]>`
    insert into solution (room_id, collection_id, name, price, sort_order)
    select r.id, c.id, ${entry.name ?? ''}, ${entry.price}, ${entry.sortOrder}
    from room r, collection c where r.name = ${entry.room} and c.slug = ${entry.collectionSlug ?? ''}
    returning id`;
  return created.id;
}

async function linkElements({ solutionId, entry }: { solutionId: string; entry: PlanEntry }): Promise<string[]> {
  const found = await sql<
    { id: string; slug: string }[]
  >`select id, slug from product where slug in ${sql(entry.elements)}`;
  const idBySlug = new Map(found.map((row) => [row.slug, row.id]));
  await sql`delete from solution_product where solution_id = ${solutionId}`;
  const linked = entry.elements.flatMap((slug, sortOrder) =>
    idBySlug.has(slug)
      ? [{ solution_id: solutionId, product_id: idBySlug.get(slug) as string, sort_order: sortOrder }]
      : [],
  );
  if (linked.length > 0) {
    await sql`insert into solution_product ${sql(linked)} on conflict do nothing`;
  }
  return entry.elements.filter((slug) => !idBySlug.has(slug));
}

async function applyEntry(entry: PlanEntry): Promise<{ missing: string[]; photo: boolean }> {
  const solutionId: string = entry.id ?? (await createSolution(entry));
  await sql`update solution set price = ${entry.price}, sort_order = ${entry.sortOrder}, is_published = true
    where id = ${solutionId}`;
  const missing: string[] = await linkElements({ solutionId, entry });
  const photo: boolean = await replaceCover({ solutionId, entry });
  return { missing, photo };
}

async function main(): Promise<void> {
  const plan: PlanEntry[] = JSON.parse(await readFile(filePath as string, 'utf8'));
  console.log(`Solutions in plan: ${plan.length}, new: ${plan.filter((entry) => entry.id === null).length}`);
  if (!isApply) {
    console.log('Dry run: pass --apply to write.');
    return;
  }
  let photos = 0;
  const missing = new Set<string>();
  for (const entry of plan) {
    const result = await applyEntry(entry);
    photos += result.photo ? 1 : 0;
    result.missing.forEach((slug) => missing.add(slug));
  }
  console.log(`Done. Photos replaced: ${photos}. Elements not in the catalog: ${[...missing].join(', ')}`);
}

try {
  await main();
} finally {
  await sql.end();
}
