import { formatDuration, groupTimeline, isLiveCall, presentCall } from '@/features/calls/call-presentation';

const now = new Date('2026-09-25T09:24:00.000Z');

describe('call presentation', () => {
  it('keeps ringing calls out of history', () => {
    expect(isLiveCall('RINGING')).toBe(true);
    expect(isLiveCall('CONNECTED')).toBe(true);
    expect(isLiveCall('MISSED')).toBe(false);
    expect(isLiveCall('ENDED')).toBe(false);
  });

  it('labels a missed incoming voice call without a duration', () => {
    const view = presentCall({
      id: '1',
      callType: 'AUDIO',
      status: 'MISSED',
      createdAt: '2026-09-25T09:24:00.000Z',
      callerId: 'them',
      receiverId: 'me',
      durationSeconds: 0,
    }, 'me', now);
    expect(view.title).toBe('Missed voice call');
    expect(view.incoming).toBe(true);
    expect(view.duration).toBeNull();
    expect(view.accessibilityLabel).toBe('Missed incoming voice call');
  });

  it('shows duration only for a completed call', () => {
    const view = presentCall({
      id: '2',
      callType: 'VIDEO',
      status: 'ENDED',
      createdAt: '2026-09-24T14:51:00.000Z',
      callerId: 'me',
      receiverId: 'them',
      durationSeconds: 154,
    }, 'me', now);
    expect(view.title).toBe('Video call');
    expect(view.incoming).toBe(false);
    expect(view.duration).toBe(formatDuration(154));
    expect(view.accessibilityLabel).toContain('Completed outgoing video call');
    expect(view.accessibilityLabel).toContain('2 minutes 34 seconds');
  });

  it('keeps each call as its own row and puts a date at the start of the day', () => {
    const rows = groupTimeline([
      { kind: 'message' as const, id: 'm2', at: '2026-09-25T09:00:00.000Z', message: 'later' },
      { kind: 'call' as const, id: 'c2', at: '2026-09-25T08:00:00.000Z', call: { id: 'c2', callType: 'AUDIO' as const, status: 'MISSED', createdAt: '2026-09-25T08:00:00.000Z', callerId: 'a', receiverId: 'b' } },
      { kind: 'message' as const, id: 'm1', at: '2026-09-24T08:00:00.000Z', message: 'earlier' },
    ], new Date('2026-09-25T12:00:00.000Z'));
    expect(rows.map((row) => row.kind)).toEqual(['message', 'call', 'date', 'message', 'date']);
    expect(rows.filter((row) => row.kind === 'date').map((row) => row.kind === 'date' ? row.label : '')).toEqual(['Today', 'Yesterday']);
  });
});
