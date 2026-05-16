import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../shared/validation/zod-validation.pipe';
import { ChatService } from './chat.service';
import type { SaveChatMessagesRequest } from './dto/save-chat-messages.dto';
import { saveChatMessagesSchema } from './dto/save-chat-messages.dto';

@Controller('chat/sessions')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  createSession() {
    return this.chatService.createSession();
  }

  @Get()
  listSessions() {
    return this.chatService.listSessions();
  }

  @Get('latest')
  getLatestSession() {
    return this.chatService.getLatestSession();
  }

  @Get(':id')
  getSession(@Param('id') chatSessionId: string) {
    return this.chatService.getSession(chatSessionId);
  }

  @Delete(':id')
  deleteSession(@Param('id') chatSessionId: string) {
    return this.chatService.deleteSession(chatSessionId);
  }

  @Put(':id/messages')
  replaceMessages(
    @Param('id') chatSessionId: string,
    @Body(new ZodValidationPipe(saveChatMessagesSchema))
    body: SaveChatMessagesRequest,
  ) {
    return this.chatService.replaceMessages(chatSessionId, body);
  }
}
