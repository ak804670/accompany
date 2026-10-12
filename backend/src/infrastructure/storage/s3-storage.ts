import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

import type { S3StorageConfig } from '../../config/storage.js';
import {
  detectImage,
  StoragePaths,
  supportedImageTypes,
  type MediaStorage,
  type StoredObject,
} from './storage.types.js';

export class S3MediaStorage implements MediaStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicUrl?: string;

  constructor(private readonly config: S3StorageConfig, customClient?: S3Client) {
    this.bucket = config.bucket;
    this.prefix = config.prefix;
    this.publicUrl = config.publicUrl;

    if (customClient) {
      this.client = customClient;
    } else {
      const clientConfig: S3ClientConfig = {
        region: config.region,
        forcePathStyle: config.forcePathStyle,
      };

      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint;
      }

      if (config.accessKeyId && config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        };
      }

      this.client = new S3Client(clientConfig);
    }
  }

  /**
   * Resolves the actual S3 object key inside the bucket (including bucket prefix if configured)
   */
  public resolveS3Key(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, '');
    return this.prefix ? `${this.prefix}${cleanKey}` : cleanKey;
  }

  async save(
    userId: string,
    mediaId: string,
    bytes: Buffer,
    options?: { folder?: string; contentType?: 'image/jpeg' | 'image/png' | 'image/webp' },
  ): Promise<StoredObject> {
    const kind = detectImage(bytes);
    if (!kind) {
      throw new Error('unsupported');
    }

    const contentType = options?.contentType ?? supportedImageTypes[kind];
    const storageKey = StoragePaths.profilePhoto(userId, mediaId, kind);
    const s3Key = this.resolveS3Key(storageKey);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          'user-id': userId,
          'media-id': mediaId,
        },
      }),
    );

    return {
      storageKey,
      contentType,
      publicUrl: this.getPublicUrl(storageKey),
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    const s3Key = this.resolveS3Key(storageKey);

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Empty body returned for S3 key: ${s3Key}`);
      }

      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (err: unknown) {
      // Legacy fallback: if key is "{userId}/{mediaId}.ext" and wasn't found under prefix,
      // check whether it was stored under "profiles/{storageKey}" or vice versa
      if (!storageKey.startsWith('profiles/')) {
        const fallbackKey = this.resolveS3Key(`profiles/${storageKey}`);
        try {
          const fallbackResp = await this.client.send(
            new GetObjectCommand({
              Bucket: this.bucket,
              Key: fallbackKey,
            }),
          );
          if (fallbackResp.Body) {
            const bytes = await fallbackResp.Body.transformToByteArray();
            return Buffer.from(bytes);
          }
        } catch {
          // Ignore fallback error and throw original
        }
      }

      throw err;
    }
  }

  async remove(storageKey: string): Promise<void> {
    const s3Key = this.resolveS3Key(storageKey);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      }),
    );

    // Also remove fallback key if legacy key pattern
    if (!storageKey.startsWith('profiles/')) {
      try {
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: this.resolveS3Key(`profiles/${storageKey}`),
          }),
        );
      } catch {
        // Ignore fallback delete errors
      }
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const s3Key = this.resolveS3Key(storageKey);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, '');
    if (this.publicUrl) {
      return `${this.publicUrl}/${cleanKey}`;
    }

    const s3Key = this.resolveS3Key(storageKey);
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/+$/, '')}/${this.bucket}/${s3Key}`;
    }

    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${s3Key}`;
  }

}
