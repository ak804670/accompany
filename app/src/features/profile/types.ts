export type OnboardingStep = 'basics' | 'photo' | 'about' | 'interests' | 'preferences' | 'review' | 'complete';

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
};

export type OnboardingRoute = 'Basics' | 'Photo' | 'About' | 'Interests' | 'Preferences' | 'Review';

export function routeForStep(step: OnboardingStep): OnboardingRoute {
  switch (step) {
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
