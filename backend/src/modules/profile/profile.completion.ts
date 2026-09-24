import type { OnboardingStep, ProfileRecord } from './profile.types.js';

const order: OnboardingStep[] = ['basics', 'photo', 'about', 'interests', 'preferences', 'review', 'complete'];

export function isComplete(profile: Pick<ProfileRecord, 'displayName' | 'dateOfBirth' | 'media'>): boolean {
  return Boolean(profile.displayName && profile.dateOfBirth && profile.media.some((item) => item.isPrimary));
}

export function nextStep(current: OnboardingStep): OnboardingStep {
  const index = order.indexOf(current);
  return order[Math.min(index + 1, order.length - 1)] ?? 'basics';
}

export function advanceStep(current: OnboardingStep, saved: OnboardingStep): OnboardingStep {
  if (current === 'complete') {
    return 'complete';
  }
  return order.indexOf(saved) > order.indexOf(current) ? current : nextStep(saved);
}
