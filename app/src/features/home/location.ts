export type LocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; message: string };

export async function captureLocation(): Promise<LocationResult> {
  try {
    const Location = await import('expo-location');
    const current = await Location.getForegroundPermissionsAsync();
    const permission = current.granted ? current : await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, message: 'Location is off. Nearby people stay hidden until you allow it.' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return { ok: false, message: 'Location is temporarily unavailable.' };
  }
}
