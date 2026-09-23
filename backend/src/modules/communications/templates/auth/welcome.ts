import { fill } from '../render.js';

export function renderWelcomeEmail(variables: Record<string, string>) {
  return {
    subject: 'Welcome to Accompany',
    text: fill('Welcome, {{name}}. You can start a conversation whenever you are ready.', variables),
    html: `<p>Welcome, ${fill('{{name}}', variables, true)}.</p><p>You can start a conversation whenever you are ready.</p>`,
  };
}
