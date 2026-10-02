import { render, screen } from '@testing-library/react-native';

import { NavBarGradient } from '@/components/navigation/NavBarGradient';
import { ThemeProvider } from '@/theme';

describe('NavBarGradient', () => {
  it('renders default gradient correctly', async () => {
    await render(
      <ThemeProvider>
        <NavBarGradient testID="test-gradient" />
      </ThemeProvider>
    );

    expect(screen.getByTestId('test-gradient')).toBeOnTheScreen();
  });

  it('renders with custom colors and diagonal direction', async () => {
    await render(
      <ThemeProvider>
        <NavBarGradient
          testID="custom-gradient"
          direction="diagonal"
          colors={['#FF0000', '#00FF00', '#0000FF']}
        />
      </ThemeProvider>
    );

    expect(screen.getByTestId('custom-gradient')).toBeOnTheScreen();
  });
});
