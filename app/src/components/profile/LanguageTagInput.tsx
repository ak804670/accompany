import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';

export type LanguageOption = {
  code: string;
  name: string;
  nativeName?: string;
  label: string;
};

export const availableLanguages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', label: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', label: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', label: 'Bengali (বাংলা)' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', label: 'Marathi (मराठी)' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', label: 'Telugu (తెలుగు)' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', label: 'Tamil (தமிழ்)' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', label: 'Assamese (অসমীয়া)' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', label: 'Urdu (اردو)' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', label: 'Bhojpuri (भोजपुरी)' },
  { code: 'mwr', name: 'Marwari', nativeName: 'मारवाड़ी', label: 'Marwari (मारवाड़ी)' },
  { code: 'hne', name: 'Haryanvi', nativeName: 'हरियाणवी', label: 'Haryanvi (हरियाणवी)' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', label: 'Maithili (मैथिली)' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', label: 'Konkani (कोंकणी)' },
  { code: 'sd', name: 'Sindhi', nativeName: 'सिंधी', label: 'Sindhi (सिंधी)' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर', label: 'Kashmiri (कॉशुर)' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृत', label: 'Sanskrit (संस्कृत)' },
];

export const languageByCode = new Map(availableLanguages.map((lang) => [lang.code, lang]));

type LanguageTagInputProps = {
  selected: string[];
  onToggle: (code: string) => void;
  onRemove: (code: string) => void;
};

export function LanguageTagInput({ selected, onToggle, onRemove }: LanguageTagInputProps) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim().toLowerCase();

  const filteredLanguages = useMemo(() => {
    if (!trimmed) return availableLanguages;
    return availableLanguages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(trimmed) ||
        lang.label.toLowerCase().includes(trimmed) ||
        (lang.nativeName && lang.nativeName.toLowerCase().includes(trimmed)) ||
        lang.code.toLowerCase().includes(trimmed)
    );
  }, [trimmed]);

  return (
    <View className="gap-md">
      {/* Selected tags container with search input */}
      <View className="min-h-14 flex-row flex-wrap items-center gap-xs rounded-sm border border-border p-sm">
        {selected.map((code) => {
          const lang = languageByCode.get(code);
          const displayLabel = lang ? lang.name : code;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${displayLabel}`}
              className="flex-row items-center gap-xs rounded-full bg-primary px-sm py-xs"
              onPress={() => onRemove(code)}
            >
              <AppText variant="caption" className="text-primary-foreground">
                {displayLabel} ×
              </AppText>
            </Pressable>
          );
        })}
        <TextInput
          accessibilityLabel="Search languages"
          value={query}
          onChangeText={setQuery}
          placeholder={selected.length ? '' : 'Search languages...'}
          className="min-w-32 flex-1 py-xs font-inter-regular text-body-m text-foreground"
        />
      </View>

      <AppText variant="label">Choose languages</AppText>

      <View className="flex-row flex-wrap gap-sm">
        {filteredLanguages.length === 0 ? (
          <AppText variant="bodyS" tone="muted">
            No matching languages found
          </AppText>
        ) : (
          filteredLanguages.map((language) => {
            const active = selected.includes(language.code);
            return (
              <Pressable
                key={language.code}
                accessibilityRole="button"
                accessibilityLabel={language.label}
                accessibilityState={{ selected: active }}
                onPress={() => onToggle(language.code)}
                className={`rounded-full border px-md py-sm ${
                  active ? 'border-primary bg-primary' : 'border-border'
                }`}
              >
                <AppText
                  variant="bodyS"
                  className={active ? 'text-primary-foreground' : ''}
                >
                  {language.label}
                </AppText>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
