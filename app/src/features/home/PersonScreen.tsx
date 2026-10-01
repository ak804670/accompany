import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { chatService } from '@/features/chat/chat.service';
import { formatDistance, formatRate } from '@/features/home/discovery';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';

type PersonScreenProps = {
  userId: string;
  onBack: () => void;
  onConversation: (conversationId: string, name: string, online: boolean) => void;
};

export function PersonScreen({ userId, onBack, onConversation }: PersonScreenProps) {
  const insets = useSafeAreaInsets();
  const [person, setPerson] = useState<OnlinePerson | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [composing, setComposing] = useState(false);

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

  async function sendRequest() {
    if (!person) return;
    const body = message.trim();
    if (!body) {
      setError('Write one message to send your request.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      onConversation(await chatService.open(person.userId, body), person.name, person.online);
    } catch {
      setError("Couldn't send the request");
    } finally {
      setPending(false);
    }
  }

  async function block() {
    if (!person) return;
    setPending(true);
    try {
      await peopleService.block(person.userId);
      setPerson({ ...person, relationship: 'blocked' });
    } catch {
      setError("Couldn't update this person");
    } finally {
      setPending(false);
    }
  }

  const distance = formatDistance(person?.distanceKm ?? null);
  const hidden = person?.relationship === 'blocked' || person?.relationship === 'unavailable';

  return (
    <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
      {person ? (
        <View className="mt-lg flex-1 gap-md">
          <PersonAvatar userId={person.userId} name={person.name} size={120} />
          <AppText variant="h1">{person.name}</AppText>
          <OnlineStatus online={person.online} />
          {distance ? <AppText variant="bodyS" tone="muted">{distance}</AppText> : null}
          {person.bio ? <AppText variant="bodyL">{person.bio}</AppText> : null}
          <View className="flex-row flex-wrap gap-xs">
            {person.interests.map((interest) => (
              <View key={interest} className="rounded-full bg-muted px-sm py-xs">
                <AppText variant="caption">{interest}</AppText>
              </View>
            ))}
          </View>
          <View className="flex-row gap-md">
            <View className="flex-1">
              <AppText variant="caption" tone="muted">Audio call</AppText>
              <AppText variant="label">{formatRate(person.rates.audio, 'min')}</AppText>
            </View>
            <View className="flex-1">
              <AppText variant="caption" tone="muted">Video call</AppText>
              <AppText variant="label">{formatRate(person.rates.video, 'min')}</AppText>
            </View>
          </View>
          {error ? <AppText variant="bodyS" tone="error">{error}</AppText> : null}
          {hidden ? null : person.relationship === 'pending_outgoing' ? (
            <AppText variant="bodyM">Request pending</AppText>
          ) : person.relationship === 'accepted' && person.conversationId ? (
            <AppButton onPress={() => onConversation(person.conversationId!, person.name, person.online)}>Message</AppButton>
          ) : composing || person.relationship === 'none' || person.relationship === 'rejected' ? (
            <View className="gap-sm">
              {composing ? (
                <>
                  <TextInput
                    accessibilityLabel="First message"
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Write one message"
                    className="min-h-20 rounded-sm border border-input px-md py-sm text-foreground"
                    multiline
                  />
                  <AppButton loading={pending} onPress={() => void sendRequest()}>Send request</AppButton>
                </>
              ) : (
                <AppButton onPress={() => setComposing(true)}>Message</AppButton>
              )}
            </View>
          ) : null}
          {person.relationship === 'blocked' ? (
            <AppButton variant="outline" loading={pending} onPress={() => void peopleService.unblock(person.userId).then(() => setPerson({ ...person, relationship: 'none' }))}>Unblock</AppButton>
          ) : hidden ? null : (
            <AppButton variant="ghost" onPress={() => void block()}>Block</AppButton>
          )}
        </View>
      ) : (
        <View className="mt-xl">
          <IllustratedState
            name={error ? illustrationForError(error) : 'loading'}
            motion={error ? 'none' : 'pulse'}
            size={140}
            title={error ?? 'Loading...'}
          />
        </View>
      )}
    </View>
  );
}
