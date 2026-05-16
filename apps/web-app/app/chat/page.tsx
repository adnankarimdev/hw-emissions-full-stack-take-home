import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ChatStartPage } from "@/features/chat/components/chat-page"
import {
  createChatSession,
  getLatestChatSession,
} from "@/features/chat/server/chat-store"
import { getApiErrorMessage } from "@/lib/api/client"

type ChatIndexPageProps = {
  searchParams: Promise<{
    new?: string
  }>
}

export default async function ChatIndexPage({
  searchParams,
}: ChatIndexPageProps) {
  const params = await searchParams

  if (params.new === "1") {
    let session: Awaited<ReturnType<typeof createChatSession>>

    try {
      session = await createChatSession()
    } catch (error) {
      return (
        <ChatStartPage
          title="Chat service unavailable"
          description={getChatStartupErrorMessage(error)}
          action={
            <Button asChild>
              <Link href="/chat?new=1">Try Again</Link>
            </Button>
          }
        />
      )
    }

    redirect(`/chat/${session.id}`)
  }

  let latestSession: Awaited<ReturnType<typeof getLatestChatSession>>

  try {
    latestSession = await getLatestChatSession()
  } catch (error) {
    return (
      <ChatStartPage
        title="Chat service unavailable"
        description={getChatStartupErrorMessage(error)}
        action={
          <Button asChild>
            <Link href="/chat">Retry</Link>
          </Button>
        }
      />
    )
  }

  if (!latestSession) {
    return (
      <ChatStartPage
        title="Operations Chat"
        description="Start a persisted operations conversation for metrics, site creation, or manual ingestion workflows."
        action={
          <Button asChild>
            <Link href="/chat?new=1">Start New Chat</Link>
          </Button>
        }
      />
    )
  }

  redirect(`/chat/${latestSession.id}`)
}

function getChatStartupErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error)

  return message === "fetch failed"
    ? "The frontend could not reach the backend API. Check NEXT_PUBLIC_API_BASE_URL on the web deployment and make sure the backend deployment is healthy."
    : message
}
