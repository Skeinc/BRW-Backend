import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { S3_CLIENT } from './s3-client.constant.js';
import type { UploadObjectInput } from './storage.types.js';

const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Thin wrapper over the S3 client for the single media bucket.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(S3_CLIENT)
    private readonly client: S3Client,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.bucket = configService.getOrThrow('S3_BUCKET', { infer: true });
    this.publicBaseUrl = configService.getOrThrow('S3_PUBLIC_URL', { infer: true }).replace(/\/+$/, '');
  }

  /**
   * Uploads an object and returns its public URL.
   */
  async uploadObject({
    key,
    body,
    contentType,
    cacheControl = DEFAULT_CACHE_CONTROL,
  }: UploadObjectInput): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    });
    await this.client.send(command);
    return this.getPublicUrl(key);
  }

  /**
   * Deletes an object. S3 treats a missing key as success.
   */
  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
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
   * Returns true when the bucket exists and the credentials can access it (HeadBucket).
   */
  async isBucketReachable(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (err) {
      this.logger.warn(`Bucket check failed: ${err instanceof Error ? err.name : 'unknown error'}`);
      return false;
    }
  }
}
