import { Plus } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';

type MessageComposerProps = {
  value: string;
  sending: boolean;
  failed: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function MessageComposer({ value, sending, failed, disabled = false, onChange, onSend }: MessageComposerProps) {
  return (
    <View className="gap-xs px-md pt-sm">
      <View className="flex-row items-center gap-sm">
        <AppIconButton icon={Plus} accessibilityLabel="Add" />
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          placeholder="Type a message"
          accessibilityLabel="Type a message"
          className="h-12 flex-1 rounded-full border border-input bg-background px-4 text-foreground"
        />
        <AppButton accessibilityLabel="Send" loading={sending} disabled={disabled} onPress={onSend}>Send</AppButton>
      </View>
      {failed ? (
        <View className="flex-row items-center justify-between">
          <AppText variant="caption" tone="error">Message couldn't be sent</AppText>
          <AppButton variant="ghost" onPress={onSend}>Retry</AppButton>
        </View>
      ) : null}
    </View>
  );
}
