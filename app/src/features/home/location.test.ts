import { formatAddress } from './location';

describe('formatAddress', () => {
  it('returns null for null or undefined address', () => {
    expect(formatAddress(null)).toBeNull();
    expect(formatAddress(undefined)).toBeNull();
  });

  it('formats city and region', () => {
    expect(
      formatAddress({
        city: 'Bengaluru',
        region: 'Karnataka',
        country: 'India',
      })
    ).toBe('Bengaluru, Karnataka');
  });

  it('falls back to district when city is absent', () => {
    expect(
      formatAddress({
        district: 'South Delhi',
        region: 'Delhi',
      })
    ).toBe('South Delhi, Delhi');
  });

  it('falls back to subregion when city and district are absent', () => {
    expect(
      formatAddress({
        subregion: 'Bandra',
        region: 'Maharashtra',
      })
    ).toBe('Bandra, Maharashtra');
  });

  it('formats city only when region is absent', () => {
    expect(
      formatAddress({
        city: 'Singapore',
      })
    ).toBe('Singapore');
  });

  it('falls back to country when no primary or region is provided', () => {
    expect(
      formatAddress({
        country: 'India',
      })
    ).toBe('India');
  });
});
