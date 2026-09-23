export function maskRecipient(channel: 'email' | 'sms', destination: string): string {
  if (channel === 'email') {
    const [name, domain] = destination.split('@');
    return `${name?.slice(0, 1) ?? '*'}***@${domain ?? 'invalid'}`;
  }
  return `${destination.slice(0, 3)}***${destination.slice(-2)}`;
}
