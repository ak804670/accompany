import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { OnlinePersonCard } from '@/components/home/OnlinePersonCard';
import { nextDeckIndex, shouldCompleteSwipe } from '@/features/home/discovery';
import type { OnlinePerson } from '@/features/home/people.service';

type DiscoveryDeckProps = {
  people: OnlinePerson[];
  index: number;
  hasMore: boolean;
  onIndex: (index: number) => void;
  onOpen: (userId: string) => void;
  onAdjustFilters?: () => void;
};

export function DiscoveryDeck({ people, index, hasMore, onIndex, onOpen, onAdjustFilters }: DiscoveryDeckProps) {
  const x0 = useSharedValue(0);
  const x1 = useSharedValue(0);
  const topSlot = useSharedValue(0);
  const busy = useSharedValue(false);
  const [front, setFront] = useState<0 | 1>(0);
  const indexRef = useRef(index);
  const lengthRef = useRef(people.length);
  const hasMoreRef = useRef(hasMore);
  const frontRef = useRef<0 | 1>(0);
  indexRef.current = index;
  lengthRef.current = people.length;
  hasMoreRef.current = hasMore;
  frontRef.current = front;

  const current = people[index];
  const upcoming = people.length > 0 ? people[nextDeckIndex(index, people.length, hasMore)] : undefined;
  const showUpcoming = Boolean(upcoming && upcoming.userId !== current?.userId);

  function finish(nextIndex: number) {
    if (nextIndex === indexRef.current) {
      busy.value = false;
      return;
    }
    indexRef.current = nextIndex;
    const staying = (frontRef.current === 0 ? 1 : 0) as 0 | 1;
    frontRef.current = staying;
    topSlot.value = staying;
    setFront(staying);
    onIndex(nextIndex);
  }

  useEffect(() => {
    const back = front === 0 ? x1 : x0;
    back.value = 0;
    busy.value = false;
  }, [front, x0, x1, busy]);

  function settle(distance: number) {
    const active = frontRef.current === 0 ? x0 : x1;
    if (!shouldCompleteSwipe(distance)) {
      active.value = withSpring(0);
      busy.value = false;
      return;
    }
    const nextIndex = nextDeckIndex(indexRef.current, lengthRef.current, hasMoreRef.current);
    if (nextIndex === indexRef.current) {
      active.value = withSpring(0);
      busy.value = false;
      return;
    }
    const direction = distance > 0 ? 1 : -1;
    active.value = withSpring(direction * 640, { damping: 22, stiffness: 240 }, (finished) => {
      if (!finished) return;
      runOnJS(finish)(nextIndex);
    });
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      if (busy.value) return;
      if (topSlot.value === 0) x0.value = event.translationX;
      else x1.value = event.translationX;
    })
    .onEnd((event) => {
      if (busy.value) return;
      busy.value = true;
      runOnJS(settle)(event.translationX);
    });

  if (!current) {
    return (
      <View className="flex-1 justify-center gap-sm">
        <AppText variant="h3">No one new to show right now.</AppText>
        <AppText variant="bodyM" tone="muted">We'll let you know when more people are available.</AppText>
        {onAdjustFilters ? <AppButton variant="outline" onPress={onAdjustFilters}>Adjust filters</AppButton> : null}
      </View>
    );
  }

  const slotPeople: Array<OnlinePerson | undefined> = front === 0
    ? [current, showUpcoming ? upcoming : undefined]
    : [showUpcoming ? upcoming : undefined, current];

  return (
    <View className="min-h-0 flex-1">
      <Slot person={slotPeople[0]} translateX={x0} front={front === 0} gesture={pan} onOpen={() => onOpen(current.userId)} />
      <Slot person={slotPeople[1]} translateX={x1} front={front === 1} gesture={pan} onOpen={() => onOpen(current.userId)} />
    </View>
  );
}

function Slot({ person, translateX, front, gesture, onOpen }: {
  person?: OnlinePerson;
  translateX: SharedValue<number>;
  front: boolean;
  gesture: ReturnType<typeof Gesture.Pan>;
  onOpen: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    transform: front
      ? [{ translateX: translateX.value }, { rotate: `${translateX.value / 28}deg` }]
      : [{ scale: 0.97 }, { translateY: 12 }],
  }));
  if (!person) return null;
  const card = (
    <Animated.View pointerEvents={front ? 'auto' : 'none'} className="absolute inset-0" style={[{ zIndex: front ? 2 : 1 }, style]}>
      <OnlinePersonCard key={person.userId} person={person} onPress={onOpen} />
    </Animated.View>
  );
  if (!front) return card;
  return <GestureDetector gesture={gesture}>{card}</GestureDetector>;
}
