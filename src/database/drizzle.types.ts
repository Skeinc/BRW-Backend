import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { schema } from './schema.js';

export type DrizzleDatabase = PostgresJsDatabase<typeof schema>;
