import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppDialog } from '@/components/design-system/AppDialog';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
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
        <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
        <AppText variant="h3">Blocked people</AppText>
      </View>
      {loading ? <IllustratedState name="loading" motion="pulse" size={140} title="Loading blocked people..." /> : null}
      {error ? (
        <IllustratedState name={illustrationForError(error)} title={error} body="Try again in a moment.">
          <AppButton variant="outline" onPress={load}>Try again</AppButton>
        </IllustratedState>
      ) : null}
      {!loading && !error && people.length === 0 ? (
        <IllustratedState name="blocked-empty" title="You haven't blocked anyone." body="Blocking stays private. People you block cannot contact you." />
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
