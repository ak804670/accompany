import { renderAuthOtpEmail } from './auth/otp.js';
import { renderPasswordResetEmail } from './auth/password-reset.js';
import { renderWelcomeEmail } from './auth/welcome.js';
import { renderMissedCallEmail } from './notifications/missed-call.js';
import { renderNewMessageEmail } from './notifications/new-message.js';
import { renderAuthOtpSms } from './sms/auth-otp.js';
import { renderPhoneVerificationSms } from './sms/phone-verification.js';
import { renderSecurityAlertSms } from './sms/security-alert.js';
import { renderPaymentSuccessEmail } from './transactional/payment-success.js';
import { renderWithdrawalStatusEmail } from './transactional/withdrawal-status.js';

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const emailTemplates: Record<string, (variables: Record<string, string>) => RenderedEmail> = {
  'auth.otp': renderAuthOtpEmail,
  'auth.welcome': renderWelcomeEmail,
  'auth.password-reset': renderPasswordResetEmail,
  'notifications.new-message': renderNewMessageEmail,
  'notifications.missed-call': renderMissedCallEmail,
  'transactional.payment-success': renderPaymentSuccessEmail,
  'transactional.withdrawal-status': renderWithdrawalStatusEmail,
};

const smsTemplates: Record<string, (variables: Record<string, string>) => string> = {
  'auth.otp': renderAuthOtpSms,
  'auth.phone-verification': renderPhoneVerificationSms,
  'auth.security-alert': renderSecurityAlertSms,
};

export function renderEmailTemplate(template: string, variables: Record<string, string>): RenderedEmail {
  const render = emailTemplates[template];
  if (!render) {
    throw new Error(`Unknown email template ${template}`);
  }
  return render(variables);
}

export function renderSmsTemplate(template: string, variables: Record<string, string>): string {
  const render = smsTemplates[template];
  if (!render) {
    throw new Error(`Unknown SMS template ${template}`);
  }
  return render(variables);
}

export function hasEmailTemplate(template: string): boolean {
  return template in emailTemplates;
}

export function hasSmsTemplate(template: string): boolean {
  return template in smsTemplates;
}
