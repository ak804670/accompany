import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentOrder = {
  provider: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: { purchaseId: string; amountMinor: number; currency: string }): Promise<PaymentOrder>;
  verifyWebhook(rawBody: string, signature: string | undefined): boolean;
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';

  constructor(private readonly webhookSecret: string) {}

  async createOrder(input: { purchaseId: string; amountMinor: number; currency: string }): Promise<PaymentOrder> {
    return {
      provider: this.name,
      providerOrderId: input.purchaseId,
      amountMinor: input.amountMinor,
      currency: input.currency,
    };
  }

  verifyWebhook(rawBody: string, signature: string | undefined): boolean {
    if (!this.webhookSecret || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const left = Buffer.from(expected);
    const right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
