import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import type { ProfileInterest } from '@/features/profile/types';

export const defaultInterests = [
  { name: 'Museums & galleries', emoji: '🏛️' },
  { name: 'Skiing', emoji: '🎿' },
  { name: 'Crafts', emoji: '✍️' },
  { name: 'Country Music', emoji: '🤠' },
  { name: 'Coffee', emoji: '☕' },
  { name: 'Gardening', emoji: '🌱' },
  { name: 'Foodie', emoji: '🍔' },
  { name: 'LGBTQ+ Rights', emoji: '🏳️‍🌈' },
  { name: 'Tennis', emoji: '🎾' },
  { name: 'Writing', emoji: '📝' },
  { name: 'Art', emoji: '🎨' },
  { name: 'Exploring Cities', emoji: '🏙️' },
  { name: 'Horror Movies', emoji: '👻' },
  { name: 'Vegetarian', emoji: '🥦' },
  { name: 'Camping', emoji: '🏕️' },
  { name: 'Cats', emoji: '🐱' },
  { name: 'Hiking', emoji: '🥾' },
  { name: 'Concerts', emoji: '🎤' },
  { name: 'Wine', emoji: '🍷' },
  { name: 'Festivals', emoji: '🎉' },
  { name: 'Baking', emoji: '🍰' },
  { name: 'Dancing', emoji: '💃' },
  { name: 'Yoga', emoji: '🧘' },
];

export const emojiByInterestName: Record<string, string> = {
  'museums & galleries': '🏛️',
  'skiing': '🎿',
  'crafts': '✍️',
  'country music': '🤠',
  'coffee': '☕',
  'gardening': '🌱',
  'foodie': '🍔',
  'lgbtq+ rights': '🏳️‍🌈',
  'tennis': '🎾',
  'writing': '📝',
  'art': '🎨',
  'exploring cities': '🏙️',
  'horror movies': '👻',
  'vegetarian': '🥦',
  'camping': '🏕️',
  'cats': '🐱',
  'hiking': '🥾',
  'concerts': '🎤',
  'wine': '🍷',
  'festivals': '🎉',
  'baking': '🍰',
  'dancing': '💃',
  'yoga': '🧘',
  'music': '🎵',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (val?: string | null): val is string => Boolean(val && UUID_REGEX.test(val));

export function emojiFor(name: string): string {
  const normalized = name.trim().toLowerCase();
  return emojiByInterestName[normalized] ?? '✨';
}

type InterestTag = { id?: string; name: string };

type InterestTagInputProps = {
  options: ProfileInterest[];
  selected: InterestTag[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (interest: ProfileInterest) => void;
  onAddCustom?: (name: string) => void;
  onRemove: (name: string) => void;
  maxSelections?: number;
};

export function InterestTagInput({
  options,
  selected,
  query,
  onQueryChange,
  onToggle,
  onAddCustom,
  onRemove,
  maxSelections = 5,
}: InterestTagInputProps) {
  const [hint, setHint] = useState<string | null>(null);
  const selectedNames = new Set(selected.map((item) => item.name.toLowerCase()));
  const trimmed = query.trim().toLowerCase();

  // Combine default preset interests with options returned by API/server
  const mergedOptions = useMemo(() => {
    const list: Array<{ id?: string; name: string; emoji: string }> = [];
    const seen = new Set<string>();

    const optionsByName = new Map<string, string>();
    for (const opt of options) {
      if (opt.id && isUuid(opt.id)) {
        optionsByName.set(opt.name.toLowerCase(), opt.id);
      }
    }

    for (const item of defaultInterests) {
      const serverId = optionsByName.get(item.name.toLowerCase());
      list.push({ id: serverId, name: item.name, emoji: item.emoji });
      seen.add(item.name.toLowerCase());
    }

    for (const opt of options) {
      if (!seen.has(opt.name.toLowerCase())) {
        list.push({
          id: opt.id && isUuid(opt.id) ? opt.id : undefined,
          name: opt.name,
          emoji: emojiFor(opt.name),
        });
        seen.add(opt.name.toLowerCase());
      }
    }

    return list;
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!trimmed) return mergedOptions;
    return mergedOptions.filter((item) => item.name.toLowerCase().includes(trimmed));
  }, [mergedOptions, trimmed]);

  const canAddCustom =
    Boolean(onAddCustom) &&
    trimmed.length >= 2 &&
    trimmed.length <= 40 &&
    !selectedNames.has(trimmed) &&
    !mergedOptions.some((item) => item.name.toLowerCase() === trimmed);

  function handleToggle(item: { id?: string; name: string }) {
    const isSelected = selectedNames.has(item.name.toLowerCase());
    if (!isSelected && selected.length >= maxSelections) {
      setHint(`You can select up to ${maxSelections} interests.`);
      return;
    }
    setHint(null);
    onToggle({
      id: item.id && isUuid(item.id) ? item.id : '',
      name: item.name,
      slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });
  }

  function handleAddCustom() {
    if (!canAddCustom || !onAddCustom) return;
    if (selected.length >= maxSelections) {
      setHint(`You can select up to ${maxSelections} interests.`);
      return;
    }
    setHint(null);
    onAddCustom(query.trim());
    onQueryChange('');
  }

  return (
    <View className="gap-md">
      {/* Pill-shaped search input */}
      <View className="flex-row items-center gap-sm rounded-full border border-border bg-card px-md py-sm">
        <BrandIcon name="search" size={18} />
        <TextInput
          accessibilityLabel="What are you into?"
          value={query}
          onChangeText={(val) => {
            setHint(null);
            onQueryChange(val);
          }}
          placeholder="What are you into?"
          placeholderTextColor="#888"
          className="flex-1 py-xs font-inter-regular text-body-m text-foreground"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onQueryChange('')}>
            <AppText tone="muted" className="px-xs font-bold text-lg">×</AppText>
          </Pressable>
        ) : null}
      </View>

      {canAddCustom ? (
        <Pressable accessibilityRole="button" onPress={handleAddCustom} className="self-start py-xs">
          <AppText variant="bodyS" tone="primary">+ Add "{query.trim()}"</AppText>
        </Pressable>
      ) : null}

      {hint ? <AppText variant="caption" tone="error">{hint}</AppText> : null}

      {/* Section Header */}
      <AppText variant="h3" className="font-bold">You might like...</AppText>

      {/* Grid of Interests */}
      <View className="flex-row flex-wrap gap-sm">
        {filteredOptions.length === 0 ? (
          <AppText variant="bodyS" tone="muted">No matching interests found.</AppText>
        ) : (
          filteredOptions.map((interest) => {
            const active = selectedNames.has(interest.name.toLowerCase());
            return (
              <Pressable
                key={interest.name}
                accessibilityRole="button"
                accessibilityLabel={interest.name}
                accessibilityState={{ selected: active }}
                onPress={() => handleToggle(interest)}
                className={`flex-row items-center gap-xs rounded-full border px-md py-sm shadow-xs ${
                  active
                    ? 'border-primary bg-primary'
                    : 'border-border bg-card active:bg-muted'
                }`}
              >
                <AppText>{interest.emoji}</AppText>
                <AppText
                  variant="bodyS"
                  className={active ? 'font-semibold text-primary-foreground' : 'text-foreground'}
                >
                  {interest.name}
                </AppText>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
