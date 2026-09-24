import { View } from 'react-native';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/design-system/AppText';

export function MessageBubble({ body, mine, appear }: { body: string; mine: boolean; appear?: boolean }) {
  const bubble = (
    <View
      className={mine ? 'bg-primary' : 'bg-muted'}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '78%',
        marginVertical: 3,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        borderBottomLeftRadius: mine ? 18 : 4,
        borderBottomRightRadius: mine ? 4 : 18,
      }}
    >
      <AppText variant="bodyM" className={mine ? 'text-primary-foreground' : ''}>{body}</AppText>
    </View>
  );

  if (!appear) {
    return bubble;
  }

  return (
    <Animated.View entering={FadeInUp.duration(240).reduceMotion(ReduceMotion.System)}>
      {bubble}
    </Animated.View>
  );
}
