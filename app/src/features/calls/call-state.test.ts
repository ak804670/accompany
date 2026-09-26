import { isTerminal, reduceCall } from '@/features/calls/call-state';

describe('call state', () => {
  it('moves a ringing call through answer and connect', () => {
    expect(reduceCall('RINGING', 'answer')).toBe('CONNECTING');
    expect(reduceCall('CONNECTING', 'connect')).toBe('CONNECTED');
  });

  it('ends from the active states once', () => {
    expect(reduceCall('CONNECTED', 'end')).toBe('ENDING');
    expect(reduceCall('ENDING', 'end')).toBe('ENDED');
    expect(reduceCall('ENDED', 'end')).toBe('ENDED');
    expect(isTerminal('ENDED')).toBe(true);
  });

  it('ignores a hangup after the call was already rejected', () => {
    expect(reduceCall('RINGING', 'reject')).toBe('REJECTED');
    expect(reduceCall('REJECTED', 'end')).toBe('REJECTED');
  });
});
