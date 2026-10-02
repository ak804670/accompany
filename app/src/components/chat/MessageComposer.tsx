import { TextInput, View } from 'react-native';
import { Send, Smile } from 'lucide-react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { Icon } from '@/components/ui/icon';

type MessageComposerProps = {
  value: string;
  sending: boolean;
  failed: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onOpenMediaPicker: () => void;
};

export function MessageComposer({ value, sending, failed, disabled = false, onChange, onSend, onOpenMediaPicker }: MessageComposerProps) {
  return (
    <View className="gap-xs border-t border-nav-border bg-background px-md pb-sm pt-sm">
      <View className="flex-row items-end gap-xs">
        <AppButton accessibilityLabel="Open emoji and GIF picker" variant="icon" size="md" className="shrink-0" disabled={disabled} onPress={onOpenMediaPicker}>
          <View className="items-center">
            <Icon as={Smile} className="size-5 text-primary" />
            <AppText className="-mt-1 text-[8px] leading-3 text-primary">GIF</AppText>
          </View>
        </AppButton>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          multiline
          scrollEnabled
          textAlignVertical="top"
          placeholder="Type a message"
          accessibilityLabel="Type a message"
          className="min-h-11 max-h-32 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 py-3 text-foreground"
        />
        <AppButton accessibilityLabel="Send" variant="primary" size="icon" className="h-10 w-10 shrink-0 rounded-full" loading={sending} disabled={disabled || !value.trim()} onPress={onSend}>
          <Icon as={Send} className="size-4 text-primary-foreground" />
        </AppButton>
      </View>
      {failed ? (
        <View className="flex-row items-center justify-between">
          <AppText variant="caption" tone="error">Message couldn&apos;t be sent</AppText>
          <AppButton variant="ghost" onPress={onSend}>Retry</AppButton>
        </View>
      ) : null}
    </View>
  );
}
