import { fill } from '../render.js';

export function renderNewMessageEmail(variables: Record<string, string>) {
  return {
    subject: 'New message on Accompany',
    text: fill('{{senderName}} sent you a message on Accompany.', variables),
    html: `<p>${fill('{{senderName}}', variables, true)} sent you a message on Accompany.</p>`,
  };
}
