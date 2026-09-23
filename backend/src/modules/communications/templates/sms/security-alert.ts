import { fill } from '../render.js';

export function renderSecurityAlertSms(variables: Record<string, string>): string {
  return fill('Accompany security alert: {{action}}. If this was not you, contact support.', variables);
}
