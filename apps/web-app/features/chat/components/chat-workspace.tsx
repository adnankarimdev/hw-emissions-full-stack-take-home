"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  type ToolUIPart,
  type UIMessage,
} from "ai"
import {
  CopyIcon,
  MessageSquareIcon,
  PlusIcon,
  RefreshCcwIcon,
} from "lucide-react"

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { ChatRenderSpec } from "@/features/chat/renderer/spec"
import { ChatRenderedUi } from "@/features/chat/renderer/catalog"
import type { ChatSessionSummary } from "@/features/chat/types"
import { cn } from "@/lib/utils"

type ChatWorkspaceProps = {
  chatId: string
  initialMessages: UIMessage[]
  sessions: ChatSessionSummary[]
}

export function ChatWorkspace({
  chatId,
  initialMessages,
  sessions,
}: ChatWorkspaceProps) {
  const [input, setInput] = useState("")
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            chatId: id,
            messages,
          },
        }),
      }),
    []
  )
  const {
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    status,
    stop,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
  })
  const isBusy = status === "submitted" || status === "streaming"
  const elapsedSeconds = useElapsedSeconds(isBusy)
  const assistantProgress = getAssistantProgress({
    elapsedSeconds,
    messages,
    status,
  })

  function handleSubmit(message: PromptInputMessage) {
    const text = message.text.trim()

    if (!text || isBusy) {
      return
    }

    void sendMessage({ text })
    setInput("")
  }

  return (
    <div className="@container/main flex min-h-[calc(100vh-var(--header-height))] flex-1 gap-4 p-4 md:p-6">
      <ChatHistory
        activeChatId={chatId}
        sessions={sessions}
      />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <Conversation className="min-h-0">
          <ConversationContent className="gap-5 p-4 md:p-6">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<MessageSquareIcon className="size-10" />}
                title="Operations Chat"
                description="Ask for metrics, trends, site creation, or ingestion."
              />
            ) : (
              messages.map((message, messageIndex) => (
                <ChatMessage
                  isLastMessage={messageIndex === messages.length - 1}
                  key={message.id}
                  message={message}
                  onCopy={copyMessageText}
                  onRegenerate={() => void regenerate()}
                  showActions={message.role === "assistant" && !isBusy}
                />
              ))
            )}
            {assistantProgress ? (
              <AssistantProgressMessage progress={assistantProgress} />
            ) : null}
          </ConversationContent>
          {messages.length > 0 ? (
            <ConversationDownload
              filename={`highwood-chat-${chatId}.md`}
              messages={messages}
            />
          ) : null}
          <ConversationScrollButton />
        </Conversation>
        {error ? (
          <div className="mx-4 mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm md:mx-6">
            <div className="flex items-start justify-between gap-3">
              <p className="text-destructive">{error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearError}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
        <div className="border-t p-4 md:p-6">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(event) => setInput(event.currentTarget.value)}
                placeholder="Ask about site metrics, trends, or operations..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/chat?new=1">
                    <PlusIcon />
                    New Chat
                  </Link>
                </Button>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!input.trim() && !isBusy}
                onStop={stop}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>
    </div>
  )
}

type AssistantProgress = {
  detail: string
  elapsedSeconds: number
  title: string
}

type ChatHistoryProps = {
  activeChatId: string
  sessions: ChatSessionSummary[]
}

function ChatHistory({ activeChatId, sessions }: ChatHistoryProps) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col rounded-lg border bg-card p-3 lg:flex">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Conversations</p>
        <Button asChild size="icon-sm" variant="outline">
          <Link href="/chat?new=1">
            <PlusIcon />
            <span className="sr-only">New chat</span>
          </Link>
        </Button>
      </div>
      <div className="grid gap-1 overflow-y-auto">
        {sessions.map((session) => (
          <Button
            asChild
            className={cn(
              "h-auto justify-start px-2 py-2 text-left",
              activeChatId === session.id && "bg-muted"
            )}
            key={session.id}
            variant="ghost"
          >
            <Link href={`/chat/${session.id}`}>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm">{session.title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatSessionUpdatedAt(session.updatedAt)}
                </span>
              </span>
            </Link>
          </Button>
        ))}
      </div>
    </aside>
  )
}

type ChatMessageProps = {
  isLastMessage: boolean
  message: UIMessage
  onCopy: (message: UIMessage) => void
  onRegenerate: () => void
  showActions: boolean
}

