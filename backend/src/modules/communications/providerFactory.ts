import type { NodeEnv } from '../../config/env.js';
import type { CommunicationConfig } from '../../config/communication.js';
import { MailjetEmailProvider } from './providers/email/MailjetEmailProvider.js';
import { MockEmailProvider } from './providers/email/MockEmailProvider.js';
import type { EmailProvider } from './providers/email/EmailProvider.js';
import { MockSmsProvider } from './providers/sms/MockSmsProvider.js';
import { TextBeeSmsProvider } from './providers/sms/TextBeeSmsProvider.js';
import type { SmsProvider } from './providers/sms/SmsProvider.js';

const emailProviders = {
  mailjet(config: CommunicationConfig): EmailProvider {
    if (!config.mailjet) {
      throw new Error('MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL, and MAILJET_FROM_NAME are required');
    }
    return new MailjetEmailProvider(config.mailjet);
  },
  mock(config: CommunicationConfig): EmailProvider {
    return new MockEmailProvider(config.revealMockDelivery);
  },
};

const smsProviders = {
  textbee(config: CommunicationConfig): SmsProvider {
    if (!config.textbee) {
      throw new Error('TEXTBEE_API_KEY is required');
    }
    return new TextBeeSmsProvider(config.textbee);
  },
  mock(config: CommunicationConfig): SmsProvider {
    return new MockSmsProvider(config.revealMockDelivery);
  },
};

export function createEmailProvider(config: CommunicationConfig, nodeEnv: NodeEnv): EmailProvider {
  if (nodeEnv !== 'development' && config.emailProvider === 'mock') {
    throw new Error('EMAIL_PROVIDER=mock is only available in development');
  }
  const factory = emailProviders[config.emailProvider];
  return factory(config);
}

export function createSmsProvider(config: CommunicationConfig, nodeEnv: NodeEnv): SmsProvider {
  if (nodeEnv !== 'development' && config.smsProvider === 'mock') {
    throw new Error('SMS_PROVIDER=mock is only available in development');
  }
  const factory = smsProviders[config.smsProvider];
  return factory(config);
}
