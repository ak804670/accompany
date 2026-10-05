import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { NavBarGradient } from '@/components/navigation/NavBarGradient';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { OnlineStatus } from '@/components/home/OnlineStatus';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { discoveryRepository } from '@/database/repositories/discoveryRepository';
import { useSession } from '@/features/auth';
import { chatService } from '@/features/chat/chat.service';
import { formatDistance, formatRate } from '@/features/home/discovery';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';
import { ratingService, type UserRatingItem } from '@/features/ratings/rating.service';

type PersonScreenProps = {
  userId: string;
  onBack: () => void;
  onConversation: (conversationId: string, name: string, online: boolean) => void;
};

export function PersonScreen({ userId, onBack, onConversation }: PersonScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const [person, setPerson] = useState<OnlinePerson | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [composing, setComposing] = useState(false);
  const [ratingSort, setRatingSort] = useState<'rating' | 'date'>('rating');
  const [ratings, setRatings] = useState<UserRatingItem[]>([]);
  const [ratingSummary, setRatingSummary] = useState<{ averageRating: number; ratingCount: number }>({
    averageRating: 0,
    ratingCount: 0,
  });
  const [loadingRatings, setLoadingRatings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let showedCache = false;
      if (user?.id) {
        const cached = await discoveryRepository.findPerson(user.id, userId);
        if (cancelled) return;
        if (cached) {
          setPerson(cached);
          showedCache = true;
        }
      }
      try {
        const value = await peopleService.person(userId);
        if (!cancelled) {
          setPerson(value);
          if (value.rating) {
            setRatingSummary({
              averageRating: value.rating.average,
              ratingCount: value.rating.count,
            });
          }
        }
      } catch {
        if (!cancelled && !showedCache) setError("Couldn't load this person");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRatings(true);
    void ratingService
      .getRatings(userId, ratingSort)
      .then((res) => {
        if (cancelled) return;
        setRatings(res.ratings);
        setRatingSummary({
          averageRating: res.averageRating,
          ratingCount: res.ratingCount,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingRatings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, ratingSort]);

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
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom + 16 }}>
      {/* Top Header Nav Bar */}
      <View
        className="relative overflow-hidden border-b border-nav-border px-sm pb-2"
        style={{ paddingTop: insets.top + 8 }}
      >
        <NavBarGradient />
        <View className="flex-row items-center gap-xs">
          <AppIconButton icon="back" size="lg" accessibilityLabel="Go back" onPress={onBack} />
          {person ? <AppText variant="h3">{person.name}</AppText> : null}
        </View>
      </View>
      <ScrollView className="flex-1 px-lg" contentContainerClassName="py-md pb-lg">
        {person ? (
          <View className="flex-1 gap-md">
            <PersonAvatar userId={person.userId} name={person.name} size={120} />
            <AppText variant="h1">{person.name}</AppText>
            <View className="flex-row items-center gap-2">
              <OnlineStatus online={person.online} onCall={person.onCall} />
              {ratingSummary.ratingCount > 0 ? (
                <View className="flex-row items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
                  <Star size={13} color="#F59E0B" fill="#F59E0B" />
                  <AppText variant="caption" className="font-semibold text-amber-500">
                    {ratingSummary.averageRating.toFixed(1)}
                  </AppText>
                  <AppText variant="caption" tone="muted" className="text-[10px]">
                    ({ratingSummary.ratingCount} {ratingSummary.ratingCount === 1 ? 'review' : 'reviews'})
                  </AppText>
                </View>
              ) : null}
            </View>
            {distance ? (
              <View className="flex-row items-center gap-1">
                <BrandIcon name="location" size={16} />
                <AppText variant="bodyS" tone="muted">{distance}</AppText>
              </View>
            ) : null}
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

            {/* Reviews & Suggestions Section */}
            <View className="mt-md gap-md border-t border-border pt-md">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <AppText variant="h3">Reviews & Suggestions</AppText>
                  <View className="rounded-full bg-muted px-2 py-0.5">
                    <AppText variant="caption" className="font-semibold text-foreground">
                      {ratingSummary.ratingCount}
                    </AppText>
                  </View>
                </View>

                {/* Sort selector: Star (5 on top) vs Date */}
                <View className="flex-row items-center gap-1 rounded-lg bg-muted p-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sort by highest stars"
                    onPress={() => setRatingSort('rating')}
                    className={`rounded-md px-2.5 py-1 ${ratingSort === 'rating' ? 'bg-card shadow-sm' : ''}`}
                  >
                    <AppText
                      variant="caption"
                      className={ratingSort === 'rating' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                    >
                      ★ Top Stars
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sort by recent date"
                    onPress={() => setRatingSort('date')}
                    className={`rounded-md px-2.5 py-1 ${ratingSort === 'date' ? 'bg-card shadow-sm' : ''}`}
                  >
                    <AppText
                      variant="caption"
                      className={ratingSort === 'date' ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                    >
                      Recent
                    </AppText>
                  </Pressable>
                </View>
              </View>

              {loadingRatings ? (
                <AppText variant="caption" tone="muted">
                  Loading reviews...
                </AppText>
              ) : ratings.length > 0 ? (
                <View className="gap-sm">
                  {ratings.map((item) => {
                    const parsedDate = new Date(item.createdAt);
                    const formattedDate = Number.isNaN(parsedDate.getTime())
                      ? ''
                      : parsedDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });

                    return (
                      <View key={item.id} className="rounded-xl border border-border bg-card p-md gap-xs">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <PersonAvatar userId={item.rater.userId} name={item.rater.name} size={32} />
                            <View>
                              <AppText variant="label" className="font-medium text-foreground">
                                {item.rater.name}
                              </AppText>
                              {formattedDate ? (
                                <AppText variant="caption" tone="muted">
                                  {formattedDate}
                                </AppText>
                              ) : null}
                            </View>
                          </View>
                          <View className="flex-row items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={13}
                                color={star <= item.rating ? '#F59E0B' : '#6B7280'}
                                fill={star <= item.rating ? '#F59E0B' : 'transparent'}
                              />
                            ))}
                          </View>
                        </View>
                        {item.comment ? (
                          <AppText variant="bodyS" className="mt-1 leading-relaxed text-foreground">
                            {item.comment}
                          </AppText>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="items-center justify-center rounded-xl border border-dashed border-border p-md">
                  <AppText variant="caption" tone="muted" className="text-center">
                    No reviews yet. Complete a call with {person.name} to leave a rating and suggestion!
                  </AppText>
                </View>
              )}
            </View>
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
      </ScrollView>
    </View>
  );
}
