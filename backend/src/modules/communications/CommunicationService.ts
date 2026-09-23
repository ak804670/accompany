import { randomUUID } from 'node:crypto';

import type { EmailProvider } from './providers/email/EmailProvider.js';
import type { SmsProvider } from './providers/sms/SmsProvider.js';
import { encryptVariables } from './payload.js';
import type { CommunicationStore } from './store.js';
import { hasEmailTemplate, hasSmsTemplate } from './templates/index.js';
import type { ScheduleInput } from './types.js';

export class CommunicationService {
  constructor(
    private readonly store: CommunicationStore,
    private readonly email: EmailProvider,
    private readonly sms: SmsProvider,
    private readonly encryptionSecret: string,
  ) {}

  async schedule(input: ScheduleInput): Promise<{ communicationId: string }> {
    if (input.channel === 'email' && !hasEmailTemplate(input.template)) {
      throw new Error(`Unknown email template ${input.template}`);
    }
    if (input.channel === 'sms' && !hasSmsTemplate(input.template)) {
      throw new Error(`Unknown SMS template ${input.template}`);
    }

    const id = randomUUID();
    const provider = input.channel === 'email' ? this.email.name : this.sms.name;
    const result = await this.store.enqueue(input.db ?? null, {
      id,
      userId: input.userId ?? null,
      channel: input.channel,
      provider,
      purpose: input.purpose,
      recipient: input.to,
      idempotencyKey: input.idempotencyKey,
      template: input.template,
      variablesEnc: encryptVariables(this.encryptionSecret, input.variables),
      metadata: input.metadata ?? {},
    });
    return { communicationId: result.id };
  }
}
