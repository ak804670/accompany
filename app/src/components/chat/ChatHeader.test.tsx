import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ThemeProvider } from '@/theme';

jest.mock('@/components/home/PersonAvatar', () => ({
  PersonAvatar: () => null,
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('ChatHeader', () => {
  it('renders chat header and triggers onPressProfile when clicked', async () => {
    const onBack = jest.fn();
    const onPressProfile = jest.fn();

    await renderWithProviders(
      <ChatHeader
        name="Alice"
        personId="user-123"
        online={true}
        onBack={onBack}
        onPressProfile={onPressProfile}
      />
    );

    expect(screen.getByText('Alice')).toBeOnTheScreen();
    const profileButton = screen.getByRole('button', { name: "View Alice's profile" });
    expect(profileButton).toBeOnTheScreen();

    await fireEvent.press(profileButton);
    expect(onPressProfile).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders disabled non-button header when onPressProfile is not provided', async () => {
    await renderWithProviders(
      <ChatHeader
        name="Bob"
        online={false}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText('Bob')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: "View Bob's profile" })).toBeNull();
  });
});

