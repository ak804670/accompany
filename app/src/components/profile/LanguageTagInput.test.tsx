import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';
import { LanguageTagInput } from './LanguageTagInput';

describe('LanguageTagInput', () => {
  it('renders available regional languages and search input', async () => {
    const onToggle = jest.fn();
    const onRemove = jest.fn();

    await render(
      <ThemeProvider>
        <LanguageTagInput selected={['en']} onToggle={onToggle} onRemove={onRemove} />
      </ThemeProvider>
    );

    expect(screen.getByText('Choose languages')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Hindi (हिन्दी)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bengali (বাংলা)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tamil (தமிழ்)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Telugu (తెలుగు)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove English' })).toBeOnTheScreen();
  });

  it('filters languages by search query in English and native scripts', async () => {
    const onToggle = jest.fn();
    const onRemove = jest.fn();

    await render(
      <ThemeProvider>
        <LanguageTagInput selected={[]} onToggle={onToggle} onRemove={onRemove} />
      </ThemeProvider>
    );

    const searchInput = screen.getByLabelText('Search languages');
    await userEvent.type(searchInput, 'marathi');

    expect(screen.getByRole('button', { name: 'Marathi (मराठी)' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tamil (தமிழ்)' })).toBeNull();
  });

  it('calls onToggle when a language pill is pressed', async () => {
    const onToggle = jest.fn();
    const onRemove = jest.fn();

    await render(
      <ThemeProvider>
        <LanguageTagInput selected={[]} onToggle={onToggle} onRemove={onRemove} />
      </ThemeProvider>
    );

    await userEvent.press(screen.getByRole('button', { name: 'Punjabi (ਪੰਜਾਬੀ)' }));
    expect(onToggle).toHaveBeenCalledWith('pa');
  });

  it('calls onRemove when a selected tag close button is pressed', async () => {
    const onToggle = jest.fn();
    const onRemove = jest.fn();

    await render(
      <ThemeProvider>
        <LanguageTagInput selected={['hi']} onToggle={onToggle} onRemove={onRemove} />
      </ThemeProvider>
    );

    await userEvent.press(screen.getByRole('button', { name: 'Remove Hindi' }));
    expect(onRemove).toHaveBeenCalledWith('hi');
  });

  it('does not allow adding custom items when typing non-existent language', async () => {
    const onToggle = jest.fn();
    const onRemove = jest.fn();

    await render(
      <ThemeProvider>
        <LanguageTagInput selected={[]} onToggle={onToggle} onRemove={onRemove} />
      </ThemeProvider>
    );

    const searchInput = screen.getByLabelText('Search languages');
    await userEvent.type(searchInput, 'Klingon');

    expect(screen.getByText('No matching languages found')).toBeOnTheScreen();
    expect(screen.queryByText(/Add "Klingon"/i)).toBeNull();
  });
});
