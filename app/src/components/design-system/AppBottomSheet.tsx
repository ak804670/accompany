import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';

type AppBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: ReactNode;
};

export function AppBottomSheet({ open, onOpenChange, title, children }: AppBottomSheetProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={() => onOpenChange(false)}>
        <Pressable className="gap-md rounded-t-lg bg-card px-md py-lg" onPress={() => undefined}>
          <View className="gap-sm">
            {title ? <AppText variant="h3">{title}</AppText> : null}
            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
