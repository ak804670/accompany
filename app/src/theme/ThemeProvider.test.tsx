import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { ThemeProvider, useTheme } from '@/theme';

function ThemeProbe() {
  const { preference, resolvedScheme, setPreference } = useTheme();

  return (
    <>
      <Text testID="preference">{preference}</Text>
      <Text testID="scheme">{resolvedScheme}</Text>
      <Pressable testID="set-dark" onPress={() => setPreference('dark')} />
    </>
  );
}

describe('ThemeProvider', () => {
  it('defaults to the system preference and can switch themes', async () => {
    await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByTestId('preference')).toHaveTextContent('system');

    await fireEvent.press(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('preference')).toHaveTextContent('dark');
    expect(screen.getByTestId('scheme')).toHaveTextContent('dark');
  });
});
