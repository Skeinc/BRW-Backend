import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { collection } from './collection.js';
import { room } from './room.js';

/** Collection shown in a consultation-only room (kitchens); `sortOrder` is its place in that room. */
export const roomCollection = pgTable(
  'room_collection',
  {
    roomId: uuid('room_id')
      .notNull()
      .references(() => room.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.collectionId] })],
);
