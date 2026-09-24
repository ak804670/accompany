import type { MediaStorage, StoredObject } from './media-storage.js';
import { detectImage } from './media-storage.js';

export class MemoryMediaStorage implements MediaStorage {
  readonly files = new Map<string, Buffer>();

  async save(userId: string, mediaId: string, bytes: Buffer): Promise<StoredObject> {
    const kind = detectImage(bytes);
    if (!kind) {
      throw new Error('unsupported');
    }
    const storageKey = `${userId}/${mediaId}.${kind === 'jpeg' ? 'jpg' : kind}`;
    this.files.set(storageKey, bytes);
    const contentType = kind === 'jpeg' ? 'image/jpeg' : kind === 'png' ? 'image/png' : 'image/webp';
    return { storageKey, contentType };
  }

  async read(storageKey: string): Promise<Buffer> {
    const bytes = this.files.get(storageKey);
    if (!bytes) {
      throw new Error('missing');
    }
    return bytes;
  }

  async remove(storageKey: string): Promise<void> {
    this.files.delete(storageKey);
  }
}
