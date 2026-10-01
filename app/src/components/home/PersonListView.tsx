import { FlatList, View } from 'react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { PersonListCard } from '@/components/home/PersonListCard';
import type { OnlinePerson } from '@/features/home/people.service';

type PersonListViewProps = {
  people: OnlinePerson[];
  onOpen: (userId: string) => void;
  onAdjustFilters?: () => void;
  filtered?: boolean;
};

export function PersonListView({
  people,
  onOpen,
  onAdjustFilters,
  filtered = false,
}: PersonListViewProps) {
  if (people.length === 0) {
    return (
      <View className="flex-1 justify-center">
        <IllustratedState
          name={filtered ? 'home-filtered' : 'home-empty'}
          motion={filtered ? 'none' : 'float'}
          title="No one new to show right now."
          body="We'll let you know when more people are available."
        >
          {onAdjustFilters ? (
            <AppButton variant="outline" onPress={onAdjustFilters}>
              Adjust filters
            </AppButton>
          ) : null}
        </IllustratedState>
      </View>
    );
  }

  return (
    <FlatList
      data={people}
      keyExtractor={(item) => item.userId}
      renderItem={({ item }) => (
        <PersonListCard person={item} onPress={() => onOpen(item.userId)} />
      )}
      contentContainerClassName="gap-sm pb-xl"
      showsVerticalScrollIndicator={false}
    />
  );
}

