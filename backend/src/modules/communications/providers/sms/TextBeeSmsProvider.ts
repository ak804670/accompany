import { failureForStatus } from '../errors.js';
import type { SendSmsInput, SendSmsResult, SmsProvider } from './SmsProvider.js';

type FetchLike = typeof fetch;

export type TextBeeConfig = {
  apiKey: string;
  deviceId?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

export class TextBeeSmsProvider implements SmsProvider {
  readonly name = 'textbee';
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;

  constructor(private readonly config: TextBeeConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.baseUrl = config.baseUrl ?? 'https://api.textbee.dev/api/v1';
  }

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/gateway/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [input.to],
        message: input.text,
        ...(this.config.deviceId ? { deviceId: this.config.deviceId } : {}),
      }),
    });

    if (!response.ok) {
      throw failureForStatus(response.status);
    }

    const body = (await response.json()) as { data?: { smsBatchId?: string; success?: boolean } };
    return {
      providerMessageId: body.data?.smsBatchId ?? null,
      providerStatus: body.data?.success === false ? 'failed' : 'accepted',
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/gateway/devices`, {
        headers: { 'x-api-key': this.config.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
