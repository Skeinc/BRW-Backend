import { boolean, index, integer, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { collection } from './collection.js';
import { room } from './room.js';

/** Ready-made solution: a set of products of one collection for one room, sold at its own price. */
export const solution = pgTable(
  'solution',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => room.id, { onDelete: 'restrict' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('solution_room_collection_idx').on(table.roomId, table.collectionId)],
);
