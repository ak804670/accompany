import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { chatService } from '@/features/chat/chat.service';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';

type PersonScreenProps = {
  userId: string;
  onBack: () => void;
  onConversation: (conversationId: string, name: string, online: boolean) => void;
};

export function PersonScreen({ userId, onBack, onConversation }: PersonScreenProps) {
  const insets = useSafeAreaInsets();
  const [person, setPerson] = useState<OnlinePerson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    peopleService.person(userId).then((value) => {
      if (!cancelled) setPerson(value);
    }).catch(() => {
      if (!cancelled) setError("Couldn't load this person");
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function start() {
    if (!person) return;
    setPending(true);
    setError(null);
    try {
      onConversation(await chatService.open(userId), person.name, person.online);
    } catch {
      setError("Couldn't start the conversation");
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <AppIconButton icon={ChevronLeft} size="lg" accessibilityLabel="Go back" onPress={onBack} />
      {person ? (
        <View className="mt-xl flex-1 gap-md">
          <PersonAvatar userId={person.userId} name={person.name} size={96} />
          <AppText variant="h1">{person.age ? `${person.name}, ${person.age}` : person.name}</AppText>
          <OnlineStatus online={person.online} />
          {person.bio ? <AppText variant="bodyL">{person.bio}</AppText> : null}
          {error ? <AppText variant="bodyS" tone="error">{error}</AppText> : null}
          <AppButton className="mt-lg" loading={pending} onPress={() => void start()}>Start conversation</AppButton>
        </View>
      ) : (
        <View className="mt-xl gap-md">
          <AppText variant="bodyM" tone="muted">{error ?? 'Loading...'}</AppText>
          {error ? <AppButton variant="outline" onPress={onBack}>Try again</AppButton> : null}
        </View>
      )}
    </View>
  );
}
