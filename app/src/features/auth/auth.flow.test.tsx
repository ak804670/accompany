import { fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { authService } from '@/features/auth/services/auth.service';
import { RootNavigator } from '@/navigation';
import { ApiError } from '@/services/api/types';
import { ThemeProvider } from '@/theme';

jest.mock('@/features/auth/services/auth.service', () => {
  const actual = jest.requireActual(
    '@/features/auth/services/auth.service'
  ) as typeof import('@/features/auth/services/auth.service');

  return {
    ...actual,
    authService: {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      refresh: jest.fn(async () => null),
      currentSession: jest.fn(),
      logout: jest.fn(async () => undefined),
    },
  };
});

const requestOtp = authService.requestOtp as jest.MockedFunction<typeof authService.requestOtp>;
const verifyOtp = authService.verifyOtp as jest.MockedFunction<typeof authService.verifyOtp>;
const currentSession = authService.currentSession as jest.MockedFunction<typeof authService.currentSession>;
const logout = authService.logout as jest.MockedFunction<typeof authService.logout>;
const getItemAsync = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

async function openPhoneLogin() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Phone' }));
}

describe('authentication flow', () => {
  beforeEach(() => {
    getItemAsync.mockReset();
    getItemAsync.mockResolvedValue(null);
    requestOtp.mockReset();
    verifyOtp.mockReset();
    currentSession.mockReset();
    logout.mockReset();
    logout.mockResolvedValue(undefined);
  });

  it('shows the welcome screen when there is no session', async () => {
    await renderApp();

    expect(await screen.findByRole('button', { name: 'Continue with Phone' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue with Email' })).toBeOnTheScreen();
    expect(screen.queryByTestId('authenticated-home')).toBeNull();
  });

  it('keeps the welcome screen hidden while a saved session is checked', async () => {
    let resolveSession: (value: { user: { id: string } }) => void = () => undefined;
    getItemAsync.mockImplementation(async (key) => {
      if (key === 'auth.accessToken' || key === 'auth.refreshToken') {
        return 'stored';
      }
      return null;
    });
    currentSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        })
    );

    await renderApp();

    expect(screen.getByTestId('session-checking')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue with Phone' })).toBeNull();

    resolveSession({ user: { id: 'user-1' } });

    expect(await screen.findByTestId('authenticated-home')).toBeOnTheScreen();
  });

  it('validates the phone login form and requests an OTP', async () => {
    requestOtp.mockResolvedValue({ success: true, expiresIn: 300, resendAfter: 0 });
    await renderApp();
    await openPhoneLogin();

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter a valid phone number.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(requestOtp).toHaveBeenCalledWith('phone', '+919876543210');
    expect(await screen.findByText('Enter verification code')).toBeOnTheScreen();
    expect(screen.getByText(/We sent a verification code to/)).toBeOnTheScreen();
  });

  it('requests an email OTP from the email form', async () => {
    requestOtp.mockResolvedValue({ success: true, expiresIn: 300, resendAfter: 0 });
    await renderApp();

    await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Email' }));
    await fireEvent.changeText(screen.getByLabelText('Email'), 'bad-email');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter a valid email.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'user@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(requestOtp).toHaveBeenCalledWith('email', 'user@example.com');
    expect(await screen.findByText('Enter verification code')).toBeOnTheScreen();
  });

  it('shows an invalid OTP error and can resend', async () => {
    requestOtp.mockResolvedValue({ success: true, expiresIn: 300, resendAfter: 0 });
    verifyOtp.mockRejectedValue(
      new ApiError('Unauthorized', 401, {
        error: { code: 'INVALID_OTP', message: 'That code is not valid. Try again.' },
      })
    );
    await renderApp();
    await openPhoneLogin();
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Enter verification code');

    await fireEvent.changeText(screen.getByLabelText('Digit 1'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('That code is not valid. Try again.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Resend' }));
    expect(requestOtp).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('A new code was sent.')).toBeOnTheScreen();
  });

  it('shows an expired OTP error', async () => {
    requestOtp.mockResolvedValue({ success: true, expiresIn: 300, resendAfter: 30 });
    verifyOtp.mockRejectedValue(
      new ApiError('Unauthorized', 401, {
        error: { code: 'OTP_EXPIRED', message: 'That code has expired. Request a new one.' },
      })
    );
    await renderApp();
    await openPhoneLogin();
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByLabelText('Digit 1');
    await fireEvent.changeText(screen.getByLabelText('Digit 1'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('That code has expired. Request a new one.')).toBeOnTheScreen();
  });

  it('shows a loading state while requesting a code', async () => {
    let release: (value: { success: true; expiresIn: number; resendAfter: number }) => void = () =>
      undefined;
    requestOtp.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    await renderApp();
    await openPhoneLogin();
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    release({ success: true, expiresIn: 300, resendAfter: 30 });
    expect(await screen.findByText('Enter verification code')).toBeOnTheScreen();
  });

  it('logs out and returns to the welcome screen', async () => {
    getItemAsync.mockImplementation(async (key) => {
      if (key === 'auth.accessToken') {
        return 'access';
      }
      return null;
    });
    currentSession.mockResolvedValue({ user: { id: 'user-1' } });
    await renderApp();

    await fireEvent.press(await screen.findByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Continue with Phone' })).toBeOnTheScreen();
  });
});
