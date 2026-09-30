import { useEffect, useRef, useState } from 'react';
import { callManager } from '@/features/calls/call-manager';
import { callService } from '@/features/calls/call.service';
import { Animated, Easing, View } from 'react-native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppDialog } from '@/components/design-system/AppDialog';
import { BottomNavigation, type MainTab } from '@/components/navigation/BottomNavigation';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { ChatsScreen } from '@/features/chat/ChatsScreen';
import { type ConversationSummary } from '@/features/chat/chat.service';
import { conversationRepository } from '@/database/sqlite/repositories/conversationRepository';
import { subscribeLocal } from '@/database/sqlite/memory';
import { HomeScreen } from '@/features/home/HomeScreen';
import { PersonScreen } from '@/features/home/PersonScreen';
import { peopleService } from '@/features/home/people.service';
import { BlockedPeopleScreen } from '@/features/profile/BlockedPeopleScreen';
import { EditProfileScreen } from '@/features/profile/EditProfileScreen';
import { OwnProfileScreen } from '@/features/profile/OwnProfileScreen';
import { AddCoinsScreen } from '@/features/wallet/AddCoinsScreen';
import { WalletScreen } from '@/features/wallet/WalletScreen';
import { WithdrawScreen } from '@/features/wallet/WithdrawScreen';
import { profileIsDirty, setProfileDirty } from '@/features/profile/profile-guard';
import { subscribeRealtime } from '@/services/realtime/socket';
import { useTheme, palette } from '@/theme';

type OpenChat = {
  conversationId: string;
  name: string;
  personId?: string | null;
  online: boolean;
  highlightCallId?: string;
};

type ShellParamList = {
  Tabs: undefined;
  Person: { userId: string };
  Chat: OpenChat;
  EditProfile: undefined;
  BlockedPeople: undefined;
  Wallet: undefined;
  AddCoins: undefined;
  Withdraw: undefined;
};

const Stack = createNativeStackNavigator<ShellParamList>();

function TabsScreen({ navigation }: NativeStackScreenProps<ShellParamList, 'Tabs'>) {
  const [tab, setTab] = useState<MainTab>('home');
  const shown = useRef<MainTab>('home');
  const [pendingTab, setPendingTab] = useState<MainTab | null>(null);
  const [unread, setUnread] = useState(0);
  const opacity = useRef({
    home: new Animated.Value(1),
    chats: new Animated.Value(0),
    profile: new Animated.Value(0),
  }).current;

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
      void conversationRepository.unread().then(setUnread).catch(() => undefined);
    };
    refresh();
    const unsubscribeLocal = subscribeLocal('conversations', refresh);
    const unsubscribeRealtime = subscribeRealtime((event) => {
      if (event.type === 'message' || event.type === 'read' || event.type === 'NEW_MESSAGE' || event.type === 'MESSAGE_READ' || event.type === 'CHAT_REQUEST_RECEIVED' || event.type === 'CHAT_REQUEST_ACCEPTED') refresh();
    });
    return () => {
      unsubscribeLocal();
      unsubscribeRealtime();
    };
  }, []);

  function changeTab(next: MainTab) {
    const from = shown.current;
    if (next === from) return;
    if (tab === 'profile' && profileIsDirty()) {
      setPendingTab(next);
      return;
    }
    shown.current = next;
    Animated.parallel(
      (['home', 'chats', 'profile'] as const).map((name) => Animated.timing(opacity[name], {
        toValue: name === next ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      })),
    ).start(({ finished }) => {
      if (finished && shown.current === next) setTab(next);
    });
  }

  function openConversation(item: ConversationSummary, highlightCallId?: string) {
    navigation.navigate('Chat', {
      conversationId: item.id,
      name: item.name,
      personId: item.personId,
      online: item.online,
      highlightCallId,
    });
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <Animated.View pointerEvents={tab === 'home' ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: opacity.home }}>
          <HomeScreen active={tab === 'home'} onOpenPerson={(userId) => navigation.navigate('Person', { userId })} />
        </Animated.View>
        <Animated.View pointerEvents={tab === 'chats' ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: opacity.chats }}>
          <ChatsScreen active={tab === 'chats'} onOpen={openConversation} />
        </Animated.View>
        <Animated.View pointerEvents={tab === 'profile' ? 'auto' : 'none'} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: opacity.profile }}>
          <OwnProfileScreen active={tab === 'profile'} onEdit={() => navigation.navigate('EditProfile')} onBlocked={() => navigation.navigate('BlockedPeople')} onWallet={() => navigation.navigate('Wallet')} />
        </Animated.View>
      </View>
      <BottomNavigation value={tab} unread={unread} onChange={changeTab} />
      <AppDialog open={pendingTab !== null} onOpenChange={(open) => { if (!open) setPendingTab(null); }} title="Discard changes?" description="Your profile edits have not been saved.">
        <View className="flex-row gap-sm">
          <AppButton variant="outline" className="flex-1" onPress={() => setPendingTab(null)}>Keep editing</AppButton>
          <AppButton className="flex-1" onPress={() => { setProfileDirty(false); if (pendingTab) changeTab(pendingTab); setPendingTab(null); }}>Discard</AppButton>
        </View>
      </AppDialog>
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

function EditProfileRoute({ navigation }: NativeStackScreenProps<ShellParamList, 'EditProfile'>) {
  return <EditProfileScreen onBack={() => navigation.goBack()} />;
}

function WalletRoute({ navigation }: NativeStackScreenProps<ShellParamList, 'Wallet'>) {
  return <WalletScreen onBack={() => navigation.goBack()} onAdd={() => navigation.navigate('AddCoins')} onWithdraw={() => navigation.navigate('Withdraw')} />;
}

function AddCoinsRoute({ navigation }: NativeStackScreenProps<ShellParamList, 'AddCoins'>) {
  return <AddCoinsScreen onBack={() => navigation.goBack()} />;
}

function WithdrawRoute({ navigation }: NativeStackScreenProps<ShellParamList, 'Withdraw'>) {
  return <WithdrawScreen onBack={() => navigation.goBack()} />;
}

function BlockedPeopleRoute({ navigation }: NativeStackScreenProps<ShellParamList, 'BlockedPeople'>) {
  return <BlockedPeopleScreen onBack={() => navigation.goBack()} />;
}

function IncomingCall() {
  useEffect(() => {
    let active = true;
    const tick = () => {
      void callService.incoming().then((next) => {
        if (!active) return;
        if (next) callManager.presentIncoming({ id: next.id, name: 'Incoming call', video: next.callType === 'VIDEO', status: next.status });
        else if (callManager.getCurrentCall()?.outgoing === false) callManager.syncRemote('ENDED');
      }).catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return null;
}

function ChatRoute({ route, navigation }: NativeStackScreenProps<ShellParamList, 'Chat'>) {
  return <ChatScreen {...route.params} onBack={() => navigation.goBack()} onViewProfile={(userId) => navigation.navigate('Person', { userId })} />;
}

export function MainShell() {
  const { resolvedScheme } = useTheme();

  return (
    <View className="flex-1 bg-background" testID="authenticated-home">
      <IncomingCall />
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
        <Stack.Screen name="EditProfile" component={EditProfileRoute} />
        <Stack.Screen name="BlockedPeople" component={BlockedPeopleRoute} />
        <Stack.Screen name="Wallet" component={WalletRoute} />
        <Stack.Screen name="AddCoins" component={AddCoinsRoute} />
        <Stack.Screen name="Withdraw" component={WithdrawRoute} />
      </Stack.Navigator>
    </View>
  );
}
