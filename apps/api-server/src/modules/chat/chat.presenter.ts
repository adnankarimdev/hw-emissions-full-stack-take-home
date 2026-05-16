import type { ChatMessage, ChatSession } from '@prisma/client';

export type ChatSessionWithMessages = ChatSession & {
  messages: ChatMessage[];
};

export type ChatSessionListRecord = ChatSession & {
  _count: {
    messages: number;
  };
};

export function presentChatSession(session: ChatSessionWithMessages) {
  return {
    ...presentChatSessionSummary({
      ...session,
      _count: {
        messages: session.messages.length,
      },
    }),
    messages: session.messages.map(presentChatMessage),
  };
}

export function presentChatSessionSummary(session: ChatSessionListRecord) {
  return {
    id: session.id,
    title: session.title,
    created_at: session.createdAt.toISOString(),
    updated_at: session.updatedAt.toISOString(),
    message_count: session._count.messages,
  };
}

function presentChatMessage(message: ChatMessage) {
  const response = {
    id: message.messageId,
    role: message.role,
    parts: message.parts,
  };

  if (message.metadata === null) {
    return response;
  }

  return {
    ...response,
    metadata: message.metadata,
  };
}
