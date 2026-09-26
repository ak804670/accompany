import { fittedSize, tintIllustration } from '@/assets/illustrations/tint';

describe('unDraw illustrations', () => {
  it('keeps the light accent and swaps it for dark mode', () => {
    const svg = '<svg fill="#7A4E32" viewBox="0 0 200 100"></svg>';
    expect(tintIllustration(svg, '#7A4E32')).toBe(svg);
    expect(tintIllustration(svg, '#C6A588')).toBe('<svg fill="#C6A588" viewBox="0 0 200 100"></svg>');
  });

  it('fits a wide illustration inside the requested size', () => {
    expect(fittedSize('<svg viewBox="0 0 200 100"></svg>', 160)).toEqual({ width: 160, height: 80 });
  });
});
