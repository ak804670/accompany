import { render, screen, userEvent } from '@testing-library/react-native';

import { resetSessionCache } from '@/database/session-cache';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { profileService } from '@/features/profile/services/profile.service';
import type { UserProfile } from '@/features/profile/types';
import { RootNavigator } from '@/navigation';
import { ThemeProvider } from '@/theme';

jest.mock('@/features/auth', () => ({
  useSession: () => ({ isChecking: false, isAuthenticated: true, user: { id: 'user-1' } }),
  useAuth: () => ({ status: 'authenticated' }),
  AuthError: ({ message }: { message: string | null }) => {
    const React = require('react') as typeof import('react');
    const { Text } = require('react-native') as typeof import('react-native');
    return message ? React.createElement(Text, null, message) : null;
  },
}));

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return { __esModule: true, default: () => React.createElement(View) };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/features/profile/services/prepare-image', () => ({
  prepareProfileImage: jest.fn(async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' })),
}));

jest.mock('@/features/profile/services/profile.service', () => ({
  profileService: {
    get: jest.fn(),
    saveBasics: jest.fn(),
    update: jest.fn(),
    interests: jest.fn(),
    saveInterests: jest.fn(),
    uploadPhoto: jest.fn(),
    photoPreview: jest.fn(async () => null),
    removePhoto: jest.fn(),
    complete: jest.fn(),
    failureMessage: () => 'Could not save your profile.',
  },
}));

const service = profileService as jest.Mocked<typeof profileService>;

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    displayName: 'Anish',
    dateOfBirth: '1998-04-02',
    bio: 'I like long conversations.',
    languagePreferences: ['en'],
    step: 'basics',
    interests: [],
    media: [],
    complete: false,
    ...overrides,
  };
}

function renderGate() {
  return render(
    <ThemeProvider>
      <ProfileProvider>
        <RootNavigator />
      </ProfileProvider>
    </ThemeProvider>,
  );
}

describe('profile onboarding', () => {
  beforeEach(() => {
    resetSessionCache();
    jest.clearAllMocks();
  });

  it('opens onboarding when the profile is incomplete', async () => {
    service.get.mockResolvedValue(profile({ step: 'about' }));
    await renderGate();
    expect(await screen.findByText('About you')).toBeOnTheScreen();
  });

  it('opens home when the profile is complete', async () => {
    service.get.mockResolvedValue(profile({ complete: true, step: 'complete' }));
    await renderGate();
    expect(await screen.findByTestId('authenticated-home')).toBeOnTheScreen();
  });

  it('validates a display name before continuing', async () => {
    service.get.mockResolvedValue(profile({ displayName: '', dateOfBirth: null, step: 'basics' }));
    await renderGate();
    await screen.findByLabelText('Display name');
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Enter the name people should use.')).toBeOnTheScreen();
    expect(service.saveBasics).not.toHaveBeenCalled();
  });

  it('saves a selected interest and reports an upload failure', async () => {
    service.get.mockResolvedValue(profile({ step: 'interests', displayName: 'Anish' }));
    service.interests.mockResolvedValue([{ id: '1', name: 'Music', slug: 'music' }]);
    service.saveInterests.mockResolvedValue(profile({ step: 'preferences', interests: [{ id: '1', name: 'Music', slug: 'music' }] }));
    const first = await renderGate();
    await userEvent.press(await screen.findByRole('button', { name: 'Music' }));
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(service.saveInterests).toHaveBeenCalledWith(['1'], []);

    await first.unmount();
    resetSessionCache();
    service.get.mockResolvedValue(profile({ step: 'photo' }));
    service.uploadPhoto.mockRejectedValue(new Error('upload failed'));
    await renderGate();
    await userEvent.press(await screen.findByRole('button', { name: 'Add photo' }));
    expect(await screen.findByText("We couldn't add that photo. Try another one.")).toBeOnTheScreen();
  });

  it('resumes the saved step and completes the profile', async () => {
    service.get.mockResolvedValue(profile({ step: 'review', media: [{ id: 'media-1', isPrimary: true, contentType: 'image/jpeg' }], interests: [{ id: '1', name: 'Music', slug: 'music' }] }));
    service.complete.mockResolvedValue(profile({ complete: true, step: 'complete' }));
    await renderGate();
    expect(await screen.findByText('Review')).toBeOnTheScreen();
    expect(screen.getByText('Music')).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: 'Complete profile' }));
    expect(service.complete).toHaveBeenCalledTimes(1);
  });

  it('shows an API failure on the review step', async () => {
    service.get.mockResolvedValue(profile({ step: 'review' }));
    service.complete.mockRejectedValue(new Error('down'));
    await renderGate();
    await userEvent.press(await screen.findByRole('button', { name: 'Complete profile' }));
    expect(await screen.findByText('Could not save your profile.')).toBeOnTheScreen();
  });
});
