import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PersonScreen } from './PersonScreen';
import { peopleService, type OnlinePerson } from '@/features/home/people.service';
import { ratingService } from '@/features/ratings/rating.service';
import { ThemeProvider } from '@/theme';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/features/auth', () => ({
  useSession: () => ({ user: { id: 'user-self' } }),
}));

jest.mock('@/database/repositories/discoveryRepository', () => ({
  discoveryRepository: {
    findPerson: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/features/home/people.service', () => ({
  peopleService: {
    person: jest.fn(),
    unblock: jest.fn(),
    block: jest.fn(),
  },
}));

jest.mock('@/features/ratings/rating.service', () => ({
  ratingService: {
    getRatings: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/components/home/PersonAvatar', () => ({
  PersonAvatar: () => null,
}));

jest.mock('@/components/navigation/NavBarGradient', () => ({
  NavBarGradient: () => null,
}));

jest.mock('@/components/illustrations/IllustratedState', () => ({
  IllustratedState: () => null,
}));

const mockPerson: OnlinePerson = {
  userId: 'user-sophia',
  name: 'Sophia',
  age: 25,
  bio: 'Software engineer and traveler',
  mediaId: null,
  online: true,
  interests: ['Tech', 'Travel'],
  sharedInterests: ['Tech'],
  rates: { chat: 10, audio: 20, video: 30 },
  distanceKm: 2.5,
  relationship: 'none',
  conversationId: null,
  rating: {
    average: 4.8,
    count: 2,
  },
};

const mockRatings = [
  {
    id: 'rating-1',
    rating: 5,
    comment: 'Super helpful and insightful conversation!',
    createdAt: '2026-10-01T12:00:00Z',
    rater: {
      userId: 'user-alex',
      name: 'Alex',
      mediaId: null,
    },
  },
  {
    id: 'rating-2',
    rating: 4,
    comment: 'Great chat, learned a lot.',
    createdAt: '2026-10-02T15:30:00Z',
    rater: {
      userId: 'user-maria',
      name: 'Maria',
      mediaId: null,
    },
  },
];

describe('PersonScreen Reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (peopleService.person as jest.Mock).mockResolvedValue(mockPerson);
    (ratingService.getRatings as jest.Mock).mockResolvedValue({
      averageRating: 4.8,
      ratingCount: 2,
      ratings: mockRatings,
    });
  });

  it('renders reviews and comments sorted by rating by default', async () => {
    await render(
      <ThemeProvider>
        <PersonScreen userId="user-sophia" onBack={jest.fn()} onConversation={jest.fn()} />
      </ThemeProvider>,
    );

    // Profile details loaded
    expect((await screen.findAllByText('Sophia')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Reviews & Suggestions')).toBeOnTheScreen();

    // Review items rendered
    expect(await screen.findByText('Alex')).toBeOnTheScreen();
    expect(screen.getByText('Super helpful and insightful conversation!')).toBeOnTheScreen();
    expect(screen.getByText('Maria')).toBeOnTheScreen();
    expect(screen.getByText('Great chat, learned a lot.')).toBeOnTheScreen();

    // Default call was for sort 'rating'
    expect(ratingService.getRatings).toHaveBeenCalledWith('user-sophia', 'rating');
  });

  it('allows switching sort order between rating and date', async () => {
    await render(
      <ThemeProvider>
        <PersonScreen userId="user-sophia" onBack={jest.fn()} onConversation={jest.fn()} />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Reviews & Suggestions')).toBeOnTheScreen();
    expect(ratingService.getRatings).toHaveBeenCalledWith('user-sophia', 'rating');

    // Switch to sort by recent date
    const recentSortButton = screen.getByLabelText('Sort by recent date');
    await fireEvent.press(recentSortButton);

    await waitFor(() => {
      expect(ratingService.getRatings).toHaveBeenCalledWith('user-sophia', 'date');
    });

    // Switch back to sort by top stars
    const topStarsButton = screen.getByLabelText('Sort by highest stars');
    await fireEvent.press(topStarsButton);

    await waitFor(() => {
      expect(ratingService.getRatings).toHaveBeenCalledWith('user-sophia', 'rating');
    });
  });

  it('renders empty reviews state when no reviews exist', async () => {
    (ratingService.getRatings as jest.Mock).mockResolvedValue({
      averageRating: 0,
      ratingCount: 0,
      ratings: [],
    });

    await render(
      <ThemeProvider>
        <PersonScreen userId="user-sophia" onBack={jest.fn()} onConversation={jest.fn()} />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Reviews & Suggestions')).toBeOnTheScreen();
    expect(
      await screen.findByText('No reviews yet. Complete a call with Sophia to leave a rating and suggestion!'),
    ).toBeOnTheScreen();
  });
});
