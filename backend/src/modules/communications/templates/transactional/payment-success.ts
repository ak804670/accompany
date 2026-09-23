import { fill } from '../render.js';

export function renderPaymentSuccessEmail(variables: Record<string, string>) {
  return {
    subject: 'Payment received',
    text: fill('We received your payment of {{amount}} {{currency}}.', variables),
    html: `<p>We received your payment of ${fill('{{amount}}', variables, true)} ${fill('{{currency}}', variables, true)}.</p>`,
  };
}
