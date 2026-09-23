import { render, screen } from '@testing-library/react-native';

import { AuthProvider } from '@/features/auth';
import { RootNavigator } from '@/navigation';
import { ThemeProvider } from '@/theme';

describe('RootNavigator', () => {
  it('renders the welcome route after the session check', async () => {
    await render(
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(await screen.findByText('Accompany')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continue with Phone' })).toBeOnTheScreen();
  });
});
