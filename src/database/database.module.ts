import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE } from './drizzle.constant.js';
import type { DrizzleDatabase } from './drizzle.types.js';
import { schema } from './schema.js';

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DrizzleDatabase => {
        const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
        const client = postgres(databaseUrl);
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
