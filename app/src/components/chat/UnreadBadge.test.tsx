import { render, screen } from '@testing-library/react-native';

import { UnreadBadge } from '@/components/chat/UnreadBadge';

describe('UnreadBadge', () => {
  it('renders nothing when count is 0 or negative', async () => {
    const resZero = await render(<UnreadBadge count={0} />);
    expect(resZero.toJSON()).toBeNull();

    const resNegative = await render(<UnreadBadge count={-5} />);
    expect(resNegative.toJSON()).toBeNull();
  });

  it('renders count when count is positive', async () => {
    await render(<UnreadBadge count={1} testID="test-badge" />);

    expect(screen.getByTestId('test-badge')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 unread')).toBeOnTheScreen();
  });

  it('renders 99+ when count exceeds 99', async () => {
    await render(<UnreadBadge count={120} testID="test-badge-max" />);

    expect(screen.getByTestId('test-badge-max')).toBeOnTheScreen();
    expect(screen.getByText('99+')).toBeOnTheScreen();
    expect(screen.getByLabelText('120 unread')).toBeOnTheScreen();
  });

  it('supports size="sm" and size="md"', async () => {
    const { rerender } = await render(<UnreadBadge count={3} size="sm" testID="badge-size" />);
    expect(screen.getByTestId('badge-size')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();

    await rerender(<UnreadBadge count={3} size="md" testID="badge-size" />);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('supports variant="solid" and variant="subtle"', async () => {
    const { rerender } = await render(<UnreadBadge count={5} variant="solid" testID="badge-variant" />);
    expect(screen.getByTestId('badge-variant')).toBeOnTheScreen();

    await rerender(<UnreadBadge count={5} variant="subtle" testID="badge-variant" />);
    expect(screen.getByTestId('badge-variant')).toBeOnTheScreen();
  });
});

