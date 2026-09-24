import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StoredObject = {
  storageKey: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export interface MediaStorage {
  save(userId: string, mediaId: string, bytes: Buffer): Promise<StoredObject>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}

const types = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export function detectImage(bytes: Buffer): keyof typeof types | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

export class LocalMediaStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  async save(userId: string, mediaId: string, bytes: Buffer): Promise<StoredObject> {
    const kind = detectImage(bytes);
    if (!kind) {
      throw new Error('unsupported');
    }
    const storageKey = path.posix.join(userId, `${mediaId}.${kind === 'jpeg' ? 'jpg' : kind}`);
    const full = path.join(this.root, storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return { storageKey, contentType: types[kind] };
  }

  read(storageKey: string): Promise<Buffer> {
    return readFile(path.join(this.root, storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    await rm(path.join(this.root, storageKey), { force: true });
  }
}
