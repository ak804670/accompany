export type OnboardingStep = 'basics' | 'photo' | 'about' | 'interests' | 'preferences' | 'review' | 'complete';

export type ProfileMedia = {
  id: string;
  isPrimary: boolean;
  contentType: string;
};

export type Interest = {
  id: string;
  name: string;
  slug: string;
};

export type ProfileRecord = {
  id: string | null;
  userId: string;
  displayName: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  languagePreferences: string[];
  profileStatus: 'incomplete' | 'active' | 'hidden';
  step: OnboardingStep;
  interests: Interest[];
  media: ProfileMedia[];
  complete: boolean;
};

export type StoredMedia = {
  id: string;
  userId: string;
  storageKey: string;
  contentType: string;
  isPrimary: boolean;
};
