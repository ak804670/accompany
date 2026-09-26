import { MoreVertical, Phone, Video } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallEventRow } from '@/components/chat/CallEventRow';
import { CallRequestDialog } from '@/components/chat/CallRequestDialog';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { AppButton } from '@/components/design-system/AppButton';
import { AppDialog } from '@/components/design-system/AppDialog';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { useSession } from '@/features/auth';
import { chatService, type CallEvent, type ChatMessage } from '@/features/chat/chat.service';
import { refreshDiscovery } from '@/features/home/discovery-refresh';
import { callManager } from '@/features/calls/call-manager';
import { groupTimeline, isLiveCall } from '@/features/calls/call-presentation';
import { peopleService } from '@/features/home/people.service';
import { ApiError } from '@/services/api';

type ChatScreenProps = {
  conversationId: string;
  name: string;
  personId?: string | null;
  online: boolean;
  highlightCallId?: string;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
};

export function ChatScreen({ conversationId, name, personId, online, highlightCallId, onBack, onViewProfile }: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [header, setHeader] = useState({ name, personId: personId ?? null, online });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [pendingKind, setPendingKind] = useState<'audio' | 'video' | null>(null);
  const { user } = useSession();
  const [canMessage, setCanMessage] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [status, setStatus] = useState<string>('pending');
  const [blocked, setBlocked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<'block' | 'unblock' | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const allowOlder = useRef(false);
  const loadingOlder = useRef(false);
  const listRef = useRef<FlatList<(ReturnType<typeof groupTimeline<ChatMessage>>)[number]>>(null);

  async function load(next?: string | null) {
    const result = await chatService.messages(conversationId, next);
    setMessages((current) => (next ? [...result.messages, ...current] : result.messages));
    setCursor(result.nextCursor);
  }

  useEffect(() => {
    let cancelled = false;
    allowOlder.current = false;
    chatService.get(conversationId).then((conversation) => {
      if (!cancelled) {
        setHeader({ name: conversation.name, personId: conversation.personId, online: conversation.online });
        setCanMessage(conversation.canMessage);
        setCanRespond(conversation.canRespond);
        setStatus(conversation.status);
      }
    }).catch(() => undefined);
    load()
      .then(() => chatService.markRead(conversationId).catch(() => undefined))
      .catch(() => {
        if (!cancelled) setError("Couldn't load this conversation");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!header.personId) return;
    let active = true;
    const loadCalls = () => {
      void chatService.callsWith(header.personId!).then((items) => {
        if (!active) return;
        setCalls(items);
        const current = callManager.getCurrentCall();
        const match = current ? items.find((item) => item.id === current.id) : undefined;
        if (match) callManager.syncRemote(match.status);
        const ringing = items.find((item) => isLiveCall(item.status));
        if (ringing && !current) {
          const outgoing = ringing.callerId === user?.id;
          const input = { id: ringing.id, name: header.name, video: ringing.callType === 'VIDEO', status: ringing.status };
          if (outgoing) callManager.presentOutgoing(input);
          else callManager.presentIncoming(input);
        }
      }).catch(() => undefined);
    };
    loadCalls();
    const timer = setInterval(loadCalls, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [header.personId]);

  async function startCall(kind: 'audio' | 'video') {
    if (!header.personId) return;
    try {
      const created = await chatService.requestCall(header.personId, kind, conversationId);
      callManager.presentOutgoing({ id: created.id, name: header.name, video: kind === 'video' });
      setCallNotice(null);
      setCalls((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
    } catch (caught) {
      const body = caught instanceof ApiError && caught.body && typeof caught.body === 'object' ? caught.body as { error?: { message?: string } } : null;
      setCallNotice(body?.error?.message || "Couldn't start the call.");
    }
  }

  async function blockPerson() {
    if (!header.personId) return;
    await peopleService.block(header.personId);
    setBlocked(true);
    setCanMessage(false);
    setCanRespond(false);
    setMenuOpen(false);
    setConfirm(null);
    refreshDiscovery();
  }

  async function unblockPerson() {
    if (!header.personId) return;
    await peopleService.unblock(header.personId);
    setBlocked(false);
    setConfirm(null);
    const conversation = await chatService.get(conversationId);
    setCanMessage(conversation.canMessage);
    setCanRespond(conversation.canRespond);
    setStatus(conversation.status);
    refreshDiscovery();
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    const pendingId = `pending-${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      senderId: 'me',
      body,
      createdAt: new Date().toISOString(),
      mine: true,
    };
    setSending(true);
    setSendError(false);
    setFreshId(pendingId);
    setMessages((current) => [...current, pending]);
    setDraft('');
    try {
      const message = await chatService.send(conversationId, body);
      setFreshId(message.id);
      setMessages((current) => current.map((item) => (item.id === pendingId ? message : item)));
    } catch {
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      setDraft(body);
      setFreshId(null);
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  const rows = useMemo(() => groupTimeline([
    ...messages.map((message) => ({ kind: 'message' as const, id: message.id, at: message.createdAt, message })),
    ...calls.filter((call) => !isLiveCall(call.status)).map((call) => ({ kind: 'call' as const, id: call.id, at: call.createdAt, call })),
  ].sort((left, right) => right.at.localeCompare(left.at))), [messages, calls]);

  useEffect(() => {
    if (!highlightCallId) return;
    const index = rows.findIndex((row) => row.kind === 'call' && row.call.id === highlightCallId);
    if (index < 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }, 50);
    return () => clearTimeout(timer);
  }, [highlightCallId, rows]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}>
      <ChatHeader
        name={header.name}
        personId={header.personId}
        online={header.online}
        onBack={onBack}
        actions={
          <View className="flex-row">
            {canMessage && !blocked ? (
              <>
                <AppIconButton icon={Phone} accessibilityLabel="Voice call" onPress={() => setPendingKind('audio')} />
                <AppIconButton icon={Video} accessibilityLabel="Video call" onPress={() => setPendingKind('video')} />
              </>
            ) : null}
            <AppIconButton icon={MoreVertical} accessibilityLabel="Conversation menu" onPress={() => setMenuOpen(true)} />
          </View>
        }
      />
      {callNotice ? <AppText className="px-md py-sm" variant="bodyS" tone="warning">{callNotice}</AppText> : null}
      <View className="flex-1">
        {error ? (
          <View className="flex-1 justify-center gap-md px-lg">
            <AppText variant="bodyM">{error}</AppText>
            <AppButton variant="outline" onPress={() => { setLoading(true); setError(null); void load().catch(() => setError("Couldn't load this conversation")).finally(() => setLoading(false)); }}>Try again</AppButton>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={rows}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            }}
            onScrollBeginDrag={() => {
              allowOlder.current = true;
            }}
            onEndReached={() => {
              if (!allowOlder.current || !cursor || loadingOlder.current) return;
              loadingOlder.current = true;
              void load(cursor).finally(() => {
                loadingOlder.current = false;
              });
            }}
            renderItem={({ item }) => item.kind === 'date'
              ? (
                <View className="my-sm items-center">
                  <View className="rounded-full bg-muted px-md py-xs">
                    <AppText variant="caption" tone="muted">{item.label}</AppText>
                  </View>
                </View>
              )
              : item.kind === 'message'
              ? <MessageBubble body={item.message.body} mine={item.message.mine} appear={item.id === freshId} />
              : (
                <View className="my-xs items-center">
                  <View className="rounded-full border border-border bg-card px-md py-xs">
                    <CallEventRow call={item.call} viewerId={user?.id} />
                  </View>
                </View>
              )}
          />
        )}
        {loading ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <AppText variant="bodyM" tone="muted">Loading messages...</AppText>
          </View>
        ) : null}
      </View>
      {blocked ? (
        <View className="mx-md gap-sm rounded-sm bg-muted p-md">
          <AppText variant="label">Conversation unavailable</AppText>
          <AppText variant="bodyS" tone="muted">You blocked this person.</AppText>
          <AppButton variant="outline" onPress={() => setConfirm('unblock')}>Unblock</AppButton>
        </View>
      ) : canRespond ? (
        <View className="gap-sm px-md">
          <AppText variant="bodyM">Someone would like to connect</AppText>
          <View className="flex-row gap-sm">
            <AppButton variant="outline" className="flex-1" onPress={() => void chatService.reject(conversationId).then(() => onBack())}>Decline</AppButton>
            <AppButton className="flex-1" onPress={() => void chatService.accept(conversationId).then(() => { setCanMessage(true); setCanRespond(false); setStatus('accepted'); })}>Accept</AppButton>
          </View>
        </View>
      ) : canMessage ? (
        <MessageComposer value={draft} sending={sending} failed={sendError} onChange={setDraft} onSend={() => void send()} />
      ) : (
        <View className="mx-md gap-xs rounded-sm bg-muted p-md">
          <AppText variant="label">Request sent</AppText>
          <AppText variant="bodyS" tone="muted">
            {status === 'rejected' ? 'This request was declined.' : `Waiting for ${header.name} to respond.`}
          </AppText>
        </View>
      )}
      <CallRequestDialog
        kind={pendingKind === 'video' ? 'video' : pendingKind === 'audio' ? 'voice' : null}
        name={header.name}
        onClose={() => setPendingKind(null)}
        onConfirm={() => {
          const kind = pendingKind;
          setPendingKind(null);
          if (kind) void startCall(kind);
        }}
      />
      <AppDialog open={menuOpen} onOpenChange={setMenuOpen} title={header.name}>
        <View className="gap-sm">
          <AppButton variant="outline" onPress={() => { setMenuOpen(false); if (header.personId) onViewProfile?.(header.personId); }}>View profile</AppButton>
          <AppButton variant="outline" onPress={() => { setMenuOpen(false); setConfirm(blocked ? 'unblock' : 'block'); }}>{blocked ? 'Unblock user' : 'Block user'}</AppButton>
        </View>
      </AppDialog>
      <AppDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm === 'unblock' ? `Unblock ${header.name}?` : `Block ${header.name}?`} description={confirm === 'unblock' ? 'Communication rules apply again after unblocking.' : 'Blocking this person will stop communication between you.'}>
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={() => setConfirm(null)}>Cancel</AppButton>
          <AppButton className="flex-1" onPress={() => void (confirm === 'unblock' ? unblockPerson() : blockPerson())}>{confirm === 'unblock' ? 'Unblock' : 'Block'}</AppButton>
        </View>
      </AppDialog>
    </View>
  );
}

