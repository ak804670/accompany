import { Phone, Video } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallRequestDialog } from '@/components/chat/CallRequestDialog';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageComposer } from '@/components/chat/MessageComposer';
import { AppButton } from '@/components/design-system/AppButton';
import { AppIconButton } from '@/components/design-system/AppIconButton';
import { AppText } from '@/components/design-system/AppText';
import { chatService, type ChatMessage } from '@/features/chat/chat.service';

type ChatScreenProps = {
  conversationId: string;
  name: string;
  personId?: string | null;
  online: boolean;
  onBack: () => void;
};

export function ChatScreen({ conversationId, name, personId, online, onBack }: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [header, setHeader] = useState({ name, personId: personId ?? null, online });
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState(false);
  const [sending, setSending] = useState(false);
  const [call, setCall] = useState<'voice' | 'video' | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const allowOlder = useRef(false);
  const loadingOlder = useRef(false);

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

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 8 }}>
      <ChatHeader
        name={header.name}
        personId={header.personId}
        online={header.online}
        onBack={onBack}
        actions={
          <View className="flex-row">
            <AppIconButton icon={Phone} accessibilityLabel="Voice call" onPress={() => setCall('voice')} />
            <AppIconButton icon={Video} accessibilityLabel="Video call" onPress={() => setCall('video')} />
          </View>
        }
      />
      <View className="flex-1">
        {error ? (
          <View className="flex-1 justify-center gap-md px-lg">
            <AppText variant="bodyM">{error}</AppText>
            <AppButton variant="outline" onPress={() => { setLoading(true); setError(null); void load().catch(() => setError("Couldn't load this conversation")).finally(() => setLoading(false)); }}>Try again</AppButton>
          </View>
        ) : (
          <FlatList
            inverted
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
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
            renderItem={({ item }) => <MessageBubble body={item.body} mine={item.mine} appear={item.id === freshId} />}
          />
        )}
        {loading ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <AppText variant="bodyM" tone="muted">Loading messages...</AppText>
          </View>
        ) : null}
      </View>
      <MessageComposer value={draft} sending={sending} failed={sendError} onChange={setDraft} onSend={() => void send()} />
      <CallRequestDialog kind={call} name={header.name} onClose={() => setCall(null)} />
    </View>
  );
}
