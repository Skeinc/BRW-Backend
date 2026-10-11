import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { StorageModule } from './common/storage/storage.module.js';
import { validateEnv } from './config/validate-env.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { CollectionsModule } from './modules/collections/collections.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule,
    StorageModule,
    HealthModule,
    AdminAuthModule,
    CategoriesModule,
    CollectionsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
