import { fill } from '../render.js';

export function renderMissedCallEmail(variables: Record<string, string>) {
  return {
    subject: 'Missed call on Accompany',
    text: fill('You missed a call from {{callerName}}.', variables),
    html: `<p>You missed a call from ${fill('{{callerName}}', variables, true)}.</p>`,
  };
}
