import { backendDeletedChatSessionSchema } from "@/features/chat/api/chat-contracts"
import { requestJson } from "@/lib/api/client"
import { apiEndpoints } from "@/lib/api/endpoints"

export async function deleteChatSession(chatId: string) {
  return requestJson(apiEndpoints.chatSession(chatId), {
    method: "DELETE",
    schema: backendDeletedChatSessionSchema,
  })
}
