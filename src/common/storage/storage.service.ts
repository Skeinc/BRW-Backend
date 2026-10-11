import { constants } from 'node:fs';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import type { UploadObjectInput } from './storage.types.js';

/**
 * Stores media files on local disk under UPLOADS_DIR; the app serves them at /media.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly rootDir: string;
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.rootDir = path.resolve(configService.getOrThrow('UPLOADS_DIR', { infer: true }));
    this.publicBaseUrl = configService.getOrThrow('PUBLIC_MEDIA_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Writes an object and returns its public URL. Writes to a temp file first so readers never see a partial file.
   */
  async uploadObject({ key, body }: UploadObjectInput): Promise<string> {
    const filePath: string = this.resolveKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, body);
    await rename(tempPath, filePath);
    return this.getPublicUrl(key);
  }

  /**
   * Deletes an object. A missing file counts as success.
   */
  async deleteObject(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  /**
   * Builds the browser-facing URL of an object key.
   */
  getPublicUrl(key: string): string {
    const encodedKey: string = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.publicBaseUrl}/${encodedKey}`;
  }

  /**
   * Returns true when UPLOADS_DIR exists (it is created if missing) and is writable.
   */
  async isWritable(): Promise<boolean> {
    try {
      await mkdir(this.rootDir, { recursive: true });
      await access(this.rootDir, constants.W_OK);
      return true;
    } catch (err) {
      this.logger.warn(`Uploads dir check failed: ${err instanceof Error ? err.name : 'unknown error'}`);
      return false;
    }
  }

  /**
   * Maps a key such as `products/<id>/<uuid>.webp` to a path inside UPLOADS_DIR and rejects keys that escape it.
   */
  private resolveKey(key: string): string {
    const filePath: string = path.resolve(this.rootDir, key);
    if (!filePath.startsWith(this.rootDir + path.sep)) {
      throw new Error('Storage key must point inside the uploads directory');
    }
    return filePath;
  }
}
