import { xml as blockedEmpty } from '@/assets/illustrations/blocked/empty';
import { xml as callsEmpty } from '@/assets/illustrations/calls/empty';
import { xml as chatEmpty } from '@/assets/illustrations/chat/empty';
import { xml as chatRequest } from '@/assets/illustrations/chat/request';
import { xml as chatRequests } from '@/assets/illustrations/chat/requests';
import { xml as errorGeneric } from '@/assets/illustrations/errors/generic';
import { xml as loading } from '@/assets/illustrations/errors/loading';
import { xml as errorNetwork } from '@/assets/illustrations/errors/offline';
import { xml as homeEmpty } from '@/assets/illustrations/home/empty';
import { xml as homeFiltered } from '@/assets/illustrations/home/filtered';
import { xml as homeLocation } from '@/assets/illustrations/home/location';
import { xml as welcome } from '@/assets/illustrations/onboarding/welcome';
import { xml as profilePhoto } from '@/assets/illustrations/profile/add-photo';
import { xml as walletEmpty } from '@/assets/illustrations/wallet/empty';
import { xml as walletFailed } from '@/assets/illustrations/wallet/failed';
import { xml as walletSuccess } from '@/assets/illustrations/wallet/success';

/**
 * unDraw illustrations used by Accompany.
 * welcome: Social friends — people available to each other
 * home-empty: Empty street — nobody available right now
 * home-filtered: Searching — filters found no one
 * home-location: Location search — nearby needs location
 * chat-empty: Begin chat — no conversation yet
 * chat-requests: Empty mailbox — no requests waiting
 * chat-request: Message sent — a request is waiting for a reply
 * calls-empty: Phone call — no call history
 * wallet-empty: Empty wallet — no coin activity
 * wallet-success: Confirmed — a payment or withdrawal was accepted
 * wallet-failed: Warning — a payment or withdrawal did not start
 * profile-photo: Photograph — add a real photo
 * blocked-empty: Protection — nobody is blocked
 * error-network: No signal — offline
 * error-generic: Server error — the request failed
 * loading: Loading — a screen is still fetching
 */
export const illustrationRegistry = {
  welcome,
  'home-empty': homeEmpty,
  'home-filtered': homeFiltered,
  'home-location': homeLocation,
  'chat-empty': chatEmpty,
  'chat-requests': chatRequests,
  'chat-request': chatRequest,
  'calls-empty': callsEmpty,
  'wallet-empty': walletEmpty,
  'wallet-success': walletSuccess,
  'wallet-failed': walletFailed,
  'profile-photo': profilePhoto,
  'blocked-empty': blockedEmpty,
  'error-network': errorNetwork,
  'error-generic': errorGeneric,
  loading,
} as const;

export type IllustrationName = keyof typeof illustrationRegistry;

export function illustrationForError(message: string): IllustrationName {
  const text = message.toLowerCase();
  if (text.includes('offline') || text.includes('internet') || text.includes('network')) return 'error-network';
  if (text.includes('location')) return 'home-location';
  return 'error-generic';
}
