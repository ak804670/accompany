import { ChevronRight } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { useAuth, useSession } from '@/features/auth';
import { useTheme, type ThemePreference } from '@/theme';
import { formatRate } from '@/features/home/discovery';
import { profileService } from '@/features/profile/services/profile.service';
import { useProfile } from '@/features/profile/hooks/useProfile';

type OwnProfileScreenProps = {
  onEdit: () => void;
  onBlocked: () => void;
  onWallet: () => void;
};

export function OwnProfileScreen({ onEdit, onBlocked, onWallet }: OwnProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { user } = useSession();
  const { logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const [rates, setRates] = useState<{ chat: number | null; audio: number | null; video: number | null } | null>(null);
  const name = profile?.displayName?.trim() || 'Your profile';

  useFocusEffect(useCallback(() => {
    let active = true;
    void profileService.rates().then((value) => {
      if (active) setRates(value);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-lg px-lg pb-xl" style={{ paddingTop: insets.top + 16 }}>
      <AppText variant="h2">Profile</AppText>
      <View className="items-center gap-sm">
        <PersonAvatar userId={user?.id} name={name} size={96} />
        <AppText variant="h3">{name}</AppText>
        {profile?.bio ? <AppText variant="bodyM" tone="muted" className="text-center">{profile.bio}</AppText> : null}
        <AppButton variant="outline" onPress={onEdit}>Edit profile</AppButton>
      </View>
      <ProfileSection title="Profile information">
        <Info label="Name" value={name} />
        <Info label="Bio" value={profile?.bio?.trim() || 'Add a short introduction'} />
        <AppText variant="caption" tone="muted">Interests</AppText>
        <View className="flex-row flex-wrap gap-xs">
          {(profile?.interests ?? []).length === 0 ? <AppText variant="bodyS" tone="muted">None yet</AppText> : profile?.interests.map((interest) => (
            <View key={interest.id} className="rounded-full bg-muted px-sm py-xs">
              <AppText variant="caption">{interest.name}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" tone="muted">{profile?.media.length ?? 0} of 10 photos</AppText>
      </ProfileSection>
      <ProfileSection title="Communication">
        <Info label="Audio" value={formatRate(rates?.audio ?? null, 'min')} />
        <Info label="Video" value={formatRate(rates?.video ?? null, 'min')} />
      </ProfileSection>
      <ProfileSection title="Location">
        <AppText variant="bodyS" tone="muted">Nearby discovery uses your location. Other people only see an approximate distance.</AppText>
      </ProfileSection>
      <ProfileSection title="Coins">
        <Pressable accessibilityRole="button" accessibilityLabel="Coin balance" className="min-h-12 flex-row items-center justify-between" onPress={onWallet}>
          <View>
            <AppText variant="label">Wallet</AppText>
            <AppText variant="bodyS" tone="muted">Add, spend, and withdraw coins</AppText>
          </View>
          <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
        </Pressable>
      </ProfileSection>
      <ProfileSection title="Privacy and safety">
        <Pressable accessibilityRole="button" accessibilityLabel="Blocked people" className="min-h-12 flex-row items-center justify-between" onPress={onBlocked}>
          <View>
            <AppText variant="label">Blocked people</AppText>
            <AppText variant="bodyS" tone="muted">Manage blocked people</AppText>
          </View>
          <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
        </Pressable>
      </ProfileSection>
      <ProfileSection title="Appearance">
        <AppText variant="bodyS" tone="muted">System follows your device. Light and Dark stay on until you change them.</AppText>
        <View className="flex-row gap-sm">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
            <AppButton key={option} variant={preference === option ? 'primary' : 'outline'} className="flex-1" onPress={() => setPreference(option)}>
              {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
            </AppButton>
          ))}
        </View>
      </ProfileSection>
      <ProfileSection title="Account">
        <AppButton variant="outline" onPress={() => void logout()}>Log out</AppButton>
      </ProfileSection>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-xs">
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="bodyM">{value}</AppText>
    </View>
  );
}
