import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { ThemeProvider } from '@/theme';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('BottomNavigation', () => {
  it('renders all navigation tabs', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <BottomNavigation value="chats" unread={0} onChange={onChange} />
    );

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Chats')).toBeOnTheScreen();
    expect(screen.getByText('Profile')).toBeOnTheScreen();
  });

  it('does not render unread badge when unread is 0', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <BottomNavigation value="home" unread={0} onChange={onChange} />
    );

    expect(screen.queryByLabelText(/unread/i)).toBeNull();
  });

  it('renders unread badge on Chats tab when unread > 0', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <BottomNavigation value="home" unread={3} onChange={onChange} />
    );

    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 unread')).toBeOnTheScreen();
  });

  it('renders 99+ on Chats tab when unread > 99', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <BottomNavigation value="home" unread={150} onChange={onChange} />
    );

    expect(screen.getByText('99+')).toBeOnTheScreen();
    expect(screen.getByLabelText('150 unread')).toBeOnTheScreen();
  });

  it('calls onChange when a tab is pressed', async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <BottomNavigation value="chats" unread={2} onChange={onChange} />
    );

    fireEvent.press(screen.getByText('Home'));
    expect(onChange).toHaveBeenCalledWith('home');

    fireEvent.press(screen.getByText('Profile'));
    expect(onChange).toHaveBeenCalledWith('profile');
  });
});

