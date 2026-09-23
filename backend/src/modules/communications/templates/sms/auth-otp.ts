import { fill } from '../render.js';

export function renderAuthOtpSms(variables: Record<string, string>): string {
  return fill('Your Accompany code is {{code}}.', variables);
}
