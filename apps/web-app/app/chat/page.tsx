import { redirect } from "next/navigation"

import {
  createChatSession,
  getLatestChatSession,
} from "@/features/chat/server/chat-store"

type ChatIndexPageProps = {
  searchParams: Promise<{
    new?: string
  }>
}

export default async function ChatIndexPage({
  searchParams,
}: ChatIndexPageProps) {
  const params = await searchParams
  const session =
    params.new === "1"
      ? await createChatSession()
      : (await getLatestChatSession()) ?? (await createChatSession())

  redirect(`/chat/${session.id}`)
}
