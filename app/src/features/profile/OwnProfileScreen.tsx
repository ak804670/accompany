import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { Text } from '@/components/ui/text';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { useAuth, useSession } from '@/features/auth';
import { useTheme, type ThemePreference } from '@/theme';
import { formatRate } from '@/features/home/discovery';
import { getOrDetectLocationName } from '@/features/home/location';
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
  const [locationName, setLocationName] = useState<string | null>(null);
  const name = profile?.displayName?.trim() || 'Your profile';

  useFocusEffect(useCallback(() => {
    let active = true;
    void profileService.rates?.()?.then((value) => {
      if (active) setRates(value);
    }).catch(() => undefined);
    void getOrDetectLocationName().then((loc) => {
      if (active && loc) setLocationName(loc);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []));

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Nav Bar */}
      <View
        className="border-b border-nav-border bg-nav px-lg pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <AppText variant="h2">Profile</AppText>
      </View>
      <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-lg px-lg py-md pb-xl">
      <View className="items-center gap-sm">
        <PersonAvatar userId={user?.id} name={name} size={96} />
        <AppText variant="h3">{name}</AppText>
        {locationName ? (
          <View className="flex-row items-center gap-xs">
            <BrandIcon name="location" size={14} />
            <AppText variant="caption" tone="muted">{locationName}</AppText>
          </View>
        ) : null}
        {profile?.bio ? <AppText variant="bodyM" tone="muted" className="text-center">{profile.bio}</AppText> : null}
        <AppButton variant="outline" onPress={onEdit}>
          <View className="flex-row items-center gap-xs">
            <BrandIcon name="edit" size={16} />
            <Text>Edit profile</Text>
          </View>
        </AppButton>
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
        <View className="flex-row items-center gap-sm">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BrandIcon name="location" size={20} />
          </View>
          <View className="flex-1">
            <AppText variant="label">{locationName || 'Location not set'}</AppText>
            <AppText variant="bodyS" tone="muted">
              {locationName ? 'Active for nearby discovery' : 'Set location in Edit Profile to discover people nearby'}
            </AppText>
          </View>
        </View>
        <AppText variant="bodyS" tone="muted">Nearby discovery uses your location. Other people only see an approximate distance.</AppText>
      </ProfileSection>
      <ProfileSection title="Coins">
        <Pressable accessibilityRole="button" accessibilityLabel="Coin balance" className="min-h-12 flex-row items-center justify-between" onPress={onWallet}>
          <View className="flex-row items-center gap-sm">
            <BrandIcon name="wallet" size={22} />
            <View>
              <AppText variant="label">Wallet</AppText>
              <AppText variant="bodyS" tone="muted">Add, spend, and withdraw coins</AppText>
            </View>
          </View>
          <BrandIcon name="chevron-right" size={18} />
        </Pressable>
      </ProfileSection>
      <ProfileSection title="Privacy and safety">
        <Pressable accessibilityRole="button" accessibilityLabel="Blocked people" className="min-h-12 flex-row items-center justify-between" onPress={onBlocked}>
          <View>
            <AppText variant="label">Blocked people</AppText>
            <AppText variant="bodyS" tone="muted">Manage blocked people</AppText>
          </View>
          <BrandIcon name="chevron-right" size={18} />
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
    </View>
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
