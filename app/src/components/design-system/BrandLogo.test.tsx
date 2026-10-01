import { render, screen } from '@testing-library/react-native';

import { BrandLogo } from '@/components/design-system/BrandLogo';
import { ThemeProvider } from '@/theme';

describe('BrandLogo', () => {
  it('renders company name and logo image by default', async () => {
    await render(
      <ThemeProvider>
        <BrandLogo />
      </ThemeProvider>
    );

    expect(screen.getByTestId('brand-logo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Accompany')).toBeOnTheScreen();
    expect(screen.getByLabelText('Accompany logo')).toBeOnTheScreen();
    expect(screen.getByText('Accompany')).toBeOnTheScreen();
  });

  it('can hide the wordmark when showWordmark is false', async () => {
    await render(
      <ThemeProvider>
        <BrandLogo showWordmark={false} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('brand-logo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Accompany logo')).toBeOnTheScreen();
    expect(screen.queryByText('Accompany')).toBeNull();
  });

  it('supports app-icon variant and different sizes', async () => {
    await render(
      <ThemeProvider>
        <BrandLogo variant="icon" size="lg" testID="custom-logo" />
      </ThemeProvider>
    );

    expect(screen.getByTestId('custom-logo')).toBeOnTheScreen();
    expect(screen.getByText('Accompany')).toBeOnTheScreen();
  });
});
