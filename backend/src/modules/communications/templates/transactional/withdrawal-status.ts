import { fill } from '../render.js';

export function renderWithdrawalStatusEmail(variables: Record<string, string>) {
  return {
    subject: 'Withdrawal update',
    text: fill('Your withdrawal of {{amount}} is now {{status}}.', variables),
    html: `<p>Your withdrawal of ${fill('{{amount}}', variables, true)} is now ${fill('{{status}}', variables, true)}.</p>`,
  };
}
