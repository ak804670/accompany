export const CALL_STATUSES = [
  'RINGING',
  'ACCEPTED',
  'CONNECTING',
  'CONNECTED',
  'ENDED',
  'DECLINED',
  'MISSED',
  'CANCELLED',
  'FAILED',
] as const;

export type CallStatus = (typeof CALL_STATUSES)[number];

const NEXT: Record<CallStatus, readonly CallStatus[]> = {
  RINGING: ['ACCEPTED', 'DECLINED', 'MISSED', 'CANCELLED', 'FAILED'],
  ACCEPTED: ['CONNECTING', 'ENDED', 'FAILED'],
  CONNECTING: ['CONNECTED', 'ENDED', 'FAILED'],
  CONNECTED: ['ENDED', 'FAILED'],
  ENDED: [],
  DECLINED: [],
  MISSED: [],
  CANCELLED: [],
  FAILED: [],
};

export function canTransition(from: CallStatus, to: CallStatus): boolean {
  return NEXT[from].includes(to);
}

export function roomName(callId: string): string {
  return `accompany_call_${callId}`;
}

export function chargeKey(callId: string, period: number): string {
  return `${callId}:${period}`;
}

export function billableCoins(ratePerMinute: number, seconds: number): number {
  if (ratePerMinute <= 0 || seconds <= 0) return 0;
  return ratePerMinute * Math.ceil(seconds / 60);
}

export function outstandingCoins(total: number, charged: number): number {
  return Math.max(0, total - charged);
}

export function billingPeriod(elapsedSeconds: number, intervalSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.floor((elapsedSeconds - 1) / intervalSeconds);
}
