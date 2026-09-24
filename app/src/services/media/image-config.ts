function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const profileImageConfig = {
  maxWidth: numberFromEnv('EXPO_PUBLIC_PROFILE_IMAGE_MAX_WIDTH', 2048),
  maxHeight: numberFromEnv('EXPO_PUBLIC_PROFILE_IMAGE_MAX_HEIGHT', 2048),
  maxSizeBytes: numberFromEnv('EXPO_PUBLIC_PROFILE_IMAGE_MAX_SIZE_BYTES', 2_097_152),
  initialQuality: numberFromEnv('EXPO_PUBLIC_PROFILE_IMAGE_INITIAL_QUALITY', 0.9),
  minQuality: numberFromEnv('EXPO_PUBLIC_PROFILE_IMAGE_MIN_QUALITY', 0.7),
  maxPhotos: numberFromEnv('EXPO_PUBLIC_MAX_PROFILE_PHOTOS', 10),
};
