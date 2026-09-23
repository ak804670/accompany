import { render, screen } from '@testing-library/react-native';

import { App } from '@/shell/App';

describe('App', () => {
  it('renders the foundation screen', async () => {
    await render(<App />);

    expect(await screen.findByText('Accompany')).toBeOnTheScreen();
  });
});
