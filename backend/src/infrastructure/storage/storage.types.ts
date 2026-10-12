export type StoredObject = {
  storageKey: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  publicUrl?: string;
};

export interface MediaStorage {
  /**
   * Save a user's media file (e.g., profile photo)
   */
  save(
    userId: string,
    mediaId: string,
    bytes: Buffer,
    options?: { folder?: string; contentType?: 'image/jpeg' | 'image/png' | 'image/webp' },
  ): Promise<StoredObject>;

  /**
   * Read raw bytes for an object key
   */
  read(storageKey: string): Promise<Buffer>;

  /**
   * Remove an object by key
   */
  remove(storageKey: string): Promise<void>;

  /**
   * Check if an object exists
   */
  exists?(storageKey: string): Promise<boolean>;

  /**
   * Get public or CDN URL if configured
   */
  getPublicUrl?(storageKey: string): string | null;

}

export const supportedImageTypes = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export type SupportedImageExtension = keyof typeof supportedImageTypes;

export function detectImage(bytes: Buffer): SupportedImageExtension | null {
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

export const StoragePaths = {
  profilePhoto(userId: string, mediaId: string, ext: string): string {
    const normalizedExt = ext === 'jpeg' ? 'jpg' : ext.replace(/^\./, '');
    return `profiles/${userId}/${mediaId}.${normalizedExt}`;
  },
};
