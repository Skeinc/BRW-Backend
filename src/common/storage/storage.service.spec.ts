import { DeleteObjectCommand, HeadBucketCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment-variables.js';
import { StorageService } from './storage.service.js';

const CONFIG: Record<string, string> = {
  S3_BUCKET: 'brw-media',
  S3_PUBLIC_URL: 'http://localhost:9000/brw-media/',
};

function createService(send: ReturnType<typeof vi.fn>): StorageService {
  const client = { send } as unknown as S3Client;
  const configService = { getOrThrow: (key: string) => CONFIG[key] } as unknown as ConfigService<
    EnvironmentVariables,
    true
  >;
  return new StorageService(client, configService);
}

describe('StorageService', () => {
  it('uploads an object and returns its public URL', async () => {
    const send = vi.fn().mockResolvedValue({});
    const service = createService(send);
    const url = await service.uploadObject({
      key: 'products/p1/photo 1.webp',
      body: Buffer.from('data'),
      contentType: 'image/webp',
    });
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(url).toBe('http://localhost:9000/brw-media/products/p1/photo%201.webp');
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: 'brw-media',
      Key: 'products/p1/photo 1.webp',
      ContentType: 'image/webp',
    });
  });

  it('deletes an object by key', async () => {
    const send = vi.fn().mockResolvedValue({});
    const service = createService(send);
    await service.deleteObject('products/p1/photo.webp');
    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({ Bucket: 'brw-media', Key: 'products/p1/photo.webp' });
  });

  it('builds a public URL without double slashes', () => {
    const service = createService(vi.fn());
    expect(service.getPublicUrl('categories/c1/cover.webp')).toBe(
      'http://localhost:9000/brw-media/categories/c1/cover.webp',
    );
  });

  it('reports the bucket as reachable when HeadBucket succeeds', async () => {
    const send = vi.fn().mockResolvedValue({});
    const service = createService(send);
    await expect(service.isBucketReachable()).resolves.toBe(true);
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
  });

  it('reports the bucket as unreachable when HeadBucket fails', async () => {
    const send = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));
    const service = createService(send);
    await expect(service.isBucketReachable()).resolves.toBe(false);
  });
});
