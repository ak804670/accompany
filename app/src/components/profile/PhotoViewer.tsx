import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/design-system/AppText';

export function PhotoViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => setImageSize(null), [uri]);

  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black">
        {uri ? (
          <Pressable className="flex-1 w-full items-center justify-center" accessibilityRole="imagebutton" accessibilityLabel="Close photo viewer" onPress={onClose}>
            <Image
              source={{ uri }}
              resizeMode="contain"
              onLoad={(event) => setImageSize(event.nativeEvent.source)}
              style={{
                width,
                height: imageSize
                  ? Math.min(height, (width * imageSize.height) / imageSize.width)
                  : height,
              }}
            />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Close photo" className="absolute right-5 top-14 rounded-full bg-white/20 px-md py-sm" onPress={onClose}>
          <AppText variant="label" className="text-white">Close</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}
