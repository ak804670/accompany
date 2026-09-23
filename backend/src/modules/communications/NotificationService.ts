import type { CommunicationService } from './CommunicationService.js';

export class NotificationService {
  constructor(private readonly communications: CommunicationService) {}

  scheduleNewMessage(input: { to: string; senderName: string; idempotencyKey: string; userId?: string | null }) {
    return this.communications.schedule({
      channel: 'email',
      template: 'notifications.new-message',
      to: input.to,
      variables: { senderName: input.senderName },
      purpose: 'notification',
      idempotencyKey: input.idempotencyKey,
      userId: input.userId ?? null,
    });
  }

  scheduleMissedCall(input: { to: string; callerName: string; idempotencyKey: string; userId?: string | null }) {
    return this.communications.schedule({
      channel: 'email',
      template: 'notifications.missed-call',
      to: input.to,
      variables: { callerName: input.callerName },
      purpose: 'notification',
      idempotencyKey: input.idempotencyKey,
      userId: input.userId ?? null,
    });
  }
}
