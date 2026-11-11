/**
 * Sets up the consultation-only room "Кухни" from the kitchen series of interline.by (Мila): the room with its photo,
 * one collection per series linked to the room in the source order, and a gallery per collection: the series cover,
 * the straight kitchen closest to 3 m and the corner kitchen whose long side is closest to 3 m. Kitchens are not
 * sold on the site: no products, no solutions, no cart; the price "от …" and the text are filled in the admin.
 *
 * Usage (dry run by default, nothing is written):
 *   npx tsx --env-file=.env scripts/import-interline-kitchens.ts [--apply]
 *
 * Images are written to UPLOADS_DIR. When the API runs in Docker, run the script where that directory is the
 * API's uploads volume (or copy the new files into the volume afterwards), otherwise /media answers 404.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import postgres, { type Sql } from 'postgres';
import { convertToWebp } from '../src/modules/media/lib/convert-to-webp.js';
import { getThumbnailKey } from '../src/modules/media/lib/get-thumbnail-key.js';
import type { ProcessedImage } from '../src/modules/media/types/media.types.js';

type Series = { sourceSlug: string; slug: string; name: string; coverUrl: string };
type Kitchen = { name: string; imageUrl: string; lengthMm: number; isCorner: boolean };
type Photo = { url: string; alt: string };
type EntityType = 'room' | 'collection';

const SOURCE_URL = 'https://interline.by/kollekciya-tauer-2/';
const ROOM_NAME = 'Кухни';
const ROOM_SEO_TITLE = 'Кухни — корпусная мебель BRW';
const ROOM_SEO_DESCRIPTION =
  'Кухни BRW: коллекции, фото и цены. Подберём кухню под ваши размеры — позвоните или приходите в салон в Могилёве.';
const ROOM_COVER_SERIES = 'Берес';
const UPLOADS_DIR: string = process.env.UPLOADS_DIR ?? './uploads';
const REQUEST_TIMEOUT_MS = 30_000;
const USER_AGENT = 'Mozilla/5.0';
const TARGET_LENGTH_MM = 3000;
/** Shorter items are modules (Compo), not kitchens. */
const MIN_KITCHEN_LENGTH_MM = 1200;
const MM_PER_M = 1000;
const CARD_PATTERN =
  /<a href="https:\/\/interline\.by\/kollekciya-tauer-2\/([a-z0-9-]+)\/"[^>]*>\s*<img src="([^"]+)" alt="([^"]+)"/g;
const ITEM_PATTERN =
  /<a href="[^"]+" class="FurnitureFromThisCollection__item">\s*<img src="([^"]+)"[^>]*>\s*<div[^>]*>\s*<p class="FurnitureFromThisCollection__title">([^<]+)<\/p>\s*<p>([\s\S]*?)<\/p>/g;
const CORNER_NAME_PATTERN = /(\d+[.,]\d+)\s*[хx]\s*(\d+[.,]\d+)/i;
const WIDTH_PATTERN = /Ш\s*(\d+)/;
const CACHE_SIZE_PATTERN = /\/image\/cache\/(.+)-\d+x\d+(\.\w+)$/;
const SLUG_BY_SERIES: Readonly<Record<string, string>> = {
  'holc-new': 'holz-new',
  mila: 'mila-kitchen',
};
const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&quot;': '"',
  '&amp;': '&',
  '&#039;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

const isApply: boolean = process.argv.includes('--apply');
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}
const sql: Sql = postgres(process.env.DATABASE_URL);

async function fetchBuffer(url: string): Promise<Buffer> {
  const response: Response = await fetch(encodeURI(decodeURI(url)), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${response.status} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchText(url: string): Promise<string> {
  return (await fetchBuffer(url)).toString('utf8');
}

/** Prefers the original image over the catalog crop; falls back to the crop. */
async function fetchPhoto(imageUrl: string): Promise<ProcessedImage> {
  try {
    return await convertToWebp(await fetchBuffer(imageUrl.replace(CACHE_SIZE_PATTERN, '/image/$1$2')));
  } catch {
    return convertToWebp(await fetchBuffer(imageUrl));
  }
}

function decodeEntities(text: string): string {
  return text.replace(/&(?:quot|amp|lt|gt|#039);/g, (entity: string) => HTML_ENTITIES[entity] ?? entity).trim();
}

function parseMeters(value: string): number {
  return Math.round(Number(value.replace(',', '.')) * MM_PER_M);
}

async function readSeries(): Promise<Series[]> {
  const html: string = await fetchText(SOURCE_URL);
  return [...html.matchAll(CARD_PATTERN)].map(([, sourceSlug, coverUrl, name]) => ({
    sourceSlug,
    slug: SLUG_BY_SERIES[sourceSlug] ?? sourceSlug,
    name: decodeEntities(name),
    coverUrl,
  }));
}

function toKitchen([, imageUrl, title, rawSize]: RegExpMatchArray): Kitchen {
  const name: string = decodeEntities(title);
  const corner: RegExpExecArray | null = CORNER_NAME_PATTERN.exec(name);
  if (corner !== null) {
    return { name, imageUrl, lengthMm: Math.max(parseMeters(corner[1]), parseMeters(corner[2])), isCorner: true };
  }
  return { name, imageUrl, lengthMm: Number(WIDTH_PATTERN.exec(rawSize)?.[1] ?? 0), isCorner: false };
}

/** The kitchen whose length is closest to 3 m; the longer one wins a tie. */
function pickClosestToTarget(kitchens: Kitchen[]): Kitchen | undefined {
  const distance = (kitchen: Kitchen): number => Math.abs(kitchen.lengthMm - TARGET_LENGTH_MM);
  return kitchens
    .filter((kitchen: Kitchen) => kitchen.lengthMm >= MIN_KITCHEN_LENGTH_MM)
    .reduce<Kitchen | undefined>(
      (best, kitchen) =>
        best === undefined ||
        distance(kitchen) < distance(best) ||
        (distance(kitchen) === distance(best) && kitchen.lengthMm > best.lengthMm)
          ? kitchen
          : best,
      undefined,
    );
}

/** Cover of the series, then its straight and corner kitchen of about 3 m (when the series has them). */
async function readGallery(series: Series): Promise<Photo[]> {
  const html: string = await fetchText(`${SOURCE_URL}${series.sourceSlug}/?limit=2000`);
  const kitchens: Kitchen[] = [...html.matchAll(ITEM_PATTERN)].map(toKitchen);
  const picked: Kitchen[] = [
    pickClosestToTarget(kitchens.filter((kitchen: Kitchen) => !kitchen.isCorner)),
    pickClosestToTarget(kitchens.filter((kitchen: Kitchen) => kitchen.isCorner)),
  ].filter((kitchen): kitchen is Kitchen => kitchen !== undefined);
  return [
    { url: series.coverUrl, alt: series.name },
    ...picked.map((kitchen: Kitchen) => ({ url: kitchen.imageUrl, alt: kitchen.name })),
  ];
}

async function saveImage(params: {
  entityType: EntityType;
  entityId: string;
  photo: Photo;
  sortOrder: number;
}): Promise<void> {
  const { entityType, entityId, photo, sortOrder } = params;
  const image: ProcessedImage = await fetchPhoto(photo.url);
  const key = `${entityType === 'room' ? 'rooms' : 'collections'}/${entityId}/${randomUUID()}.webp`;
  const target: string = path.join(UPLOADS_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, image.main);
  await writeFile(path.join(UPLOADS_DIR, getThumbnailKey(key)), image.thumbnail);
  await sql`insert into media_image (entity_type, entity_id, key, alt, width, height, sort_order)
    values (${entityType}, ${entityId}, ${key}, ${photo.alt}, ${image.width}, ${image.height}, ${sortOrder})`;
}

/** Creates the room (or turns the existing one into a consultation-only room) and returns its id. */
async function saveRoom(cover: Photo): Promise<string | undefined> {
  const [existing] = await sql`select id, is_consultation_only from room where name = ${ROOM_NAME}`;
  console.log(`room "${ROOM_NAME}": ${existing ? 'exists' : 'new'}, consultation-only`);
  if (!isApply) {
    return existing?.id;
  }
  if (existing) {
    await sql`update room set is_consultation_only = true where id = ${existing.id}`;
    return existing.id;
  }
  const [{ next }] = await sql`select coalesce(max(sort_order), -1) + 1 as next from room`;
  const [row] = await sql`insert into room (name, seo_title, seo_description, sort_order, is_consultation_only)
    values (${ROOM_NAME}, ${ROOM_SEO_TITLE}, ${ROOM_SEO_DESCRIPTION}, ${next}, true) returning id`;
  await saveImage({ entityType: 'room', entityId: row.id, photo: cover, sortOrder: 0 });
  return row.id;
}

/** Creates the collection when it is new and returns its id with the number of photos it already has. */
async function saveCollection(series: Series, sortOrder: number): Promise<{ id?: string; photoCount: number }> {
  const [existing] = await sql`select c.id, (select count(*)::int from media_image m
      where m.entity_type = 'collection' and m.entity_id = c.id) as photo_count
    from collection c where c.slug = ${series.slug}`;
  if (existing || !isApply) {
    return { id: existing?.id, photoCount: existing?.photo_count ?? 0 };
  }
  const seoTitle = `Кухни ${series.name} — мебель BRW`;
  const [row] = await sql`insert into collection (slug, name, seo_title, sort_order)
    values (${series.slug}, ${series.name}, ${seoTitle}, ${sortOrder}) returning id`;
  return { id: row.id, photoCount: 0 };
}

async function importSeries(params: { series: Series; roomId?: string; index: number; sortOrder: number }) {
  const { series, roomId, index, sortOrder } = params;
  const gallery: Photo[] = await readGallery(series);
  const { id, photoCount } = await saveCollection(series, sortOrder);
  const missing: Photo[] = gallery.slice(photoCount);
  console.log(`${series.slug} "${series.name}": adds ${missing.map((photo) => photo.alt).join(', ') || 'nothing'}`);
  if (!isApply || id === undefined || roomId === undefined) {
    return;
  }
  for (const [offset, photo] of missing.entries()) {
    await saveImage({ entityType: 'collection', entityId: id, photo, sortOrder: photoCount + offset });
  }
  await sql`insert into room_collection (room_id, collection_id, sort_order) values (${roomId}, ${id}, ${index})
    on conflict (room_id, collection_id) do update set sort_order = excluded.sort_order`;
}

async function run(): Promise<void> {
  const seriesList: Series[] = await readSeries();
  console.log(`${isApply ? 'APPLY' : 'DRY RUN'}: found ${seriesList.length} series`);
  const roomCover: Series | undefined = seriesList.find((series: Series) => series.name === ROOM_COVER_SERIES);
  if (!roomCover) {
    throw new Error(`Series ${ROOM_COVER_SERIES} not found`);
  }
  const roomId: string | undefined = await saveRoom({ url: roomCover.coverUrl, alt: ROOM_NAME });
  const [{ next }] = await sql`select coalesce(max(sort_order), -1) + 1 as next from collection`;
  for (const [index, series] of seriesList.entries()) {
    await importSeries({ series, roomId, index, sortOrder: next + index });
  }
}

try {
  await run();
} finally {
  await sql.end();
}
