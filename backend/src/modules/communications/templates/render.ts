function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function fill(template: string, variables: Record<string, string>, escapeHtml = false): string {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined) {
      throw new Error(`Missing template variable ${key}`);
    }
    return escapeHtml ? htmlEscape(value) : value;
  });
}
