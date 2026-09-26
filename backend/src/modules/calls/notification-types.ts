export const NOTIFICATION_TYPES = [
  'CALL_INCOMING',
  'CALL_MISSED',
  'CALL_DECLINED',
  'CALL_ENDED',
  'MESSAGE_RECEIVED',
  'REQUEST_RECEIVED',
  'REQUEST_ACCEPTED',
  'COIN_PURCHASE_SUCCESS',
  'WITHDRAWAL_REQUESTED',
  'WITHDRAWAL_COMPLETED',
  'WITHDRAWAL_FAILED',
  'COINS_RECEIVED',
  'LOW_BALANCE',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type PushMessage = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
};
