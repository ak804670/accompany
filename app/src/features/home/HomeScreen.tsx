import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomSheet } from '@/components/design-system/AppBottomSheet';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { Text } from '@/components/ui/text';
import { DiscoveryDeck } from '@/components/home/DiscoveryDeck';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { DISCOVERY_RADII_KM } from '@/features/home/discovery';
import { captureLocation } from '@/features/home/location';
import { onDiscoveryRefresh } from '@/features/home/discovery-refresh';
import { peopleService } from '@/features/home/people.service';
import { useDiscoveryDeck } from '@/features/home/useDiscoveryDeck';
import { useProfile } from '@/features/profile/hooks/useProfile';
type HomeScreenProps = {
  onOpenPerson: (userId: string) => void;
};

export function HomeScreen({ onOpenPerson }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const { people, index, setIndex, hasMore, loading, error, retry, refresh } = useDiscoveryDeck(distanceKm, interestIds);

  useEffect(() => onDiscoveryRefresh(() => { void refresh(); }), [refresh]);

  async function enableNearby(radius: number) {
    const location = await captureLocation();
    if (!location.ok) {
      setLocationNote(location.message);
      setDistanceKm(null);
      return;
    }
    setLocationNote(null);
    await peopleService.saveLocation(location.latitude, location.longitude, true);
    setDistanceKm(radius);
    setFiltersOpen(false);
  }

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <AppText variant="h2">Home</AppText>
          <AppText variant="bodyM" tone="muted" className="mt-xs">People available now</AppText>
        </View>
        <AppButton variant="outline" onPress={() => setFiltersOpen(true)}>
          <View className="flex-row items-center gap-xs">
            <BrandIcon name="filter" size={16} />
            <Text>Filter</Text>
          </View>
        </AppButton>
      </View>
      {locationNote ? <AppText className="mt-sm" variant="caption" tone="warning">{locationNote}</AppText> : null}
      {loading ? (
        <View className="mt-md gap-sm">
          <View className="h-72 rounded-md bg-muted" />
          <View className="h-6 w-32 rounded-sm bg-muted" />
          <View className="h-4 w-24 rounded-sm bg-muted" />
          <AppText variant="caption" tone="muted">Loading people...</AppText>
        </View>
      ) : error ? (
        <View className="mt-xl flex-1 justify-center">
          <IllustratedState name={illustrationForError(error)} title="Something went wrong." body={error}>
            <AppButton variant="outline" onPress={retry}>Try again</AppButton>
          </IllustratedState>
        </View>
      ) : (
        <View className="mt-md min-h-0 flex-1">
          <DiscoveryDeck people={people} index={index} hasMore={hasMore} filtered={distanceKm !== null || interestIds.length > 0} onIndex={setIndex} onOpen={onOpenPerson} onAdjustFilters={() => setFiltersOpen(true)} />
        </View>
      )}
      <AppBottomSheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filter">
        <AppText variant="label">Distance</AppText>
        <View className="flex-row flex-wrap gap-sm">
          <Pressable className={`rounded-full border px-md py-sm ${distanceKm === null ? 'border-primary bg-primary' : 'border-border'}`} onPress={() => { setDistanceKm(null); setFiltersOpen(false); }}>
            <AppText variant="bodyS" className={distanceKm === null ? 'text-primary-foreground' : ''}>Any distance</AppText>
          </Pressable>
          {DISCOVERY_RADII_KM.map((radius) => (
            <Pressable key={radius} className={`rounded-full border px-md py-sm ${distanceKm === radius ? 'border-primary bg-primary' : 'border-border'}`} onPress={() => void enableNearby(radius)}>
              <AppText variant="bodyS" className={distanceKm === radius ? 'text-primary-foreground' : ''}>Within {radius} km</AppText>
            </Pressable>
          ))}
        </View>
        <AppText variant="label">Interests</AppText>
        <View className="flex-row flex-wrap gap-sm">
          {(profile?.interests ?? []).map((interest) => {
            const active = interestIds.includes(interest.id);
            return (
              <Pressable
                key={interest.id}
                className={`rounded-full border px-md py-sm ${active ? 'border-primary bg-primary' : 'border-border'}`}
                onPress={() => setInterestIds((current) => active ? current.filter((id) => id !== interest.id) : [...current, interest.id])}
              >
                <AppText variant="bodyS" className={active ? 'text-primary-foreground' : ''}>{interest.name}</AppText>
              </Pressable>
            );
          })}
        </View>
        <AppButton onPress={() => setFiltersOpen(false)}>Apply</AppButton>
      </AppBottomSheet>
    </View>
  );
}
