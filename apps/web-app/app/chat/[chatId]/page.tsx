import { notFound } from "next/navigation"

import { ChatPage } from "@/features/chat/components/chat-page"
import {
  getChatSession,
  listChatSessions,
} from "@/features/chat/server/chat-store"

type ChatSessionPageProps = {
  params: Promise<{
    chatId: string
  }>
}

export default async function ChatSessionPage({
  params,
}: ChatSessionPageProps) {
  const { chatId } = await params
  const [session, sessions] = await Promise.all([
    getChatSession(chatId),
    listChatSessions(),
  ])

  if (!session) {
    notFound()
  }

  return (
    <ChatPage
      chatId={session.id}
      initialMessages={session.messages}
      sessions={sessions}
    />
  )
}
