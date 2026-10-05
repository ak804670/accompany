export type OnboardingStep = 'intent' | 'role' | 'certificate' | 'basics' | 'gender' | 'location' | 'photo' | 'about' | 'interests' | 'preferences' | 'rates' | 'review' | 'complete';

export type ProfileInterest = { id: string; name: string; slug: string };

export type ProfileMedia = { id: string; isPrimary: boolean; contentType: string };

export type UserProfile = {
  id: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  languagePreferences: string[];
  step: OnboardingStep;
  interests: ProfileInterest[];
  media: ProfileMedia[];
  complete: boolean;
  accountIntent?: 'anonymous' | 'provider';
  supportRole?: 'friendly' | 'astrologer' | 'counselor' | 'expert' | null;
  expertSubject?: string | null;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  verificationNote?: string | null;
};

export type OnboardingRoute = 'Intent' | 'Role' | 'Certificate' | 'Basics' | 'Gender' | 'Location' | 'Photo' | 'About' | 'Interests' | 'Preferences' | 'Rates' | 'Review';

export function routeForStep(step: OnboardingStep): OnboardingRoute {
  switch (step) {
    case 'intent': return 'Intent';
    case 'role': return 'Role';
    case 'certificate': return 'Certificate';
    case 'gender':
      return 'Gender';
    case 'location':
      return 'Location';
    case 'photo':
      return 'Photo';
    case 'about':
      return 'About';
    case 'interests':
      return 'Interests';
    case 'preferences':
      return 'Preferences';
    case 'review':
    case 'complete':
      return 'Review';
    default:
      return 'Basics';
  }
}
