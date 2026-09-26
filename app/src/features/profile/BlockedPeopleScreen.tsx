import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppDialog } from '@/components/design-system/AppDialog';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { refreshDiscovery } from '@/features/home/discovery-refresh';
import { peopleService } from '@/features/home/people.service';

type BlockedPerson = { userId: string; name: string };

export function BlockedPeopleScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<BlockedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BlockedPerson | null>(null);

  function load() {
    setLoading(true);
    peopleService.blocks().then((value) => {
      setPeople(value);
      setError(null);
    }).catch(() => setError("Couldn't load blocked people")).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function unblock() {
    if (!selected) return;
    await peopleService.unblock(selected.userId);
    setPeople((current) => current.filter((person) => person.userId !== selected.userId));
    setSelected(null);
    refreshDiscovery();
  }

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center gap-sm">
        <AppIconButton icon={ChevronLeft} size="lg" accessibilityLabel="Go back" onPress={onBack} />
        <AppText variant="h3">Blocked people</AppText>
      </View>
      {loading ? <AppText className="mt-xl" variant="bodyM" tone="muted">Loading blocked people...</AppText> : null}
      {error ? (
        <View className="mt-xl gap-sm">
          <AppText variant="bodyM">{error}</AppText>
          <AppButton variant="outline" onPress={load}>Try again</AppButton>
        </View>
      ) : null}
      {!loading && !error && people.length === 0 ? (
        <AppText className="mt-xl" variant="bodyM" tone="muted">You haven't blocked anyone.</AppText>
      ) : null}
      <View className="mt-lg gap-md">
        {people.map((person) => (
          <View key={person.userId} className="flex-row items-center gap-md rounded-sm border border-border p-md">
            <PersonAvatar userId={person.userId} name={person.name} size={48} />
            <AppText variant="label" className="flex-1">{person.name}</AppText>
            <AppButton variant="outline" onPress={() => setSelected(person)}>Unblock</AppButton>
          </View>
        ))}
      </View>
      <AppDialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }} title={selected ? `Unblock ${selected.name}?` : 'Unblock'} description="They will be able to contact you again if other communication rules allow it.">
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={() => setSelected(null)}>Cancel</AppButton>
          <AppButton className="flex-1" onPress={() => void unblock()}>Unblock</AppButton>
        </View>
      </AppDialog>
    </View>
  );
}
