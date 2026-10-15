import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';

/** Global module that provides the local-disk `StorageService`. */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
