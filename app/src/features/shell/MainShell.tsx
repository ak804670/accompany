import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomNavigation, type MainTab } from '@/components/navigation/BottomNavigation';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { ChatsScreen } from '@/features/chat/ChatsScreen';
import { chatService, type ConversationSummary } from '@/features/chat/chat.service';
import { HomeScreen } from '@/features/home/HomeScreen';
import { PersonScreen } from '@/features/home/PersonScreen';
import { peopleService } from '@/features/home/people.service';
import { OwnProfileScreen } from '@/features/profile/OwnProfileScreen';
import { subscribeRealtime } from '@/services/realtime/socket';
import { useTheme, palette } from '@/theme';

type OpenChat = {
  conversationId: string;
  name: string;
  personId?: string | null;
  online: boolean;
};

type ShellParamList = {
  Tabs: undefined;
  Person: { userId: string };
  Chat: OpenChat;
};

const Stack = createNativeStackNavigator<ShellParamList>();

function TabsScreen({ navigation }: NativeStackScreenProps<ShellParamList, 'Tabs'>) {
  const [tab, setTab] = useState<MainTab>('home');
  const [unread, setUnread] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const beat = () => {
      void peopleService.beat().catch(() => undefined);
    };
    beat();
    const timer = setInterval(beat, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => {
      void chatService.list().then((result) => setUnread(result.unread)).catch(() => undefined);
    };
    refresh();
    return subscribeRealtime((event) => {
      if (event.type === 'message' || event.type === 'read') refresh();
    });
  }, [tab]);

  function changeTab(next: MainTab) {
    if (next === tab) return;
    Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setTab(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }

  function openConversation(item: ConversationSummary) {
    navigation.navigate('Chat', {
      conversationId: item.id,
      name: item.name,
      personId: item.personId,
      online: item.online,
    });
  }

  return (
    <View className="flex-1 bg-background">
      <Animated.View className="flex-1" style={{ opacity }}>
        {tab === 'home' ? (
          <HomeScreen onOpenPerson={(userId) => navigation.navigate('Person', { userId })} />
        ) : tab === 'chats' ? (
          <ChatsScreen onOpen={openConversation} />
        ) : (
          <OwnProfileScreen />
        )}
      </Animated.View>
      <BottomNavigation value={tab} unread={unread} onChange={changeTab} />
    </View>
  );
}

function PersonRoute({ route, navigation }: NativeStackScreenProps<ShellParamList, 'Person'>) {
  return (
    <PersonScreen
      userId={route.params.userId}
      onBack={() => navigation.goBack()}
      onConversation={(conversationId, name, online) => {
        navigation.navigate('Chat', { conversationId, name, personId: route.params.userId, online });
      }}
    />
  );
}

function ChatRoute({ route, navigation }: NativeStackScreenProps<ShellParamList, 'Chat'>) {
  return <ChatScreen {...route.params} onBack={() => navigation.goBack()} />;
}

export function MainShell() {
  const { resolvedScheme } = useTheme();

  return (
    <View className="flex-1 bg-background" testID="authenticated-home">
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 320,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: palette[resolvedScheme].background },
        }}
      >
        <Stack.Screen name="Tabs" component={TabsScreen} />
        <Stack.Screen name="Person" component={PersonRoute} />
        <Stack.Screen name="Chat" component={ChatRoute} />
      </Stack.Navigator>
    </View>
  );
}
