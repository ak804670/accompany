import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { CallRatingDialog } from './CallRatingDialog';
import { callManager } from '@/features/calls/call-manager';
import { ratingService } from '@/features/ratings/rating.service';
import { ThemeProvider } from '@/theme';

jest.mock('@/features/ratings/rating.service', () => ({
  ratingService: {
    create: jest.fn().mockResolvedValue({ ok: true }),
    getRatings: jest.fn().mockResolvedValue({ averageRating: 5, ratingCount: 1, ratings: [] }),
  },
}));

jest.mock('@/components/home/PersonAvatar', () => ({
  PersonAvatar: () => null,
}));

describe('CallRatingDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callManager.clearPendingRating();
  });

  it('renders nothing when there is no pending rating', async () => {
    const { queryByText } = await render(
      <ThemeProvider>
        <CallRatingDialog pending={null} />
      </ThemeProvider>,
    );

    expect(queryByText('Rate your call')).toBeNull();
  });

  it('renders when pending rating is set and allows submitting feedback', async () => {
    const onSubmitSuccess = jest.fn();

    await render(
      <ThemeProvider>
        <CallRatingDialog
          pending={{
            callId: 'call-123',
            userId: 'user-456',
            name: 'Sophia',
          }}
          onSubmitSuccess={onSubmitSuccess}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Rate your call')).toBeOnTheScreen();
    expect(screen.getByText('Sophia')).toBeOnTheScreen();
    expect(screen.getByText('Excellent!')).toBeOnTheScreen();

    // Change rating to 4 stars
    const fourStarButton = screen.getByLabelText('4 stars');
    await fireEvent.press(fourStarButton);
    expect(screen.getByText('Very Good')).toBeOnTheScreen();

    // Type comment
    const input = screen.getByLabelText('Feedback comments');
    await fireEvent.changeText(input, 'Great conversation and very helpful tips!');

    // Submit rating
    const submitButton = screen.getByRole('button', { name: 'Submit Rating' });
    await fireEvent.press(submitButton);

    await waitFor(() => {
      expect(ratingService.create).toHaveBeenCalledWith({
        ratedUserId: 'user-456',
        callId: 'call-123',
        rating: 4,
        comment: 'Great conversation and very helpful tips!',
      });
      expect(onSubmitSuccess).toHaveBeenCalled();
    });
  });

  it('allows skipping the rating dialog', async () => {
    const onClose = jest.fn();

    await render(
      <ThemeProvider>
        <CallRatingDialog
          pending={{
            callId: 'call-123',
            userId: 'user-456',
            name: 'Sophia',
          }}
          onClose={onClose}
        />
      </ThemeProvider>,
    );

    const skipButton = screen.getByRole('button', { name: 'Skip for now' });
    await fireEvent.press(skipButton);

    expect(ratingService.create).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
