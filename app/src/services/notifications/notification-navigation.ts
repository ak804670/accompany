import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

let pendingConversationId: string | null = null;

export function setPendingNotificationNavigation(conversationId: string | null): void {
  pendingConversationId = conversationId;
}

export function getPendingNotificationNavigation(): string | null {
  return pendingConversationId;
}

export function navigateToConversation(conversationId: string, name = 'Chat'): boolean {
  if (navigationRef.isReady()) {
    try {
      (navigationRef as any).navigate('Chat', {
        conversationId,
        name,
        online: false,
      });
      pendingConversationId = null;
      return true;
    } catch {
      // Navigation state might not have Chat screen mounted yet
      pendingConversationId = conversationId;
      return false;
    }
  }

  pendingConversationId = conversationId;
  return false;
}

export function flushPendingNotificationNavigation(): boolean {
  if (pendingConversationId && navigationRef.isReady()) {
    const target = pendingConversationId;
    return navigateToConversation(target);
  }
  return false;
}
