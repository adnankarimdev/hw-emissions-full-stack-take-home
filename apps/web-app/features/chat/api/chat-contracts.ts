import type { UIMessage } from "ai"
import { z } from "zod"

import type {
  ChatSession,
  ChatSessionSummary,
} from "@/features/chat/types"

const backendChatMessagePartSchema = z
  .object({
    type: z.string(),
  })
  .passthrough()

const backendChatMessageSchema = z
  .object({
    id: z.string(),
    role: z.enum(["system", "user", "assistant"]),
    parts: z.array(backendChatMessagePartSchema).min(1),
    metadata: z.unknown().optional(),
  })
  .passthrough()

export const backendChatSessionSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  message_count: z.coerce.number(),
})

export const backendChatSessionSchema = backendChatSessionSummarySchema.extend({
  messages: z.array(backendChatMessageSchema),
})

export const backendChatSessionListSchema = z.array(
  backendChatSessionSummarySchema
)

export const backendNullableChatSessionSchema =
  backendChatSessionSchema.nullable()

type BackendChatSession = z.infer<typeof backendChatSessionSchema>
type BackendChatSessionSummary = z.infer<
  typeof backendChatSessionSummarySchema
>
type BackendChatMessage = z.infer<typeof backendChatMessageSchema>

export function toChatSession(session: BackendChatSession): ChatSession {
  return {
    ...toChatSessionSummary(session),
    messages: session.messages.map(toUiMessage),
  }
}

export function toChatSessionSummary(
  session: BackendChatSessionSummary
): ChatSessionSummary {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    messageCount: session.message_count,
  }
}

function toUiMessage(message: BackendChatMessage): UIMessage {
  const uiMessage = {
    id: message.id,
    role: message.role,
    parts: message.parts,
  }

  if (message.metadata === undefined) {
    return uiMessage as UIMessage
  }

  return {
    ...uiMessage,
    metadata: message.metadata,
  } as UIMessage
}
