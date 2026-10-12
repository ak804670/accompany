import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readStorageConfig } from '../../config/storage.js';
import { S3MediaStorage } from './s3-storage.js';
import { StoragePaths } from './storage.types.js';

test('S3 configuration supports Cloudflare R2', () => {
  const config = readStorageConfig({
    STORAGE_DRIVER: 'Cloudflare R2',
    AWS_S3_BUCKET: 'accompany-media',
    AWS_REGION: 'auto',
    AWS_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  });

  assert.equal(config.bucket, 'accompany-media');
  assert.equal(config.region, 'auto');
  assert.equal(config.forcePathStyle, true);
});

test('S3MediaStorage resolves profile keys and CDN URLs', () => {
  const storage = new S3MediaStorage({
    bucket: 'accompany-media',
    region: 'us-east-1',
    forcePathStyle: false,
    prefix: 'v1/',
    publicUrl: 'https://cdn.accompany.app',
  });

  const key = StoragePaths.profilePhoto('user-1', 'photo-1', 'jpeg');
  assert.equal(key, 'profiles/user-1/photo-1.jpg');
  assert.equal(storage.resolveS3Key(key), 'v1/profiles/user-1/photo-1.jpg');
  assert.equal(storage.getPublicUrl(key), 'https://cdn.accompany.app/profiles/user-1/photo-1.jpg');
});
