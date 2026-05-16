import type { UIMessage } from "ai"

import {
  backendChatSessionListSchema,
  backendChatSessionSchema,
  backendNullableChatSessionSchema,
  toChatSession,
  toChatSessionSummary,
} from "@/features/chat/api/chat-contracts"
import type {
  ChatSession,
  ChatSessionSummary,
} from "@/features/chat/types"
import { ApiRequestError, requestJson } from "@/lib/api/client"
import { apiEndpoints } from "@/lib/api/endpoints"

export type { ChatSession, ChatSessionSummary } from "@/features/chat/types"

export async function createChatSession(): Promise<ChatSession> {
  const session = await requestJson(apiEndpoints.chatSessions, {
    method: "POST",
    cache: "no-store",
    schema: backendChatSessionSchema,
  })

  return toChatSession(session)
}

export async function getChatSession(
  chatId: string
): Promise<ChatSession | null> {
  try {
    const session = await requestJson(apiEndpoints.chatSession(chatId), {
      cache: "no-store",
      schema: backendChatSessionSchema,
    })

    return toChatSession(session)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function getLatestChatSession(): Promise<ChatSession | null> {
  const session = await requestJson(apiEndpoints.chatLatestSession, {
    cache: "no-store",
    schema: backendNullableChatSessionSchema,
  })

  return session ? toChatSession(session) : null
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const sessions = await requestJson(apiEndpoints.chatSessions, {
    cache: "no-store",
    schema: backendChatSessionListSchema,
  })

  return sessions.map(toChatSessionSummary)
}

export async function saveChatMessages({
  chatId,
  messages,
}: {
  chatId: string
  messages: UIMessage[]
}) {
  await requestJson(apiEndpoints.chatSessionMessages(chatId), {
    method: "PUT",
    cache: "no-store",
    body: JSON.stringify({
      messages: sanitizeChatMessages(messages),
    }),
    schema: backendChatSessionSchema,
  })
}

export function sanitizeChatMessages(messages: unknown[]): UIMessage[] {
  return messages.filter(isNonEmptyUiMessage)
}

function isNonEmptyUiMessage(message: unknown): message is UIMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "parts" in message &&
    Array.isArray(message.parts) &&
    message.parts.length > 0
  )
}
