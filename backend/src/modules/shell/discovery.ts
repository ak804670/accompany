export const DISCOVERY_RADII_KM = [5, 10, 25, 50] as const;
export const DISCOVERY_BATCH_DEFAULT = 10;
export const DISCOVERY_BATCH_MAX = 20;

export function parseDiscoveryLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') return DISCOVERY_BATCH_DEFAULT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DISCOVERY_BATCH_DEFAULT;
  const whole = Math.floor(parsed);
  if (whole < 1) return DISCOVERY_BATCH_DEFAULT;
  return Math.min(whole, DISCOVERY_BATCH_MAX);
}

export type DiscoveryRadiusKm = (typeof DISCOVERY_RADII_KM)[number];

export type PublicRates = {
  chat: number | null;
  audio: number | null;
  video: number | null;
};

export type PublicPerson = {
  userId: string;
  name: string;
  age: number | null;
  bio: string | null;
  mediaId: string | null;
  online: boolean;
  interests: string[];
  sharedInterests: string[];
  rates: PublicRates;
  distanceKm: number | null;
  relationship: PersonRelationship;
  conversationId: string | null;
};

export type PersonRelationship =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'accepted'
  | 'rejected'
  | 'blocked'
  | 'unavailable';

const coordinateKey = /^(latitude|longitude|lat|lng|coordinates)$/i;

export function parseRadiusKm(value: unknown): DiscoveryRadiusKm | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const radius = Number(value);
  if (!DISCOVERY_RADII_KM.includes(radius as DiscoveryRadiusKm)) {
    return null;
  }
  return radius as DiscoveryRadiusKm;
}

export function isDiscoveryRadius(value: number): value is DiscoveryRadiusKm {
  return DISCOVERY_RADII_KM.includes(value as DiscoveryRadiusKm);
}

export function roundDistanceKm(meters: number): number {
  const km = meters / 1000;
  if (km < 10) {
    return Math.round(km * 10) / 10;
  }
  return Math.round(km);
}

export function distanceLabel(distanceKm: number | null): string | null {
  if (distanceKm === null) {
    return null;
  }
  if (distanceKm < 1) {
    return 'Nearby';
  }
  return `${distanceKm} km away`;
}

export function toPublicPerson(row: Record<string, unknown>, extras: {
  age: number | null;
  interests: string[];
  sharedInterests: string[];
  rates: PublicRates;
  distanceKm: number | null;
  relationship: PersonRelationship;
  conversationId: string | null;
}): PublicPerson {
  const person: PublicPerson = {
    userId: String(row.user_id),
    name: String(row.display_name).trim(),
    age: extras.age,
    bio: typeof row.bio === 'string' ? row.bio : null,
    mediaId: row.media_id ? String(row.media_id) : null,
    online: Boolean(row.online),
    interests: extras.interests,
    sharedInterests: extras.sharedInterests,
    rates: extras.rates,
    distanceKm: extras.distanceKm,
    relationship: extras.relationship,
    conversationId: extras.conversationId,
  };
  for (const key of Object.keys(person)) {
    if (coordinateKey.test(key)) {
      throw new Error('public person must not include coordinates');
    }
  }
  return person;
}

export function ratesFromRows(rows: Array<{ communication_type: string; rate_coins: number | string }>): PublicRates {
  const rates: PublicRates = { chat: null, audio: null, video: null };
  for (const row of rows) {
    const amount = Number(row.rate_coins);
    if (row.communication_type === 'message') rates.chat = amount;
    if (row.communication_type === 'voice_call') rates.audio = amount;
    if (row.communication_type === 'video_call') rates.video = amount;
  }
  return rates;
}

export function relationshipFrom(input: {
  viewerId: string;
  blockedByViewer: boolean;
  blockedViewer: boolean;
  status: string | null;
  createdBy: string | null;
}): PersonRelationship {
  if (input.blockedByViewer) return 'blocked';
  if (input.blockedViewer) return 'unavailable';
  if (!input.status || !input.createdBy) return 'none';
  if (input.status === 'pending') {
    return input.createdBy === input.viewerId ? 'pending_outgoing' : 'pending_incoming';
  }
  if (input.status === 'active') return 'accepted';
  if (input.status === 'rejected') return 'rejected';
  return 'none';
}
