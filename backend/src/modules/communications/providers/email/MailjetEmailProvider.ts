import { failureForStatus, ProviderRequestError } from '../errors.js';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './EmailProvider.js';

type FetchLike = typeof fetch;

export type MailjetConfig = {
  apiKey: string;
  apiSecret: string;
  fromEmail: string;
  fromName: string;
  fetchImpl?: FetchLike;
};

export class MailjetEmailProvider implements EmailProvider {
  readonly name = 'mailjet';
  private readonly fetchImpl: FetchLike;

  constructor(private readonly config: MailjetConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const response = await this.fetchImpl('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: input.from.email, Name: input.from.name },
            To: [{ Email: input.to }],
            Subject: input.subject,
            TextPart: input.text,
            HTMLPart: input.html,
            CustomID: input.idempotencyKey,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw failureForStatus(response.status);
    }

    const body = (await response.json()) as {
      Messages?: Array<{ Status?: string; To?: Array<{ MessageID?: number | string }> }>;
    };
    const message = body.Messages?.[0];
    if (message?.Status && message.Status !== 'success') {
      throw new ProviderRequestError(false, 'provider_rejected');
    }
    const messageId = message?.To?.[0]?.MessageID;
    return {
      providerMessageId: messageId === undefined ? null : String(messageId),
      providerStatus: message?.Status ?? 'success',
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.fetchImpl('https://api.mailjet.com/v3/REST/apikey', {
        headers: {
          authorization: `Basic ${Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64')}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
