import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';

import { AppBottomSheet } from '@/components/design-system/AppBottomSheet';
import { AppButton } from '@/components/design-system/AppButton';
import { AppInput } from '@/components/design-system/AppInput';
import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { InterestTagInput } from '@/components/profile/InterestTagInput';
import { profileRepository } from '@/database/repositories/profileRepository';
import { useSession } from '@/features/auth';
import { captureLocation, getOrDetectLocationName } from '@/features/home/location';
import { refreshDiscovery } from '@/features/home/discovery-refresh';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { profileService } from '@/features/profile/services/profile.service';
import { prepareProfileImage } from '@/features/profile/services/prepare-image';
import type { ProfileInterest } from '@/features/profile/types';
import { profileImageConfig } from '@/services/media/image-config';

type Tag = { id?: string; name: string };
type Rates = { chat: string; audio: string; video: string };

function rateText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function parseRate(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return Number.NaN;
  return Number(value.trim());
}

export function ProfileForm({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const { user } = useSession();
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [selected, setSelected] = useState<Tag[]>(profile?.interests.map((item) => ({ id: item.id, name: item.name })) ?? []);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ProfileInterest[]>([]);
  const [rates, setRates] = useState<Rates>({ chat: '', audio: '', video: '' });
  const [savedRates, setSavedRates] = useState<Rates>({ chat: '', audio: '', video: '' });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);

  useEffect(() => {
    void getOrDetectLocationName().then((loc) => {
      if (loc) setLocationName(loc);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (user?.id) {
        const cached = profileRepository.peekRates(user.id) ?? await profileRepository.getRates(user.id);
        if (active && cached) {
          const next = { chat: rateText(cached.chat), audio: rateText(cached.audio), video: rateText(cached.video) };
          setRates(next);
          setSavedRates(next);
        }
      }
      try {
        const value = await profileService.rates();
        if (user?.id) await profileRepository.saveRates(user.id, value);
        if (!active) return;
        const next = { chat: rateText(value.chat), audio: rateText(value.audio), video: rateText(value.video) };
        setRates(next);
        setSavedRates(next);
      } catch {
        // Keep the cached rates when the refresh fails.
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    profileService.interests(query).then((items) => {
      if (!cancelled) setOptions(items);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const photos = profile?.media ?? [];
    for (const photo of photos) {
      if (previews[photo.id]) continue;
      void profileService.photoPreview(photo.id).then((uri) => {
        if (uri) setPreviews((current) => ({ ...current, [photo.id]: uri }));
      });
    }
  }, [profile?.media, previews]);

  const dirty = useMemo(() => {
    const originalInterests = (profile?.interests ?? []).map((item) => item.name).join('|');
    const nextInterests = selected.map((item) => item.name).join('|');
    return name !== (profile?.displayName ?? '')
      || bio !== (profile?.bio ?? '')
      || originalInterests !== nextInterests
      || rates.audio !== savedRates.audio
      || rates.video !== savedRates.video;
  }, [bio, name, profile?.bio, profile?.displayName, profile?.interests, rates, savedRates, selected]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80) {
      setError('Enter a name.');
      return;
    }
    if (bio.length > 500) {
      setError('Bio is too long.');
      return;
    }
    const audio = parseRate(rates.audio);
    const video = parseRate(rates.video);
    if ([audio, video].some((value) => Number.isNaN(value))) {
      setError('Rates must be zero or a positive whole number.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let next = profile;
      if (trimmed !== profile?.displayName || bio !== (profile?.bio ?? '')) {
        next = await profileService.update({ displayName: trimmed, bio });
      }
      const interestIds = selected.flatMap((item) => (item.id ? [item.id] : []));
      const names = selected.filter((item) => !item.id).map((item) => item.name);
      next = await profileService.saveInterests(interestIds, names);
      const ratePayload = {
        ...(audio !== null ? { audio } : {}),
        ...(video !== null ? { video } : {}),
      };
      const saved = Object.keys(ratePayload).length ? await profileService.saveRates(ratePayload) : null;
      if (saved && user?.id) {
        try {
          await profileRepository.saveRates(user.id, saved);
        } catch {
          // The server already stored the rates.
        }
      }
      if (next) setProfile(next);
      setSavedRates(rates);
      setError(null);
      if (saved) refreshDiscovery();
    } catch (caught) {
      setError(profileService.failureMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto() {
    if ((profile?.media.length ?? 0) >= profileImageConfig.maxPhotos) {
      setError(`You can add up to ${profileImageConfig.maxPhotos} photos.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is needed to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    const prepared = await prepareProfileImage(asset.uri);
    setProfile(await profileService.uploadPhoto(prepared.bytes, prepared.contentType));
  }

  async function makePrimary(mediaId: string) {
    const media = profile?.media ?? [];
    const order = [mediaId, ...media.map((item) => item.id).filter((id) => id !== mediaId)];
    setProfile(await profileService.reorderPhotos(order));
    setPhotoId(null);
  }

  async function move(mediaId: string, direction: -1 | 1) {
    const media = profile?.media ?? [];
    const index = media.findIndex((item) => item.id === mediaId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= media.length) return;
    const order = media.map((item) => item.id);
    const [item] = order.splice(index, 1);
    order.splice(target, 0, item);
    setProfile(await profileService.reorderPhotos(order));
  }

  async function updateLocation() {
    const location = await captureLocation();
    if (!location.ok) {
      setLocationNote(location.message);
      return;
    }
    if (location.placeName) {
      setLocationName(location.placeName);
    }
    await peopleServiceLocation(location.latitude, location.longitude);
    setLocationNote('Location updated');
    refreshDiscovery();
  }

  return (
    <View className="gap-lg pb-xl">
      <View className="gap-sm">
        <AppText variant="label">Profile photos</AppText>
        <View className="flex-row flex-wrap gap-sm">
          {(profile?.media ?? []).map((photo) => (
            <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={photo.isPrimary ? 'Primary photo' : 'Photo'} className="overflow-hidden rounded-sm border border-border" onPress={() => setPhotoId(photo.id)}>
              {previews[photo.id] ? <Image source={{ uri: previews[photo.id] }} style={{ width: 104, height: 136 }} /> : <View className="h-36 w-28 bg-muted" />}
              {photo.isPrimary ? <AppText className="bg-background px-xs py-xs" variant="caption" tone="primary">Primary</AppText> : null}
            </Pressable>
          ))}
          {(profile?.media.length ?? 0) < profileImageConfig.maxPhotos ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Add photo" className="h-36 w-28 items-center justify-center rounded-sm border border-dashed border-border" onPress={() => void addPhoto()}>
              <AppText variant="label">+ Add photo</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View className="gap-xs">
        <AppText variant="label">Name</AppText>
        <AppInput accessibilityLabel="Name" value={name} onChangeText={setName} />
      </View>
      <View className="gap-xs">
        <AppText variant="label">Bio</AppText>
        <TextInput
          accessibilityLabel="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="Tell people a little about yourself..."
          className="min-h-24 rounded-sm border border-input px-md py-sm text-foreground"
        />
      </View>
      <InterestTagInput
        options={options}
        selected={selected}
        query={query}
        onQueryChange={setQuery}
        onToggle={(interest) => setSelected((current) => current.some((item) => item.id === interest.id) ? current.filter((item) => item.id !== interest.id) : [...current, interest])}
        onAddCustom={(value) => setSelected((current) => current.some((item) => item.name.toLowerCase() === value.toLowerCase()) ? current : [...current, { name: value }])}
        onRemove={(value) => setSelected((current) => current.filter((item) => item.name !== value))}
      />
      <View className="gap-sm">
        <AppText variant="label">Location</AppText>
        <AppText variant="bodyS" tone="muted">Current location is used for nearby discovery. Other people only see an approximate distance.</AppText>
        {locationName ? (
          <View className="flex-row items-center gap-sm rounded-sm border border-border bg-card p-md">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
              <BrandIcon name="location" size={18} />
            </View>
            <View className="flex-1">
              <AppText variant="label">{locationName}</AppText>
              <AppText variant="caption" tone="muted">Detected location</AppText>
            </View>
          </View>
        ) : null}
        <AppButton variant="outline" onPress={() => void updateLocation()}>
          <View className="flex-row items-center gap-xs">
            <BrandIcon name="location" size={16} />
            <AppText>{locationName ? 'Update location' : 'Enable location'}</AppText>
          </View>
        </AppButton>
        {locationNote ? <AppText variant="caption" tone="muted">{locationNote}</AppText> : null}
      </View>
      <View className="gap-sm">
        <AppText variant="label">Communication rates</AppText>
        <RateField label="Audio call (coins / min)" value={rates.audio} onChange={(audio) => setRates((current) => ({ ...current, audio }))} />
        <RateField label="Video call (coins / min)" value={rates.video} onChange={(video) => setRates((current) => ({ ...current, video }))} />
      </View>
      {error ? <AppText variant="bodyS" tone="error">{error}</AppText> : null}
      <AppButton loading={saving} onPress={() => void save()}>Save changes</AppButton>
      <AppBottomSheet open={photoId !== null} onOpenChange={(open) => { if (!open) setPhotoId(null); }} title="Photo">
        <AppButton variant="outline" onPress={() => { if (photoId) void move(photoId, -1).then(() => setPhotoId(null)); }}>Move earlier</AppButton>
        <AppButton variant="outline" onPress={() => { if (photoId) void move(photoId, 1).then(() => setPhotoId(null)); }}>Move later</AppButton>
        <AppButton variant="outline" onPress={() => { if (photoId) void makePrimary(photoId); }}>Set as primary</AppButton>
        <AppButton onPress={() => { if (photoId) void profileService.removePhoto(photoId).then(setProfile).finally(() => setPhotoId(null)); }}>Remove</AppButton>
      </AppBottomSheet>
    </View>
  );
}

function RateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View className="gap-xs">
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppInput accessibilityLabel={label} keyboardType="number-pad" value={value} onChangeText={onChange} />
    </View>
  );
}

async function peopleServiceLocation(latitude: number, longitude: number) {
  const { peopleService } = await import('@/features/home/people.service');
  await peopleService.saveLocation(latitude, longitude, true);
}
