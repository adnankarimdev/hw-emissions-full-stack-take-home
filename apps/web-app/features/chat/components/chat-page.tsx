import type { UIMessage } from "ai"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import type { ChatSessionSummary } from "@/features/chat/server/chat-store"

import { ChatWorkspace } from "@/features/chat/components/chat-workspace"

type ChatPageProps = {
  chatId: string
  initialMessages: UIMessage[]
  sessions: ChatSessionSummary[]
}

export function ChatPage({
  chatId,
  initialMessages,
  sessions,
}: ChatPageProps) {
  return (
    <DashboardShell title="Operations Chat">
      <main className="flex min-h-0 flex-1 flex-col">
        <ChatWorkspace
          chatId={chatId}
          initialMessages={initialMessages}
          sessions={sessions}
        />
      </main>
    </DashboardShell>
  )
}
