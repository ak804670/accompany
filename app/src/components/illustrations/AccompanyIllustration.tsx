import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

import { illustrationRegistry, type IllustrationName } from '@/assets/illustrations/illustrationRegistry';
import { fittedSize, tintIllustration } from '@/assets/illustrations/tint';
import { palette } from '@/theme/tokens';

export type IllustrationMotion = 'none' | 'enter' | 'float' | 'pulse';

type AccompanyIllustrationProps = {
  name: IllustrationName;
  size?: number;
  motion?: IllustrationMotion;
};

export function AccompanyIllustration({ name, size = 180, motion = 'none' }: AccompanyIllustrationProps) {
  const { colorScheme } = useColorScheme();
  const accent = palette[colorScheme === 'dark' ? 'dark' : 'light'].primary;
  const source = illustrationRegistry[name];
  const fitted = fittedSize(source, size);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || motion === 'none') {
      progress.value = 1;
      return;
    }
    if (motion === 'enter') {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 420 });
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: motion === 'float' ? 3200 : 1600 }), -1, true);
  }, [motion, progress, reduceMotion]);

  const animated = useAnimatedStyle(() => {
    if (motion === 'float' && !reduceMotion) return { transform: [{ translateY: -3 + progress.value * 6 }] };
    if (motion === 'pulse' && !reduceMotion) return { opacity: 0.72 + progress.value * 0.28 };
    if (motion === 'enter') return { opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 6 }] };
    return {};
  });

  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={animated}>
      <View>
        <SvgXml xml={tintIllustration(source, accent)} width={fitted.width} height={fitted.height} />
      </View>
    </Animated.View>
  );
}
