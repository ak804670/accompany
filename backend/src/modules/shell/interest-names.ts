const interestName = /^[\p{L}\p{N}][\p{L}\p{N} '&+-]{1,39}$/u;

export function normalizeInterestName(value: string): string | null {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!interestName.test(name)) {
    return null;
  }
  return name;
}

export function interestSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'interest';
}
