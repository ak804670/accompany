import type { EmailProvider, SendEmailInput, SendEmailResult } from './EmailProvider.js';

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock';
  readonly sent: SendEmailInput[] = [];

  constructor(private readonly revealBody = false) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    this.sent.push(input);
    if (this.revealBody) {
      process.stdout.write(`[communication:mock] channel=email to=${input.to} template-body=${input.text}\n`);
    }
    return { providerMessageId: `mock-email-${input.idempotencyKey}`, providerStatus: 'sent' };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
