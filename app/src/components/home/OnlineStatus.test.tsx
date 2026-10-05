import { render, screen } from '@testing-library/react-native';
import { OnlineStatus } from './OnlineStatus';
import { ThemeProvider } from '@/theme';

describe('OnlineStatus', () => {
  it('renders online state correctly', async () => {
    await render(
      <ThemeProvider>
        <OnlineStatus online={true} />
      </ThemeProvider>
    );
    expect(screen.getByText('● Online')).toBeOnTheScreen();
  });

  it('renders offline state correctly', async () => {
    await render(
      <ThemeProvider>
        <OnlineStatus online={false} />
      </ThemeProvider>
    );
    expect(screen.getByText('Offline')).toBeOnTheScreen();
  });

  it('renders on call state correctly', async () => {
    await render(
      <ThemeProvider>
        <OnlineStatus online={true} onCall={true} />
      </ThemeProvider>
    );
    expect(screen.getByText('● On call')).toBeOnTheScreen();
  });
});
