import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { useAuth, useSession } from '@/features/auth';
import { useProfile } from '@/features/profile/hooks/useProfile';

export function OwnProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { user } = useSession();
  const { logout } = useAuth();
  const name = profile?.displayName?.trim() || 'Your profile';

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
      <AppText variant="h2">Profile</AppText>
      <ProfileHeader name={name} bio={profile?.bio ?? null} userId={user?.id} />
      <View className="mt-xl">
        <ProfileSection title="My photos">
          <AppText variant="bodyS" tone="muted">{profile?.media.length ?? 0} photos</AppText>
        </ProfileSection>
        <ProfileSection title="Preferences">
          <AppText variant="bodyS" tone="muted">{profile?.languagePreferences.join(', ') || 'None yet'}</AppText>
        </ProfileSection>
        <ProfileSection title="Account">
          <AppButton variant="outline" onPress={() => void logout()}>Log out</AppButton>
        </ProfileSection>
        <ProfileSection title="Settings">
          <AppText variant="bodyS" tone="muted">Notifications and privacy stay with your account.</AppText>
        </ProfileSection>
      </View>
    </View>
  );
}
