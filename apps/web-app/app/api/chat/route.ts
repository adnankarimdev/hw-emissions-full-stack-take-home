import {
  convertToModelMessages,
  createIdGenerator,
  gateway,
  stepCountIs,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai"
import { z } from "zod"

import { buildOperationsChatSystemPrompt } from "@/features/chat/ai/system-prompt"
import { operationsChatTools } from "@/features/chat/ai/tools"
import {
  sanitizeChatMessages,
  saveChatMessages,
} from "@/features/chat/server/chat-store"

export const maxDuration = 60
export const runtime = "nodejs"

const chatRequestSchema = z.object({
  chatId: z.string().min(1),
  messages: z.array(z.unknown()),
})

type ValidateUIMessagesOptions = Parameters<typeof validateUIMessages>[0]

export async function POST(request: Request) {
  const parsedBody = chatRequestSchema.safeParse(await request.json())

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "Invalid chat request.",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    )
  }

  const { chatId, messages } = parsedBody.data
  let validatedMessages: UIMessage[]

  try {
    const sanitizedMessages = sanitizeChatMessages(messages)
    validatedMessages = await validateUIMessages({
      messages: sanitizedMessages,
      tools: operationsChatTools as ValidateUIMessagesOptions["tools"],
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stored chat messages could not be validated.",
      },
      { status: 400 }
    )
  }

  await saveChatMessages({
    chatId,
    messages: validatedMessages,
  })

  const result = streamText({
    model: gateway(process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5-nano"),
    system: buildOperationsChatSystemPrompt(),
    messages: await convertToModelMessages(validatedMessages),
    tools: operationsChatTools,
    stopWhen: stepCountIs(8),
  })

  result.consumeStream()

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    onFinish: async ({ messages }) => {
      await saveChatMessages({
        chatId,
        messages,
      })
    },
    onError: (error) =>
      error instanceof Error ? error.message : "Chat response failed.",
  })
}
