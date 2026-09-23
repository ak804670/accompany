import { fill } from '../render.js';

export function renderPhoneVerificationSms(variables: Record<string, string>): string {
  return fill('Your Accompany verification code is {{code}}.', variables);
}