function ChatMessage({
  isLastMessage,
  message,
  onCopy,
  onRegenerate,
  showActions,
}: ChatMessageProps) {
  return (
    <div className="grid gap-2">
      <Message from={message.role}>
        <MessageContent
          className={cn(
            message.role === "assistant" && "w-full max-w-none"
          )}
        >
          {message.parts.map((part, partIndex) => (
            <ChatMessagePart
              key={`${message.id}-${partIndex}`}
              part={part}
            />
          ))}
        </MessageContent>
      </Message>
      {showActions && isLastMessage ? (
        <MessageActions className="ml-1">
          <MessageAction label="Regenerate" onClick={onRegenerate}>
            <RefreshCcwIcon className="size-3" />
          </MessageAction>
          <MessageAction label="Copy" onClick={() => onCopy(message)}>
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      ) : null}
    </div>
  )
}

function ChatMessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") {
    return <MessageResponse>{part.text}</MessageResponse>
  }

  if (part.type.startsWith("tool-")) {
    return <ChatToolPart part={part as ToolUIPart} />
  }

  return null
}

function AssistantProgressMessage({
  progress,
}: {
  progress: AssistantProgress
}) {
  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none">
        <div
          aria-live="polite"
          className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm"
        >
          <Spinner className="text-muted-foreground" />
          <div className="min-w-0">
            <p className="font-medium">{progress.title}</p>
            <p className="text-xs text-muted-foreground">
              {progress.detail}
              {progress.elapsedSeconds > 0
                ? ` ${progress.elapsedSeconds}s`
                : ""}
            </p>
          </div>
        </div>
      </MessageContent>
    </Message>
  )
}

function ChatToolPart({ part }: { part: ToolUIPart }) {
  const renderOutput =
    part.state === "output-available" &&
    part.type === "tool-renderDashboardUi" &&
    isRenderDashboardUiOutput(part.output)
      ? part.output
      : null

  if (renderOutput) {
    return (
      <Tool className="not-prose" defaultOpen>
        <ToolHeader
          title={renderOutput.title}
          type={part.type}
          state={part.state}
        />
        <ToolContent>
          {renderOutput.reason ? (
            <p className="text-sm text-muted-foreground">
              {renderOutput.reason}
            </p>
          ) : null}
          <div className="rounded-md border bg-background p-3">
            <ChatRenderedUi spec={renderOutput.spec} />
          </div>
        </ToolContent>
      </Tool>
    )
  }

  return (
    <Tool
      className="not-prose"
      defaultOpen={part.state !== "output-available"}
    >
      <ToolHeader type={part.type} state={part.state} />
      <ToolContent>
        {"input" in part ? <ToolInput input={part.input} /> : null}
        <ToolOutput
          errorText={"errorText" in part ? part.errorText : undefined}
          output={"output" in part ? part.output : undefined}
        />
      </ToolContent>
    </Tool>
  )
}

type RenderDashboardUiOutput = {
  title: string
  reason: string | null
  spec: ChatRenderSpec
  renderedAt: string
}

function isRenderDashboardUiOutput(
  value: unknown
): value is RenderDashboardUiOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    "spec" in value &&
    typeof value.title === "string" &&
    typeof value.spec === "object" &&
    value.spec !== null
  )
}

function copyMessageText(message: UIMessage) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim()

  if (text) {
    void navigator.clipboard.writeText(text)
  }
}

function formatSessionUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt)

  if (Number.isNaN(date.getTime())) {
    return "Saved"
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  })
}

function getAssistantProgress({
  elapsedSeconds,
  messages,
  status,
}: {
  elapsedSeconds: number
  messages: UIMessage[]
  status: "submitted" | "streaming" | "ready" | "error"
}): AssistantProgress | null {
  if (status !== "submitted" && status !== "streaming") {
    return null
  }

  const latestMessage = messages.at(-1)

  if (
    latestMessage?.role === "assistant" &&
    hasVisibleAssistantActivity(latestMessage)
  ) {
    return null
  }

  if (status === "submitted") {
    return {
      detail: "Sending the request to the operations copilot.",
      elapsedSeconds,
      title: "Thinking",
    }
  }

  return {
    detail: "Preparing the response or selecting the right dashboard tool.",
    elapsedSeconds,
    title: "Working",
  }
}

function hasVisibleAssistantActivity(message: UIMessage) {
  return message.parts.some((part) => {
    if (part.type === "text") {
      return part.text.trim().length > 0
    }

    return part.type.startsWith("tool-")
  })
}

function useElapsedSeconds(isActive: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!isActive) {
      return
    }

    const startedAt = Date.now()

    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isActive])

  return isActive ? elapsedSeconds : 0
}
