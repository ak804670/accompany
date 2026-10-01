import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomSheet } from '@/components/design-system/AppBottomSheet';
import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandLogo } from '@/components/design-system/BrandLogo';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { Text } from '@/components/ui/text';
import { DiscoveryDeck } from '@/components/home/DiscoveryDeck';
import { PersonListView } from '@/components/home/PersonListView';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { coinRepository, subscribeWallet } from '@/database/repositories/coinRepository';
import { useSession } from '@/features/auth';
import { DISCOVERY_RADII_KM, shouldShowDiscoveryLoader } from '@/features/home/discovery';
import { captureLocation } from '@/features/home/location';
import { onDiscoveryRefresh } from '@/features/home/discovery-refresh';
import { peopleService } from '@/features/home/people.service';
import { useDiscoveryDeck } from '@/features/home/useDiscoveryDeck';
import { useProfile } from '@/features/profile/hooks/useProfile';

type HomeScreenProps = {
  onOpenPerson: (userId: string) => void;
  onOpenWallet?: () => void;
};

export function HomeScreen({ onOpenPerson, onOpenWallet }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { profile } = useProfile();
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'swipe' | 'list'>('list');
  const [coins, setCoins] = useState<number | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const { people, index, setIndex, hasMore, loading, error, retry, refresh } = useDiscoveryDeck(distanceKm, interestIds);

  useEffect(() => onDiscoveryRefresh(() => { void refresh(); }), [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let active = true;
    const pull = () => {
      void coinRepository.getSummary(userId).then((summary) => {
        if (active && summary) setCoins(summary.availableCoins);
      });
    };
    pull();
    const unsubscribe = subscribeWallet(pull);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.id]);

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

  const activeFiltersCount = (distanceKm !== null ? 1 : 0) + interestIds.length;

  return (
    <View className="flex-1 bg-background">
      {/* Top Header Nav Bar with Company Logo & Coins Count */}
      <View
        className="border-b border-nav-border bg-nav px-lg pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <BrandLogo size="sm" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Wallet: ${coins !== null ? coins : 0} coins`}
            onPress={onOpenWallet}
            className="flex-row items-center gap-1.5 rounded-full border border-primary-lighter/40 bg-card/90 px-3 py-1.5 active:opacity-75"
          >
            <BrandIcon name="coins" size={16} />
            <AppText variant="label" className="font-semibold text-foreground">
              {coins !== null ? coins.toLocaleString() : '0'}
            </AppText>
          </Pressable>
        </View>
      </View>

      <View className="flex-1 px-lg">
        {/* Sub-bar below Nav Bar: View Switcher & Shifted Filter Button */}
        <View className="flex-row items-center justify-between py-2">
        {/* View Switcher: Cards vs List */}
        <View className="flex-row items-center rounded-full border border-border bg-muted/40 p-0.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cards view"
            onPress={() => setViewMode('swipe')}
            className={`rounded-full px-3 py-1 ${
              viewMode === 'swipe' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <AppText
              variant="caption"
              className={`font-semibold ${
                viewMode === 'swipe' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Cards
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="List view"
            onPress={() => setViewMode('list')}
            className={`rounded-full px-3 py-1 ${
              viewMode === 'list' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <AppText
              variant="caption"
              className={`font-semibold ${
                viewMode === 'list' ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              List
            </AppText>
          </Pressable>
        </View>

        {/* Filter Button */}
        <AppButton variant="outline" size="sm" onPress={() => setFiltersOpen(true)}>
          <View className="flex-row items-center gap-xs">
            <BrandIcon name="filter" size={14} />
            <Text>Filter{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</Text>
          </View>
        </AppButton>
      </View>

      {locationNote ? <AppText className="mt-xs" variant="caption" tone="warning">{locationNote}</AppText> : null}
      {shouldShowDiscoveryLoader(people.length, loading) ? (
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
      ) : viewMode === 'swipe' ? (
        <View className="mt-xs min-h-0 flex-1">
          <DiscoveryDeck people={people} index={index} hasMore={hasMore} filtered={distanceKm !== null || interestIds.length > 0} onIndex={setIndex} onOpen={onOpenPerson} onAdjustFilters={() => setFiltersOpen(true)} />
        </View>
      ) : (
        <View className="mt-xs min-h-0 flex-1">
          <PersonListView people={people} filtered={distanceKm !== null || interestIds.length > 0} onOpen={onOpenPerson} onAdjustFilters={() => setFiltersOpen(true)} />
        </View>
      )}
      </View>
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
