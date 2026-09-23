export type SendSmsInput = {
  to: string;
  text: string;
  idempotencyKey: string;
};

export type SendSmsResult = {
  providerMessageId: string | null;
  providerStatus: string;
};

export interface SmsProvider {
  readonly name: string;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
  isHealthy(): Promise<boolean>;
}
