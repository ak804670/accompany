import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import type { ProfileInterest } from '@/features/profile/types';

type InterestTag = { id?: string; name: string };

type InterestTagInputProps = {
  options: ProfileInterest[];
  selected: InterestTag[];
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (interest: ProfileInterest) => void;
  onAddCustom: (name: string) => void;
  onRemove: (name: string) => void;
};

export function InterestTagInput({
  options,
  selected,
  query,
  onQueryChange,
  onToggle,
  onAddCustom,
  onRemove,
}: InterestTagInputProps) {
  const [hint, setHint] = useState<string | null>(null);
  const selectedNames = new Set(selected.map((item) => item.name.toLowerCase()));
  const trimmed = query.trim();
  const canAdd = trimmed.length >= 2 && trimmed.length <= 40 && !selectedNames.has(trimmed.toLowerCase());

  function addCustom() {
    if (!canAdd) {
      setHint('Use 2 to 40 characters.');
      return;
    }
    setHint(null);
    onAddCustom(trimmed);
    onQueryChange('');
  }

  return (
    <View className="gap-md">
      <View className="min-h-14 flex-row flex-wrap gap-xs rounded-sm border border-border p-sm">
        {selected.map((item) => (
          <Pressable
            key={item.name}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name}`}
            className="flex-row items-center gap-xs rounded-full bg-primary px-sm py-xs"
            onPress={() => onRemove(item.name)}
          >
            <AppText variant="caption" className="text-primary-foreground">{item.name} ×</AppText>
          </Pressable>
        ))}
        <TextInput
          accessibilityLabel="Add an interest"
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={addCustom}
          placeholder={selected.length ? '' : 'Add an interest...'}
          className="min-w-32 flex-1 py-xs font-inter-regular text-body-m text-foreground"
        />
      </View>
      {canAdd ? (
        <Pressable accessibilityRole="button" onPress={addCustom}>
          <AppText variant="bodyS" tone="primary">Add "{trimmed}"</AppText>
        </Pressable>
      ) : null}
      {hint ? <AppText variant="caption" tone="error">{hint}</AppText> : null}
      <AppText variant="label">Choose interests</AppText>
      <View className="flex-row flex-wrap gap-sm">
        {options.map((interest) => {
          const active = selectedNames.has(interest.name.toLowerCase());
          return (
            <Pressable
              key={interest.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onToggle(interest)}
              className={`rounded-full border px-md py-sm ${active ? 'border-primary bg-primary' : 'border-border'}`}
            >
              <AppText variant="bodyS" className={active ? 'text-primary-foreground' : ''}>{interest.name}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
