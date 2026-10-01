import { preferenceKeys, preferencesStorage } from '@/services/storage';

export type LocationResult =
  | { ok: true; latitude: number; longitude: number; placeName?: string | null }
  | { ok: false; message: string };

export function formatAddress(address?: {
  city?: string | null;
  district?: string | null;
  subregion?: string | null;
  region?: string | null;
  country?: string | null;
} | null): string | null {
  if (!address) return null;
  const primary = address.city || address.district || address.subregion;
  const parts = [primary, address.region].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : address.country ?? null;
}

export async function captureLocation(): Promise<LocationResult> {
  try {
    const Location = await import('expo-location');
    const current = await Location.getForegroundPermissionsAsync();
    const permission = current.granted ? current : await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: 'Location is off. Nearby people stay hidden until you allow it.' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let placeName: string | null = null;
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (addresses.length > 0) {
        placeName = formatAddress(addresses[0]);
        if (placeName) {
          void preferencesStorage.set(preferenceKeys.locationName, placeName);
        }
      }
    } catch {
      // Reverse geocode is best effort
    }
    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      placeName,
    };
  } catch {
    return { ok: false, message: 'Location is temporarily unavailable.' };
  }
}

export async function getOrDetectLocationName(): Promise<string | null> {
  const saved = await preferencesStorage.get(preferenceKeys.locationName);
  if (saved) return saved;
  try {
    const Location = await import('expo-location');
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.granted) {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (addresses.length > 0) {
        const placeName = formatAddress(addresses[0]);
        if (placeName) {
          void preferencesStorage.set(preferenceKeys.locationName, placeName);
          return placeName;
        }
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

