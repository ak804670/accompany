import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';

export type AudioCallViewProps = {
  name: string;
  userId?: string | null;
  isSpeaking?: boolean;
};

export function AudioCallView({ name, userId, isSpeaking = false }: AudioCallViewProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rippleAnim, {
          toValue: 1.25,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(rippleAnim, {
          toValue: 0.85,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    rippleLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
    };
  }, [pulseAnim, rippleAnim]);

  return (
    <View className="flex-1 items-center justify-center px-lg">
      {/* Concentric ripple rings */}
      <View className="relative items-center justify-center">
        {/* Outer ambient wave */}
        <Animated.View
          className="absolute h-64 w-64 rounded-full border border-primary/20 bg-primary/5"
          style={{ transform: [{ scale: rippleAnim }] }}
        />

        {/* Inner active wave */}
        <Animated.View
          className="absolute h-52 w-52 rounded-full border border-primary/30 bg-primary/10"
          style={{ transform: [{ scale: pulseAnim }] }}
        />

        {/* Avatar Container */}
        <View className="overflow-hidden rounded-full border-4 border-card shadow-2xl">
          <PersonAvatar userId={userId} name={name} size={144} />
        </View>
      </View>

      {/* Speaking status indicator */}
      <View className="mt-8 flex-row items-center gap-1.5 rounded-full bg-card/80 px-4 py-1.5">
        <View className={`h-2 w-2 rounded-full ${isSpeaking ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
        <AppText variant="bodyS" tone="muted">
          {isSpeaking ? 'Speaking...' : 'Connected'}
        </AppText>
      </View>
    </View>
  );
}
