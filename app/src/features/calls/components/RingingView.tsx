import { Phone, PhoneOff } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { Icon } from '@/components/ui/icon';

export type RingingViewProps = {
  name: string;
  userId?: string | null;
  video: boolean;
  outgoing: boolean;
  rate?: number | null;
  onAnswer: () => void;
  onReject: () => void;
};

export function RingingView({
  name,
  userId,
  video,
  outgoing,
  rate,
  onAnswer,
  onReject,
}: RingingViewProps) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.3, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse2, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [pulse1, pulse2]);

  const callTypeLabel = video ? 'Video Call' : 'Voice Call';

  return (
    <View className="flex-1 items-center justify-between px-lg py-16">
      {/* Top Details */}
      <View className="items-center gap-2 pt-8">
        <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
          <BrandIcon name={video ? 'video-call' : 'call'} size={14} />
          <AppText variant="caption" className="font-semibold text-white/90">
            {outgoing ? `Outgoing ${callTypeLabel}` : `Incoming ${callTypeLabel}`}
          </AppText>
        </View>

        <AppText variant="h1" className="text-center font-bold text-white drop-shadow-md">
          {name}
        </AppText>

        <AppText variant="bodyM" className="text-white/60">
          {outgoing ? 'Calling...' : 'is calling you...'}
        </AppText>

        {rate ? (
          <View className="mt-1 flex-row items-center gap-1 rounded-full bg-amber-500/20 px-3 py-0.5 border border-amber-500/30">
            <BrandIcon name="coins" size={12} />
            <AppText variant="caption" className="font-semibold text-amber-300">
              {rate} coins/min
            </AppText>
          </View>
        ) : null}
      </View>

      {/* Pulsing Avatar Stage */}
      <View className="relative items-center justify-center">
        <Animated.View
          className="absolute h-64 w-64 rounded-full border border-primary/20 bg-primary/5"
          style={{ transform: [{ scale: pulse2 }] }}
        />
        <Animated.View
          className="absolute h-52 w-52 rounded-full border border-primary/30 bg-primary/10"
          style={{ transform: [{ scale: pulse1 }] }}
        />
        <View className="overflow-hidden rounded-full border-4 border-card shadow-2xl">
          <PersonAvatar userId={userId} name={name} size={144} />
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="w-full pb-6">
        {outgoing ? (
          <View className="items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel Call"
              onPress={onReject}
              className="items-center gap-2 active:scale-95"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive shadow-lg shadow-destructive/40">
                <Icon as={PhoneOff} className="size-7 text-white" />
              </View>
              <AppText variant="caption" className="font-medium text-white/80">
                Cancel
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center justify-around px-8">
            {/* Decline */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decline Call"
              onPress={onReject}
              className="items-center gap-2 active:scale-95"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive shadow-lg shadow-destructive/40">
                <Icon as={PhoneOff} className="size-7 text-white" />
              </View>
              <AppText variant="caption" className="font-medium text-white/80">
                Decline
              </AppText>
            </Pressable>

            {/* Accept */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accept Call"
              onPress={onAnswer}
              className="items-center gap-2 active:scale-95"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/40">
                <Icon as={Phone} className="size-7 text-white" />
              </View>
              <AppText variant="caption" className="font-medium text-white/80">
                Accept
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
