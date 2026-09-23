export type SendEmailInput = {
  to: string;
  from: { email: string; name: string };
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type SendEmailResult = {
  providerMessageId: string | null;
  providerStatus: string;
};

export interface EmailProvider {
  readonly name: string;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
  isHealthy(): Promise<boolean>;
}
