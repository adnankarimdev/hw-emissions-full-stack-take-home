import type { UIMessage } from "ai"
import { MessageSquareIcon } from "lucide-react"
import type { ReactNode } from "react"

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

type ChatStartPageProps = {
  action: ReactNode
  description: string
  title: string
}

export function ChatStartPage({
  action,
  description,
  title,
}: ChatStartPageProps) {
  return (
    <DashboardShell title="Operations Chat">
      <main className="flex min-h-[calc(100vh-var(--header-height))] flex-1 items-center justify-center p-6">
        <section className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-md border bg-background">
            <MessageSquareIcon className="size-6 text-muted-foreground" />
          </div>
          <div className="grid gap-2">
            <h1 className="text-xl font-semibold tracking-normal">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {action}
        </section>
      </main>
    </DashboardShell>
  )
}
