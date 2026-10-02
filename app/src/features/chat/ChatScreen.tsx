import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { AccompanyIllustration } from '@/components/illustrations/AccompanyIllustration';
import { IllustratedState } from '@/components/illustrations/IllustratedState';
import { illustrationForError } from '@/assets/illustrations/illustrationRegistry';
import { useSession } from '@/features/auth';
import { chatRepository } from '@/database/repositories/chatRepository';
import { messageRepository } from '@/database/repositories/messageRepository';
import { chatPanels, mergeInitialMessages, phaseForCachedThread, type ConversationPhase } from '@/features/chat/chat-panels';
import { chatService, type CallEvent, type ChatMessage, type ConversationStatus } from '@/features/chat/chat.service';
import { refreshDiscovery } from '@/features/home/discovery-refresh';
import { callManager } from '@/features/calls/call-manager';
import { callService } from '@/features/calls/call.service';
import { groupTimeline, isLiveCall } from '@/features/calls/call-presentation';
import { peopleService } from '@/features/home/people.service';
import { ApiError } from '@/services/api';
import { ChatEvents, socketService, type LiveMessage } from '@/services/realtime/socket';
import { getGiphyDialog, getGiphyMessageUrl, giphyMessageBody } from '@/features/chat/giphy';

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
  const { user } = useSession();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const cachedMessages = user?.id ? messageRepository.peek(user.id, conversationId) : null;
  const cachedConversation = user?.id ? chatRepository.peek(user.id, conversationId) : null;
  const hasInitialCache = Boolean(cachedConversation) || (cachedMessages?.length ?? 0) > 0;
  const [messages, setMessages] = useState<ChatMessage[]>(cachedMessages ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [header, setHeader] = useState({
    name: cachedConversation?.name ?? name,
    personId: cachedConversation?.personId ?? personId ?? null,
    online: cachedConversation?.online ?? online,
  });
  const [draft, setDraft] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>(phaseForCachedThread(hasInitialCache));
  const [error, setError] = useState<string | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [pendingKind, setPendingKind] = useState<'audio' | 'video' | null>(null);
  const [canMessage, setCanMessage] = useState(cachedConversation?.canMessage ?? false);
  const [canRespond, setCanRespond] = useState(cachedConversation?.canRespond ?? false);
  const [status, setStatus] = useState<ConversationStatus | null>(cachedConversation?.status ?? null);
  const [blocked, setBlocked] = useState(Boolean(cachedConversation?.blocked));
  const [confirm, setConfirm] = useState<'block' | 'unblock' | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const openedConversation = useRef(conversationId);
  if (openedConversation.current !== conversationId) {
    const nextMessages = user?.id ? messageRepository.peek(user.id, conversationId) : null;
    const nextConversation = user?.id ? chatRepository.peek(user.id, conversationId) : null;
    const hasCache = Boolean(nextConversation) || (nextMessages?.length ?? 0) > 0;
    openedConversation.current = conversationId;
    setPhase(phaseForCachedThread(hasCache));
    setError(null);
    setMessages(nextMessages ?? []);
    setCalls([]);
    setCursor(null);
    setStatus(nextConversation?.status ?? null);
    setCanMessage(nextConversation?.canMessage ?? false);
    setCanRespond(nextConversation?.canRespond ?? false);
    setBlocked(Boolean(nextConversation?.blocked));
    setHeader({
      name: nextConversation?.name ?? name,
      personId: nextConversation?.personId ?? personId ?? null,
      online: nextConversation?.online ?? online,
    });
  }
  const allowOlder = useRef(false);
  const loadingOlder = useRef(false);
  const loadGeneration = useRef(0);
  const listRef = useRef<FlatList<(ReturnType<typeof groupTimeline<ChatMessage>>)[number]>>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function loadOlder(next: string | null) {
    if (user?.id && messages.length > 0) {
      const local = await messageRepository.olderThan(user.id, conversationId, messages[0].createdAt);
      const ids = new Set(messages.map((item) => item.id));
      const older = local.filter((item) => !ids.has(item.id));
      if (older.length > 0) {
        setMessages((current) => {
          const seen = new Set(current.map((item) => item.id));
          return [...older.filter((item) => !seen.has(item.id)), ...current];
        });
        return;
      }
    }
    if (!next) return;
    const result = await chatService.messages(conversationId, next);
    if (user?.id) await messageRepository.saveMany(user.id, conversationId, result.messages);
    setMessages((current) => {
      const ids = new Set(current.map((item) => item.id));
      return [...result.messages.filter((item) => !ids.has(item.id)), ...current];
    });
    setCursor(result.nextCursor);
  }

  const reload = useCallback((silent = false) => {
    const ticket = ++loadGeneration.current;
    const id = conversationId;
    if (!silent) {
      setPhase('loading');
      setError(null);
    }
    Promise.all([chatService.get(id), chatService.messages(id)]).then(async ([conversation, result]) => {
      if (ticket !== loadGeneration.current) return;
      if (user?.id) {
        try {
          await chatRepository.saveOne(user.id, conversation);
          await messageRepository.saveMany(user.id, id, result.messages);
        } catch {
          // The screen still shows the server payload when the cache write fails.
        }
      }
      if (ticket !== loadGeneration.current) return;
      setHeader({ name: conversation.name, personId: conversation.personId, online: conversation.online });
      setCanMessage(conversation.canMessage);
      setCanRespond(conversation.canRespond);
      setStatus(conversation.status);
      setBlocked(Boolean(conversation.blocked));
      setMessages((current) => mergeInitialMessages(current, result.messages));
      setCursor(result.nextCursor);
      setPhase('ready');
      void chatService.markRead(id).catch(() => undefined);
    }).catch((caught: unknown) => {
      if (ticket !== loadGeneration.current || silent) return;
      setError(caught instanceof ApiError && caught.status === 0 ? "You're offline" : 'Unable to load messages');
      setPhase('error');
    });
  }, [conversationId, user?.id]);

  useEffect(() => {
    let active = true;
    allowOlder.current = false;
    const hasMemoryCache = Boolean(user?.id && (
      chatRepository.peek(user.id, conversationId)
      || (messageRepository.peek(user.id, conversationId)?.length ?? 0) > 0
    ));
    // A cached thread is already renderable. Start syncing immediately instead of
    // waiting for SQLite reads to complete before requesting the latest messages.
    if (hasMemoryCache) {
      void Promise.resolve().then(() => {
        if (active) reload(true);
      });
    }
    void (async () => {
      let hasCache = hasMemoryCache;
      if (user?.id) {
        const [storedConversation, storedMessages] = await Promise.all([
          hasMemoryCache ? Promise.resolve(null) : chatRepository.get(user.id, conversationId),
          messageRepository.latest(user.id, conversationId),
        ]);
        if (!active) return;
        if (storedConversation) {
          setHeader({ name: storedConversation.name, personId: storedConversation.personId, online: storedConversation.online });
          if (storedConversation.canMessage !== undefined) setCanMessage(storedConversation.canMessage);
          if (storedConversation.canRespond !== undefined) setCanRespond(storedConversation.canRespond);
          setStatus(storedConversation.status);
          setBlocked(Boolean(storedConversation.blocked));
          hasCache = true;
        }
        if (storedMessages.length > 0) {
          setMessages((current) => mergeInitialMessages(storedMessages, current));
          hasCache = true;
        }
      }
      if (!active) return;
      if (!hasMemoryCache) {
        setPhase(phaseForCachedThread(hasCache));
        reload(hasCache);
      }
    })();
    return () => {
      active = false;
      loadGeneration.current += 1;
    };
  }, [conversationId, reload, user?.id]);

  useEffect(() => {
    socketService.join(conversationId);
    const apply = (payload: unknown) => {
      const message = payload as LiveMessage;
      if (!message || message.conversationId !== conversationId || !message.messageId) return;
      const next: ChatMessage = {
        id: message.messageId,
        senderId: message.senderId,
        body: message.content,
        createdAt: message.createdAt,
        mine: message.senderId === user?.id,
        clientMessageId: message.clientMessageId,
      };
      if (user?.id) void messageRepository.saveMany(user.id, conversationId, [next]).catch(() => undefined);
      setMessages((current) => {
        if (current.some((item) => item.id === message.messageId)) return current;
        const pendingIndex = current.findIndex((item) => item.id === message.clientMessageId || item.clientMessageId === message.clientMessageId);
        if (pendingIndex >= 0) return current.map((item, index) => (index === pendingIndex ? next : item));
        return [...current, next];
      });
      if (message.senderId !== user?.id) socketService.markRead(conversationId, [message.messageId]);
    };
    const offNew = socketService.subscribe('message:new', apply);
    const offTyping = socketService.subscribe('typing:start', (payload) => {
      const body = payload as { conversationId?: string; userId?: string };
      if (body.conversationId === conversationId && body.userId !== user?.id) setOtherTyping(true);
    });
    const offStop = socketService.subscribe('typing:stop', (payload) => {
      const body = payload as { conversationId?: string };
      if (body.conversationId === conversationId) setOtherTyping(false);
    });
    const offPresence = socketService.subscribe(ChatEvents.presenceUpdate, (payload) => {
      const data = payload as { userId?: string; status?: 'ONLINE' | 'OFFLINE' };
      if (data?.userId === header.personId && (data.status === 'ONLINE' || data.status === 'OFFLINE')) {
        const isOnline = data.status === 'ONLINE';
        setHeader((prev) => ({ ...prev, online: isOnline }));
        if (user?.id && data.userId) {
          void chatRepository.updatePresence(user.id, data.userId, isOnline).catch(() => undefined);
        }
      }
    });
    return () => {
      offNew();
      offTyping();
      offStop();
      offPresence();
      socketService.leave(conversationId);
    };
  }, [conversationId, header.personId, user?.id]);

  useEffect(() => {
    if (phase !== 'ready' || !header.personId) return;
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
  }, [conversationId, header.personId, phase]);

  async function startCall(kind: 'audio' | 'video') {
    if (!header.personId) return;
    try {
      const response = await callService.start(header.personId, kind, conversationId);
      const callData = response.call;
      callManager.presentOutgoing({
        id: callData.id,
        name: header.name,
        video: kind === 'video',
        rate: callData.rate,
        userId: header.personId,
        media: response.token && response.url ? {
          callId: callData.id,
          url: response.url,
          token: response.token,
          roomName: callData.roomName,
        } : undefined,
      });
      setCallNotice(null);
      setCalls((current) => current.some((item) => item.id === callData.id) ? current : [...current, {
        id: callData.id,
        callType: callData.callType,
        status: callData.status,
        createdAt: new Date().toISOString(),
        callerId: user?.id ?? '',
        receiverId: header.personId ?? '',
      }]);
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

  const sendBody = useCallback(async (rawBody: string) => {
    const body = rawBody.trim();
    if (!body || sending) return;
    const pendingId = globalThis.crypto?.randomUUID?.() ?? `pending-${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      senderId: user?.id ?? 'me',
      body,
      createdAt: new Date().toISOString(),
      mine: true,
      clientMessageId: pendingId,
    };
    setSending(true);
    setSendError(false);
    setFreshId(pendingId);
    setMessages((current) => [...current, pending]);
    setDraft('');
    if (user?.id) void messageRepository.savePending(user.id, conversationId, pending).catch(() => undefined);
    try {
      socketService.typing(conversationId, false);
      const message = socketService.connected
        ? await socketService.sendMessage(conversationId, body, pendingId).then((saved) => ({
          id: saved.messageId,
          senderId: saved.senderId,
          body: saved.content,
          createdAt: saved.createdAt,
          mine: true,
          clientMessageId: saved.clientMessageId,
        }))
        : await chatService.send(conversationId, body, pendingId);
      if (user?.id) {
        try {
          await messageRepository.confirm(user.id, conversationId, pendingId, message);
        } catch {
          // The sent message stays on screen even if the local write fails.
        }
      }
      setFreshId(message.id);
      setMessages((current) => current.map((item) => (item.id === pendingId ? message : item)));
    } catch {
      if (user?.id) await messageRepository.remove(user.id, conversationId, pendingId);
      setMessages((current) => current.filter((item) => item.id !== pendingId));
      if (!getGiphyMessageUrl(body)) setDraft(body);
      setFreshId(null);
      setSendError(true);
    } finally {
      setSending(false);
    }
  }, [conversationId, sending, user]);

  async function send() {
    await sendBody(draft);
  }

  async function openGifPicker() {
    Keyboard.dismiss();
    try {
      const picker = await getGiphyDialog();
      if (!picker) {
        Alert.alert('GIPHY setup needed', 'Add the Android and iOS GIPHY SDK keys to app/.env, then restart the development build.');
        return;
      }
      picker.dialog.show();
    } catch {
      Alert.alert('GIPHY unavailable', 'Rebuild and open the app with the Accompany development client to use GIFs.');
    }
  }

  useEffect(() => {
    let active = true;
    let subscription: { remove: () => void } | undefined;
    void getGiphyDialog().then((picker) => {
      if (!active || !picker) return;
      subscription = picker.dialog.addListener(picker.mediaSelectedEvent, ({ media }) => {
        picker.dialog.hide();
        const mediaData = media.data as { images?: { original?: { url?: string }; fixed_width?: { url?: string } } };
        const url = mediaData.images?.original?.url ?? mediaData.images?.fixed_width?.url;
        if (url) void sendBody(giphyMessageBody(url));
      });
    }).catch(() => undefined);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [sendBody]);

  const rows = useMemo(() => groupTimeline([
    ...messages.map((message) => ({ kind: 'message' as const, id: message.id, at: message.createdAt, message })),
    ...calls.filter((call) => !isLiveCall(call.status)).map((call) => ({ kind: 'call' as const, id: call.id, at: call.createdAt, call })),
  ].sort((left, right) => right.at.localeCompare(left.at))), [messages, calls]);
  const panels = chatPanels({ phase, status, blocked, canMessage, canRespond, hasTimeline: rows.length > 0 });

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
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior="padding"
      style={{ flex: 1 }}
    >
      <ChatHeader
        name={header.name}
        personId={header.personId}
        online={header.online}
        onBack={onBack}
        actions={
          <View className="flex-row items-center">
            {panels.footer === 'composer' ? (
              <>
                <AppIconButton icon="call" accessibilityLabel="Voice call" onPress={() => setPendingKind('audio')} />
                <AppIconButton icon="video-call" accessibilityLabel="Video call" onPress={() => setPendingKind('video')} />
              </>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                accessibilityRole="button"
                accessibilityLabel="Conversation menu"
                className="h-10 w-10 items-center justify-center rounded-md active:opacity-70"
              >
                <BrandIcon name="more" size={22} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-48">
                <DropdownMenuItem
                  onPress={() => {
                    if (header.personId) onViewProfile?.(header.personId);
                  }}
                  className="flex-row items-center gap-2.5 py-2.5"
                >
                  <BrandIcon name="profile" size={18} />
                  <AppText variant="bodyM">View profile</AppText>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant={blocked ? 'default' : 'destructive'}
                  onPress={() => {
                    setConfirm(blocked ? 'unblock' : 'block');
                  }}
                  className="flex-row items-center gap-2.5 py-2.5"
                >
                  <BrandIcon name="block" size={18} />
                  <AppText variant="bodyM" tone={blocked ? undefined : 'error'}>
                    {blocked ? 'Unblock user' : 'Block user'}
                  </AppText>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </View>
        }
      />
      {callNotice ? <AppText className="px-md py-sm" variant="bodyS" tone="warning">{callNotice}</AppText> : null}
      <View className="flex-1">
        {panels.content === 'loading' ? (
          <View className="flex-1 items-center justify-center">
            <IllustratedState name="loading" motion="pulse" size={140} title="Loading messages..." />
          </View>
        ) : panels.content === 'error' ? (
          <View className="flex-1 justify-center px-lg">
            <IllustratedState name={illustrationForError(error ?? 'Unable to load messages')} title={error ?? 'Unable to load messages'}>
              <AppButton variant="outline" onPress={() => reload()}>Try again</AppButton>
            </IllustratedState>
          </View>
        ) : panels.content === 'empty' ? (
          <View className="flex-1 items-center justify-center">
            <IllustratedState name="chat-empty" size={150} title="No messages yet" body="Say hello when you're ready." />
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
              if (!allowOlder.current || !cursor || loadingOlder.current || panels.content !== 'timeline') return;
              loadingOlder.current = true;
              void loadOlder(cursor).finally(() => {
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
      </View>
      {panels.footer === 'blocked' ? (
        <View className="mx-md gap-sm rounded-sm bg-muted p-md">
          <AppText variant="label">Conversation unavailable</AppText>
          <AppText variant="bodyS" tone="muted">You blocked this person.</AppText>
          <AppButton variant="outline" onPress={() => setConfirm('unblock')}>Unblock</AppButton>
        </View>
      ) : panels.footer === 'incoming' ? (
        <View className="gap-sm px-md">
          <AppText variant="bodyM">Someone would like to connect</AppText>
          <View className="flex-row gap-sm">
            <AppButton variant="outline" className="flex-1" onPress={() => void chatService.reject(conversationId).then(() => onBack())}>Decline</AppButton>
            <AppButton className="flex-1" onPress={() => void chatService.accept(conversationId).then(() => {
              setCanMessage(true);
              setCanRespond(false);
              setStatus('accepted');
              if (user?.id) {
                void chatRepository.saveOne(user.id, {
                  id: conversationId,
                  personId: header.personId ?? '',
                  name: header.name,
                  preview: null,
                  updatedAt: new Date().toISOString(),
                  unreadCount: 0,
                  online: header.online,
                  status: 'accepted',
                  incoming: false,
                  canMessage: true,
                  canRespond: false,
                });
              }
            })}>Accept</AppButton>
          </View>
        </View>
      ) : panels.footer === 'composer' ? (
        <View>
          {otherTyping ? <AppText className="px-md pb-xs" variant="caption" tone="muted">{header.name} is typing</AppText> : null}
          <MessageComposer value={draft} sending={sending} failed={sendError} onChange={(value) => { setDraft(value); socketService.typing(conversationId, value.trim().length > 0); }} onSend={() => void send()} onOpenMediaPicker={() => void openGifPicker()} />
        </View>
      ) : panels.footer === 'pending' ? (
        <View className="mx-md items-center gap-xs rounded-sm bg-muted p-md">
          <AccompanyIllustration name="chat-request" size={96} />
          <AppText variant="label">Request sent</AppText>
          <AppText variant="bodyS" tone="muted">Waiting for {header.name} to respond.</AppText>
        </View>
      ) : panels.footer === 'rejected' ? (
        <View className="mx-md items-center gap-xs rounded-sm bg-muted p-md">
          <AccompanyIllustration name="chat-request" size={96} />
          <AppText variant="label">Request declined</AppText>
          <AppText variant="bodyS" tone="muted">This request was declined.</AppText>
        </View>
      ) : null}
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
      <AppDialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }} title={confirm === 'unblock' ? `Unblock ${header.name}?` : `Block ${header.name}?`} description={confirm === 'unblock' ? 'Communication rules apply again after unblocking.' : 'Blocking this person will stop communication between you.'}>
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={() => setConfirm(null)}>Cancel</AppButton>
          <AppButton className="flex-1" onPress={() => void (confirm === 'unblock' ? unblockPerson() : blockPerson())}>{confirm === 'unblock' ? 'Unblock' : 'Block'}</AppButton>
        </View>
      </AppDialog>
      <View
        pointerEvents="none"
        style={{
          height: keyboardVisible
            ? 2
            : Math.max(insets.bottom, Platform.OS === 'android' ? 1 : 0),
        }}
      />
    </KeyboardAvoidingView>
  );
}
