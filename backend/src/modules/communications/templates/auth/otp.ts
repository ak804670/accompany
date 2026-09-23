import { fill } from '../render.js';

export function renderAuthOtpEmail(variables: Record<string, string>) {
  return {
    subject: 'Your Accompany code',
    text: fill('Your Accompany code is {{code}}. It expires soon. If you did not ask for it, ignore this email.', variables),
    html: `<p>Your Accompany code is <strong>${fill('{{code}}', variables, true)}</strong>.</p><p>It expires soon. If you did not ask for it, ignore this email.</p>`,
  };
}
