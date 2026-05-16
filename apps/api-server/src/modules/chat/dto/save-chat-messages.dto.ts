import { z } from 'zod';

const chatMessagePartSchema = z
  .object({
    type: z.string().trim().min(1),
  })
  .catchall(z.unknown());

const chatMessageSchema = z.object({
  id: z.string().trim().min(1).max(160),
  role: z.enum(['system', 'user', 'assistant']),
  parts: z.array(chatMessagePartSchema).min(1),
  metadata: z.unknown().optional(),
});

export const saveChatMessagesSchema = z.object({
  messages: z.array(chatMessageSchema).max(200),
});

export type SaveChatMessagesRequest = z.infer<typeof saveChatMessagesSchema>;
export type ChatMessageRequest = SaveChatMessagesRequest['messages'][number];
