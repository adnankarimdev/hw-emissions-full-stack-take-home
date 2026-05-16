import type { UIMessage } from "ai"

export type ChatSessionSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type ChatSession = ChatSessionSummary & {
  messages: UIMessage[]
}
