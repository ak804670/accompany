import type { ImageSourcePropType } from 'react-native';

/**
 * Lifestyle photographs for the development seed accounts only.
 * Real profiles keep their own uploaded photos. These are Unsplash photos, not generated faces.
 * Ananya photo-1544005313-94ddf0286df2
 * Rohan photo-1506794778202-cad84cf45f1d
 * Meera photo-1531123897727-8f129e1688ce
 * Kabir photo-1507003211169-0a1dd7228f2d
 */
const seedPhotos: Record<string, ImageSourcePropType> = {
  'a1111111-1111-4111-8111-111111111111': require('./demo-profiles/ananya.jpg'),
  'a2222222-2222-4222-8222-222222222222': require('./demo-profiles/rohan.jpg'),
  'a3333333-3333-4333-8333-333333333333': require('./demo-profiles/meera.jpg'),
  'a4444444-4444-4444-8444-444444444444': require('./demo-profiles/kabir.jpg'),
};

export function demoProfilePhoto(userId: string): ImageSourcePropType | undefined {
  return seedPhotos[userId];
}
