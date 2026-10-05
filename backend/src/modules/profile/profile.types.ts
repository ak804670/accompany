export type OnboardingStep = 'intent' | 'role' | 'certificate' | 'basics' | 'gender' | 'location' | 'photo' | 'about' | 'interests' | 'preferences' | 'rates' | 'review' | 'complete';
export type AccountIntent = 'anonymous' | 'provider';
export type SupportRole = 'friendly' | 'astrologer' | 'counselor' | 'expert';

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
  accountIntent: AccountIntent;
  supportRole: SupportRole | null;
  expertSubject: string | null;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  verificationNote: string | null;
};

export type StoredMedia = {
  id: string;
  userId: string;
  storageKey: string;
  contentType: string;
  isPrimary: boolean;
};
