import { fill } from '../render.js';

export function renderPasswordResetEmail(variables: Record<string, string>) {
  return {
    subject: 'Reset your Accompany access',
    text: fill('Use this link to reset access: {{resetUrl}}. If you did not ask for this, ignore this email.', variables),
    html: `<p>Use this link to reset access: <a href="${fill('{{resetUrl}}', variables, true)}">Reset access</a>.</p><p>If you did not ask for this, ignore this email.</p>`,
  };
}
