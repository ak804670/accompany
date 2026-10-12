import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '@/services/api';
import { reportError } from '@/services/monitoring/report-error';
import {
  navigateToConversation,
  setPendingNotificationNavigation,
} from './notification-navigation';

let activeConversationId: string | null = null;
let currentRegisteredToken: string | null = null;
let responseSubscription: Notifications.EventSubscription | null = null;
let tokenSubscription: Notifications.EventSubscription | null = null;
let isConfigured = false;

// Configure presentation logic: suppress push banner if user is viewing this exact chat
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const isViewingCurrent =
      data?.type === 'MESSAGE_RECEIVED' &&
      Boolean(activeConversationId) &&
      data?.conversationId === activeConversationId;

    return {
      shouldShowAlert: !isViewingCurrent,
      shouldPlaySound: !isViewingCurrent,
      shouldSetBadge: true,
      shouldShowBanner: !isViewingCurrent,
      shouldShowList: true,
    };
  },
});

export const notificationService = {
  setActiveConversation(conversationId: string | null): void {
    activeConversationId = conversationId;
  },

  getActiveConversation(): string | null {
    return activeConversationId;
  },

  async setupChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('chat', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          enableLights: true,
          lightColor: '#F7F4EF',
        });

        await Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch (error) {
        reportError({ error });
      }
    }
  },

  async registerDeviceToken(isAuthenticated = true): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      await this.setupChannels();

      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

      if (!granted) {
        const requested = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        granted = requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }

      if (!granted) {
        return null;
      }

      const tokenResult = await Notifications.getDevicePushTokenAsync();
      const token = typeof tokenResult.data === 'string' ? tokenResult.data.trim() : '';

      if (token && isAuthenticated) {
        await apiClient.post('/v1/devices', {
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          token,
        });
        currentRegisteredToken = token;
      }

      this.listenForTokenRefresh(isAuthenticated);
      this.listenForNotificationResponses(isAuthenticated);

      return token;
    } catch (error) {
      reportError({ error });
      return null;
    }
  },

  async unregisterDeviceToken(): Promise<void> {
    if (currentRegisteredToken) {
      const token = currentRegisteredToken;
      currentRegisteredToken = null;
      try {
        await apiClient.delete(`/v1/devices/current?token=${encodeURIComponent(token)}`);
      } catch {
        // Safe to ignore on logout
      }
    }

    tokenSubscription?.remove();
    tokenSubscription = null;
  },

  listenForTokenRefresh(isAuthenticated: boolean): void {
    if (tokenSubscription) return;
    tokenSubscription = Notifications.addPushTokenListener((tokenObj) => {
      const token = typeof tokenObj.data === 'string' ? tokenObj.data.trim() : '';
      if (token && isAuthenticated && token !== currentRegisteredToken) {
        currentRegisteredToken = token;
        void apiClient
          .post('/v1/devices', {
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            token,
          })
          .catch(() => undefined);
      }
    });
  },

  listenForNotificationResponses(isAuthenticated: boolean): void {
    if (responseSubscription) {
      responseSubscription.remove();
    }

    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleResponse(response, isAuthenticated);
    });

    if (!isConfigured) {
      isConfigured = true;
      // Handle app launched from cold start via notification tap
      void Notifications.getLastNotificationResponseAsync().then((last) => {
        if (last) {
          this.handleResponse(last, isAuthenticated);
        }
      });
    }
  },

  handleResponse(response: Notifications.NotificationResponse, isAuthenticated: boolean): void {
    const data = response.notification.request.content.data as Record<string, unknown> | undefined;
    if (!data) return;

    const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;
    const type = typeof data.type === 'string' ? data.type : '';

    if (conversationId && (type === 'MESSAGE_RECEIVED' || type === 'REQUEST_RECEIVED' || type === 'REQUEST_ACCEPTED')) {
      const senderName = typeof data.senderName === 'string' ? data.senderName : 'Chat';
      if (isAuthenticated) {
        navigateToConversation(conversationId, senderName);
      } else {
        setPendingNotificationNavigation(conversationId);
      }
    }
  },
};
