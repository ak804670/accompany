import { fireEvent, render, screen } from '@testing-library/react-native';

import { PersonListView } from '@/components/home/PersonListView';
import type { OnlinePerson } from '@/features/home/people.service';
import { ThemeProvider } from '@/theme';

const mockPerson: OnlinePerson = {
  userId: 'user-1',
  name: 'Sakshi',
  age: 22,
  bio: 'Coffee lover and designer',
  mediaId: null,
  online: true,
  interests: ['Design', 'Coffee', 'Music'],
  sharedInterests: ['Design'],
  rates: { chat: 10, audio: 20, video: 30 },
  distanceKm: 3.5,
  relationship: 'none',
  conversationId: null,
};

describe('PersonListView', () => {
  it('renders a list of people with their names, tags, and distance', async () => {
    const onOpen = jest.fn();
    await render(
      <ThemeProvider>
        <PersonListView people={[mockPerson]} onOpen={onOpen} />
      </ThemeProvider>
    );

    expect(screen.getByText('Sakshi')).toBeOnTheScreen();
    expect(screen.getByText('Coffee lover and designer')).toBeOnTheScreen();
    expect(screen.getByText('22 yrs • 3.5 km away')).toBeOnTheScreen();
    expect(screen.getByText('Online')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Sakshi'));
    expect(onOpen).toHaveBeenCalledWith('user-1');
  });

  it('renders empty state when people list is empty', async () => {
    const onAdjust = jest.fn();
    await render(
      <ThemeProvider>
        <PersonListView people={[]} onOpen={jest.fn()} onAdjustFilters={onAdjust} filtered />
      </ThemeProvider>
    );

    expect(screen.getByText('No one new to show right now.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adjust filters' })).toBeOnTheScreen();
  });
});
