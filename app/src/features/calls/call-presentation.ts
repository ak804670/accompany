export type CallFacts = {
  id: string;
  callType: 'AUDIO' | 'VIDEO';
  status: string;
  createdAt: string;
  callerId: string;
  receiverId: string;
  durationSeconds?: number;
};

export type CallPresentation = {
  title: string;
  duration: string | null;
  time: string;
  when: string;
  missed: boolean;
  incoming: boolean;
  video: boolean;
  accessibilityLabel: string;
};

const LIVE = new Set(['RINGING', 'ACCEPTED', 'CONNECTING', 'CONNECTED']);

export function isLiveCall(status: string): boolean {
  return LIVE.has(status);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

function durationWords(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (remainder > 0 || minutes === 0) parts.push(`${remainder} second${remainder === 1 ? '' : 's'}`);
  return parts.join(' ');
}

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatChatDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const day = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (day === 0) return 'Today';
  if (day === 1) return 'Yesterday';
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: sameYear ? undefined : 'numeric' });
}

export function formatCallTime(iso: string, now = new Date()): string {
  return `${formatChatDate(iso, now)}, ${formatClockTime(iso)}`;
}

export function presentCall(call: CallFacts, viewerId: string | undefined, now = new Date()): CallPresentation {
  const video = call.callType === 'VIDEO';
  const medium = video ? 'video' : 'voice';
  const incoming = viewerId !== undefined && call.receiverId === viewerId;
  const direction = incoming ? 'incoming' : 'outgoing';
  const completed = call.status === 'ENDED' && (call.durationSeconds ?? 0) > 0;
  const missed = call.status === 'MISSED';
  const title = missed
    ? `Missed ${medium} call`
    : call.status === 'CANCELLED'
      ? `Cancelled ${medium} call`
      : call.status === 'DECLINED'
        ? `Rejected ${medium} call`
        : video ? 'Video call' : 'Voice call';
  const duration = completed ? formatDuration(call.durationSeconds ?? 0) : null;
  const state = missed ? 'Missed' : call.status === 'CANCELLED' ? 'Cancelled' : call.status === 'DECLINED' ? 'Rejected' : completed ? 'Completed' : 'Call';
  const accessibilityLabel = completed
    ? `${state} ${direction} ${medium} call, ${durationWords(call.durationSeconds ?? 0)}`
    : `${state} ${direction} ${medium} call`;
  return {
    title,
    duration,
    time: formatClockTime(call.createdAt),
    when: formatCallTime(call.createdAt, now),
    missed,
    incoming,
    video,
    accessibilityLabel,
  };
}

export type TimelineEntry<TMessage> =
  | { kind: 'message'; id: string; at: string; message: TMessage }
  | { kind: 'call'; id: string; at: string; call: CallFacts };

export type TimelineRow<TMessage> =
  | { kind: 'message'; id: string; message: TMessage }
  | { kind: 'call'; id: string; call: CallFacts }
  | { kind: 'date'; id: string; label: string };

export function groupTimeline<TMessage>(entries: Array<TimelineEntry<TMessage>>, now = new Date()): Array<TimelineRow<TMessage>> {
  const rows: Array<TimelineRow<TMessage>> = [];
  entries.forEach((entry, index) => {
    if (entry.kind === 'message') rows.push({ kind: 'message', id: entry.id, message: entry.message });
    else rows.push({ kind: 'call', id: entry.id, call: entry.call });
    const older = entries[index + 1];
    const day = startOfDay(new Date(entry.at));
    const olderDay = older ? startOfDay(new Date(older.at)) : null;
    if (day !== olderDay) rows.push({ kind: 'date', id: `date-${day}`, label: formatChatDate(entry.at, now) });
  });
  return rows;
}
