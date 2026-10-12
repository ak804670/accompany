import { useEffect, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { preferencesStorage, preferenceKeys } from '@/services/storage';

type PermissionModule = {
  requestPrivacyPermissions(): Promise<{ camera: boolean; microphone: boolean; notifications: boolean }>;
};

async function requestPrivacyPermissions(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ...(Number(Platform.Version) >= 33 ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] : []),
    ];
    for (const permission of permissions) {
      if (permission) await PermissionsAndroid.request(permission);
    }
  } else {
    try {
      const native = require('accompany-calls') as { default?: PermissionModule } & PermissionModule;
      await (native.default ?? native).requestPrivacyPermissions();
    } catch {
      // Native permissions are requested again when the corresponding feature is used.
    }
    try {
      const Location = await import('expo-location');
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Location remains optional and can be enabled later.
    }
  }
}

export function FirstLaunchPermissions({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    void preferencesStorage.get(preferenceKeys.privacyPermissionsIntroduced).then((value) => {
      setReady(value === 'true' || Platform.OS === 'web');
    }).catch(() => setReady(true));
  }, []);

  async function continueToApp() {
    setRequesting(true);
    try {
      await requestPrivacyPermissions();
    } finally {
      await preferencesStorage.set(preferenceKeys.privacyPermissionsIntroduced, 'true').catch(() => undefined);
      setRequesting(false);
      setReady(true);
    }
  }

  if (ready) return children;
  return (
    <View className="flex-1 justify-center gap-lg bg-background px-xl">
      <AppText variant="h2">Set up your permissions</AppText>
      <AppText variant="bodyM" tone="muted">
        Accompany uses your camera and microphone for video and voice calls, notifications for calls and messages, and your location to show nearby people. You can change any choice later in Settings.
      </AppText>
      <AppButton onPress={() => void continueToApp()} disabled={requesting}>
        {requesting ? <ActivityIndicator color="white" /> : 'Continue'}
      </AppButton>
    </View>
  );
}
