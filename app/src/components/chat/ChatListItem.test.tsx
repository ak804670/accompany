import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChatListItem } from '@/components/chat/ChatListItem';
import type { ConversationSummary } from '@/features/chat/chat.service';
import { ThemeProvider } from '@/theme';

const mockItem: ConversationSummary = {
  id: 'conv-1',
  personId: 'person-1',
  name: 'Anish',
  preview: 'Hii',
  updatedAt: new Date(Date.now() - 60000).toISOString(),
  unreadCount: 1,
  online: true,
  onCall: false,
  status: 'accepted',
  incoming: false,
  blocked: false,
};

describe('ChatListItem', () => {
  it('renders chat item details and unread badge when unreadCount > 0', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <ChatListItem item={mockItem} onPress={onPress} />
      </ThemeProvider>
    );

    expect(screen.getByText('Anish')).toBeOnTheScreen();
    expect(screen.getByText('Hii')).toBeOnTheScreen();
    expect(screen.getByText('1m')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 unread')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Anish' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render unread badge when unreadCount is 0', async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider>
        <ChatListItem item={{ ...mockItem, unreadCount: 0 }} onPress={onPress} />
      </ThemeProvider>
    );

    expect(screen.getByText('Anish')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/unread/i)).toBeNull();
  });
});
