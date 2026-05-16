import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

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

type StoredChatSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: UIMessage[]
}

const CHAT_ID_PATTERN = /^chat_[a-f0-9]{32}$/
const CHAT_STORE_DIR =
  process.env.CHAT_STORE_DIR ?? path.join(process.cwd(), ".data", "chats")

export async function createChatSession(): Promise<ChatSession> {
  const now = new Date().toISOString()
  const session: StoredChatSession = {
    id: createChatId(),
    title: "New operations chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  }

  await writeSession(session)

  return toChatSession(session)
}

export async function getChatSession(
  chatId: string
): Promise<ChatSession | null> {
  assertSafeChatId(chatId)

  try {
    const session = await readSession(chatId)

    return toChatSession(session)
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null
    }

    throw error
  }
}

export async function getLatestChatSession(): Promise<ChatSession | null> {
  const sessions = await listChatSessions()
  const latestSession = sessions[0]

  return latestSession ? getChatSession(latestSession.id) : null
}

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  await ensureStoreDir()

  const fileNames = await fs.readdir(CHAT_STORE_DIR)
  const sessions = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map(async (fileName) => {
        const chatId = fileName.replace(/\.json$/, "")
        const session = await readSession(chatId)

        return toChatSessionSummary(session)
      })
  )

  return sessions.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )
}

export async function saveChatMessages({
  chatId,
  messages,
}: {
  chatId: string
  messages: UIMessage[]
}) {
  assertSafeChatId(chatId)

  const existingSession = await getChatSession(chatId)
  const now = new Date().toISOString()
  const sanitizedMessages = sanitizeChatMessages(messages)
  const session: StoredChatSession = {
    id: chatId,
    title: titleFromMessages(sanitizedMessages),
    createdAt: existingSession?.createdAt ?? now,
    updatedAt: now,
    messages: sanitizedMessages,
  }

  await writeSession(session)
}

export function sanitizeChatMessages(messages: unknown[]): UIMessage[] {
  return messages.filter(isNonEmptyUiMessage)
}

function createChatId() {
  return `chat_${randomUUID().replaceAll("-", "")}`
}

async function ensureStoreDir() {
  await fs.mkdir(CHAT_STORE_DIR, { recursive: true })
}

async function readSession(chatId: string): Promise<StoredChatSession> {
  assertSafeChatId(chatId)

  const file = await fs.readFile(chatSessionPath(chatId), "utf8")
  const parsed = JSON.parse(file) as StoredChatSession

  return {
    ...parsed,
    messages: Array.isArray(parsed.messages)
      ? sanitizeChatMessages(parsed.messages)
      : [],
  }
}

async function writeSession(session: StoredChatSession) {
  await ensureStoreDir()

  const sessionPath = chatSessionPath(session.id)
  const temporaryPath = `${sessionPath}.${randomUUID()}.tmp`

  await fs.writeFile(temporaryPath, JSON.stringify(session, null, 2))
  await fs.rename(temporaryPath, sessionPath)
}

function chatSessionPath(chatId: string) {
  assertSafeChatId(chatId)

  return path.join(CHAT_STORE_DIR, `${chatId}.json`)
}

function assertSafeChatId(chatId: string) {
  if (!CHAT_ID_PATTERN.test(chatId)) {
    throw new Error("Invalid chat session id.")
  }
}

function titleFromMessages(messages: UIMessage[]) {
  const firstUserText = messages
    .filter((message) => message.role === "user")
    .map(getMessageText)
    .find((text) => text.length > 0)

  if (!firstUserText) {
    return "New operations chat"
  }

  return firstUserText.length > 64
    ? `${firstUserText.slice(0, 61).trim()}...`
    : firstUserText
}

function getMessageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim()
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

function toChatSession(session: StoredChatSession): ChatSession {
  return {
    ...toChatSessionSummary(session),
    messages: session.messages,
  }
}

function toChatSessionSummary(
  session: StoredChatSession
): ChatSessionSummary {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messages.length,
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}
