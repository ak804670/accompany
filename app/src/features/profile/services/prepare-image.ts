import { processImage } from '@/services/media/image-processor';

export function prepareProfileImage(uri: string) {
  return processImage(uri);
}
