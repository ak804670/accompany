import { useEffect, useRef, useState } from 'react';
import { callManager } from '@/features/calls/call-manager';
import { callService } from '@/features/calls/call.service';
import { Animated, View } from 'react-native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { AppDialog } from '@/components/design-system/AppDialog';
import { BottomNavigation, type MainTab } from '@/components/navigation/BottomNavigation';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { ChatsScreen } from '@/features/chat/ChatsScreen';
import { chatService, type ConversationSummary } from '@/features/chat/chat.service';
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
  const [pendingTab, setPendingTab] = useState<MainTab | null>(null);
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
      if (event.type === 'message' || event.type === 'read' || event.type === 'NEW_MESSAGE' || event.type === 'MESSAGE_READ' || event.type === 'CHAT_REQUEST_RECEIVED' || event.type === 'CHAT_REQUEST_ACCEPTED') refresh();
    });
  }, [tab]);

  function changeTab(next: MainTab) {
    if (next === tab) return;
    if (tab === 'profile' && profileIsDirty()) {
      setPendingTab(next);
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
      setTab(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
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
      <Animated.View className="flex-1" style={{ opacity }}>
        <View className="flex-1" style={{ display: tab === 'home' ? 'flex' : 'none' }}>
          <HomeScreen onOpenPerson={(userId) => navigation.navigate('Person', { userId })} />
        </View>
        <View className="absolute inset-0" style={{ display: tab === 'chats' ? 'flex' : 'none' }}>
          <ChatsScreen onOpen={openConversation} />
        </View>
        <View className="absolute inset-0" style={{ display: tab === 'profile' ? 'flex' : 'none' }}>
          <OwnProfileScreen onEdit={() => navigation.navigate('EditProfile')} onBlocked={() => navigation.navigate('BlockedPeople')} onWallet={() => navigation.navigate('Wallet')} />
        </View>
      </Animated.View>
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
  const [call, setCall] = useState<{ id: string; callType: string } | null>(null);

  useEffect(() => {
    let active = true;
    const tick = () => {
      void callService.incoming().then((next) => {
        if (!active) return;
        setCall(next);
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

  if (!call) return null;
  const label = call.callType === 'VIDEO' ? 'video' : 'voice';
  return (
    <View className="absolute inset-x-4 top-12 z-50 gap-sm rounded-md border border-border bg-card p-md">
      <AppText variant="label">Incoming {label} call</AppText>
      <View className="flex-row gap-sm">
        <AppButton variant="outline" className="flex-1" onPress={() => void callManager.rejectCall(call.id).then(() => setCall(null))}>Decline</AppButton>
        <AppButton className="flex-1" onPress={() => void callManager.answerCall(call.id).then(() => setCall(null))}>Accept</AppButton>
      </View>
    </View>
  );
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
