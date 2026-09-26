export type ConversationStatus = 'pending' | 'active' | 'rejected' | 'ended' | 'blocked';

export type MessageDecision =
  | { allow: true }
  | { allow: false; status: number; message: string };

export function canCreateChatRequest(input: {
  sameUser: boolean;
  blocked: boolean;
  existingStatus: ConversationStatus | null;
}): MessageDecision {
  if (input.sameUser) {
    return { allow: false, status: 400, message: 'Choose someone to talk with.' };
  }
  if (input.blocked) {
    return { allow: false, status: 403, message: 'This conversation is not available.' };
  }
  if (input.existingStatus === 'pending' || input.existingStatus === 'active') {
    return { allow: false, status: 409, message: 'A conversation already exists.' };
  }
  return { allow: true };
}

export function canSendMessage(input: {
  member: boolean;
  blocked: boolean;
  status: ConversationStatus | null;
}): MessageDecision {
  if (!input.member || !input.status) {
    return { allow: false, status: 404, message: "Couldn't load this conversation" };
  }
  if (input.blocked || input.status === 'blocked') {
    return { allow: false, status: 403, message: 'This conversation is not available.' };
  }
  if (input.status !== 'active') {
    return { allow: false, status: 403, message: 'Waiting for them to accept.' };
  }
  return { allow: true };
}

export function canRespondToRequest(input: {
  member: boolean;
  isRecipient: boolean;
  blocked: boolean;
  status: ConversationStatus | null;
}): MessageDecision {
  if (!input.member || !input.status) {
    return { allow: false, status: 404, message: "Couldn't load this conversation" };
  }
  if (input.blocked) {
    return { allow: false, status: 403, message: 'This conversation is not available.' };
  }
  if (!input.isRecipient || input.status !== 'pending') {
    return { allow: false, status: 403, message: 'This request cannot be changed.' };
  }
  return { allow: true };
}
