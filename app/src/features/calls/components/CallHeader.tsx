import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { formatDuration } from '@/features/calls/call-presentation';

export type CallHeaderProps = {
  name: string;
  status: string;
  durationSeconds: number;
  rate?: number | null;
  video?: boolean;
};

export function CallHeader({ name, status, durationSeconds, rate, video = false }: CallHeaderProps) {
  const insets = useSafeAreaInsets();
  const isConnected = status === 'CONNECTED';

  return (
    <View
      className="absolute left-0 right-0 z-30 items-center gap-1.5 px-md"
      style={{ top: insets.top + 8 }}
      pointerEvents="box-none"
    >
      <AppText
        variant="h2"
        className={`font-bold drop-shadow-md ${video ? 'text-white' : 'text-foreground'}`}
        numberOfLines={1}
      >
        {name}
      </AppText>

      <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur-md">
        {isConnected ? (
          <>
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
            <AppText variant="caption" className="font-semibold text-white">
              {formatDuration(durationSeconds)}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" className="font-medium text-white/80">
            {status === 'RINGING' ? 'Ringing...' : status === 'CONNECTING' ? 'Connecting...' : status}
          </AppText>
        )}

        {rate ? (
          <View className="flex-row items-center gap-1 border-l border-white/20 pl-2">
            <BrandIcon name="coins" size={12} />
            <AppText variant="caption" className="font-semibold text-amber-300">
              {rate}/min
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
