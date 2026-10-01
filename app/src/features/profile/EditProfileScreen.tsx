import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppDialog } from '@/components/design-system/AppDialog';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { profileIsDirty, setProfileDirty } from '@/features/profile/profile-guard';

export function EditProfileScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);

  function back() {
    if (profileIsDirty()) {
      setConfirm(true);
      return;
    }
    onBack();
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Nav Bar */}
      <View
        className="border-b border-nav-border bg-nav px-sm pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-xs">
          <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={back} />
          <AppText variant="h3">Edit profile</AppText>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-lg py-md pb-xl" keyboardShouldPersistTaps="handled">
        <ProfileForm onDirtyChange={setProfileDirty} />
      </ScrollView>
      <AppDialog open={confirm} onOpenChange={setConfirm} title="Discard changes?" description="Your profile edits have not been saved.">
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={() => setConfirm(false)}>Keep editing</AppButton>
          <AppButton className="flex-1" onPress={() => { setProfileDirty(false); setConfirm(false); onBack(); }}>Discard</AppButton>
        </View>
      </AppDialog>
    </View>
  );
}
