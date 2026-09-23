import type { SendSmsInput, SendSmsResult, SmsProvider } from './SmsProvider.js';

export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  readonly sent: SendSmsInput[] = [];

  constructor(private readonly revealBody = false) {}

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    this.sent.push(input);
    if (this.revealBody) {
      process.stdout.write(`[communication:mock] channel=sms to=${input.to} template-body=${input.text}\n`);
    }
    return { providerMessageId: `mock-sms-${input.idempotencyKey}`, providerStatus: 'sent' };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
