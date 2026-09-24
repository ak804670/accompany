import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { profileImageConfig } from '@/services/media/image-config';

export type ProcessedImage = {
  bytes: Uint8Array;
  contentType: 'image/jpeg';
  uri: string;
};

type ImageLimits = typeof profileImageConfig;

async function render(uri: string, width: number | null, quality: number) {
  const actions = width ? [{ resize: { width } }] : [];
  const image = await manipulateAsync(uri, actions, {
    compress: quality,
    format: SaveFormat.JPEG,
  });
  const bytes = new Uint8Array(await new File(image.uri).arrayBuffer());
  return { bytes, uri: image.uri, width: image.width, height: image.height };
}

function fittedWidth(width: number, height: number, limits: ImageLimits): number | null {
  const scale = Math.min(limits.maxWidth / width, limits.maxHeight / height, 1);
  if (scale >= 1) {
    return null;
  }
  return Math.max(1, Math.round(width * scale));
}

export async function processImage(uri: string, limits: ImageLimits = profileImageConfig): Promise<ProcessedImage> {
  const oriented = await render(uri, null, 1);
  let width = fittedWidth(oriented.width, oriented.height, limits);
  let quality = limits.initialQuality;
  let current = await render(uri, width, quality);

  while (current.bytes.byteLength > limits.maxSizeBytes && (quality > limits.minQuality || (width ?? oriented.width) > 640)) {
    if (quality > limits.minQuality) {
      quality = Math.max(limits.minQuality, Math.round((quality - 0.05) * 100) / 100);
    } else {
      width = Math.max(640, Math.round((width ?? oriented.width) * 0.75));
    }
    current = await render(uri, width, quality);
  }

  if (!current.bytes.byteLength || current.bytes[0] !== 0xff) {
    throw new Error('We couldn\'t add that photo. Try another one.');
  }

  return { bytes: current.bytes, contentType: 'image/jpeg', uri: current.uri };
}
