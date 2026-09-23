import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { AppButton, type AppButtonVariant } from '@/components/design-system/AppButton';
import { ThemeProvider } from '@/theme';

const variants: AppButtonVariant[] = [
  'primary',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'success',
  'link',
  'icon',
];

function renderButton(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AppButton', () => {
  it('renders its label', async () => {
    await renderButton(<AppButton>Continue</AppButton>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it.each(variants)('renders the %s variant', async (variant) => {
    await renderButton(<AppButton variant={variant}>Continue</AppButton>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('disables itself while loading', async () => {
    await renderButton(<AppButton loading>Continue</AppButton>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});
