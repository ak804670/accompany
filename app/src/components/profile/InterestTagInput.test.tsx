import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';
import { InterestTagInput } from './InterestTagInput';

describe('InterestTagInput', () => {
  const defaultProps = {
    options: [
      { id: '11111111-1111-4111-8111-111111111111', name: 'Singing', slug: 'singing' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Smoking', slug: 'smoking' },
    ],
    selected: [],
    query: '',
    onQueryChange: jest.fn(),
    onToggle: jest.fn(),
    onAddCustom: jest.fn(),
    onRemove: jest.fn(),
  };

  it('renders initial 3 items and "+ More" button when initialLimit is 3', async () => {
    await render(
      <ThemeProvider>
        <InterestTagInput {...defaultProps} initialLimit={3} />
      </ThemeProvider>
    );

    expect(screen.getByText('You might like...')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Museums & galleries' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Skiing' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crafts' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '+ More' })).toBeOnTheScreen();

    // The 4th default item should NOT be shown initially
    expect(screen.queryByRole('button', { name: 'Country Music' })).toBeNull();
  });

  it('expands all options and shows "Show less" when "+ More" is clicked', async () => {
    await render(
      <ThemeProvider>
        <InterestTagInput {...defaultProps} initialLimit={3} />
      </ThemeProvider>
    );

    expect(screen.queryByRole('button', { name: 'Country Music' })).toBeNull();

    await userEvent.press(screen.getByRole('button', { name: '+ More' }));

    // Now all options should be visible
    expect(screen.getByRole('button', { name: 'Country Music' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Yoga' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Singing' })).toBeOnTheScreen();

    // "+ More" is gone, replaced by "Show less"
    expect(screen.queryByRole('button', { name: '+ More' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show less' })).toBeOnTheScreen();

    // Clicking "Show less" collapses it back
    await userEvent.press(screen.getByRole('button', { name: 'Show less' }));

    expect(screen.queryByRole('button', { name: 'Country Music' })).toBeNull();
    expect(screen.getByRole('button', { name: '+ More' })).toBeOnTheScreen();
  });

  it('always displays selected items in the collapsed view', async () => {
    await render(
      <ThemeProvider>
        <InterestTagInput
          {...defaultProps}
          initialLimit={3}
          selected={[
            { id: '11111111-1111-4111-8111-111111111111', name: 'Singing' },
            { id: '22222222-2222-4222-8222-222222222222', name: 'Smoking' },
          ]}
        />
      </ThemeProvider>
    );

    // Selected items should be prioritized and shown
    expect(screen.getByRole('button', { name: 'Singing' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Smoking' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Museums & galleries' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '+ More' })).toBeOnTheScreen();

    // Item not in visible limit is not shown
    expect(screen.queryByRole('button', { name: 'Skiing' })).toBeNull();
  });

  it('shows all search results when searching without a "+ More" button', async () => {
    await render(
      <ThemeProvider>
        <InterestTagInput {...defaultProps} initialLimit={3} query="c" />
      </ThemeProvider>
    );

    // Matches with 'c' should be rendered
    expect(screen.getByRole('button', { name: 'Country Music' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Coffee' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '+ More' })).toBeNull();
  });

  it('renders all items without "+ More" button when initialLimit is not provided', async () => {
    await render(
      <ThemeProvider>
        <InterestTagInput {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Museums & galleries' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Country Music' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Singing' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '+ More' })).toBeNull();
  });

  it('calls onToggle when an interest pill is pressed', async () => {
    const onToggle = jest.fn();

    await render(
      <ThemeProvider>
        <InterestTagInput {...defaultProps} initialLimit={3} onToggle={onToggle} />
      </ThemeProvider>
    );

    await userEvent.press(screen.getByRole('button', { name: 'Skiing' }));
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Skiing',
        slug: 'skiing',
      })
    );
  });
});
