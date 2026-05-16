import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ApplicationError } from '../../shared/errors/application-error';
import type { ChatMessageRequest } from './dto/save-chat-messages.dto';
import type { SaveChatMessagesRequest } from './dto/save-chat-messages.dto';
import { ChatRepository } from './chat.repository';
import {
  presentChatSession,
  presentChatSessionSummary,
} from './chat.presenter';

const CHAT_ID_PATTERN = /^chat_[a-f0-9]{32}$/;
const DEFAULT_CHAT_TITLE = 'New operations chat';

@Injectable()
export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

  async createSession() {
    const session = await this.chatRepository.createSession({
      id: createChatId(),
      title: DEFAULT_CHAT_TITLE,
    });

    return presentChatSession(session);
  }

  async getSession(chatSessionId: string) {
    assertValidChatSessionId(chatSessionId);

    const session = await this.chatRepository.findSessionById(chatSessionId);

    if (!session) {
      throw ApplicationError.chatSessionNotFound(chatSessionId);
    }

    return presentChatSession(session);
  }

  async getLatestSession() {
    const session = await this.chatRepository.findLatestSession();

    return session ? presentChatSession(session) : null;
  }

  async listSessions() {
    const sessions = await this.chatRepository.listSessions();

    return sessions.map(presentChatSessionSummary);
  }

  async replaceMessages(
    chatSessionId: string,
    request: SaveChatMessagesRequest,
  ) {
    assertValidChatSessionId(chatSessionId);

    const messages = request.messages.map((message, index) => ({
      messageId: message.id,
      role: message.role,
      parts: message.parts as Prisma.InputJsonValue,
      metadata:
        message.metadata === undefined
          ? undefined
          : (message.metadata as Prisma.InputJsonValue),
      position: index,
    }));
    const session = await this.chatRepository.replaceMessages({
      id: chatSessionId,
      title: titleFromMessages(request.messages),
      messages,
    });

    if (!session) {
      throw ApplicationError.chatSessionNotFound(chatSessionId);
    }

    return presentChatSession(session);
  }
}

function createChatId() {
  return `chat_${randomUUID().replaceAll('-', '')}`;
}

function assertValidChatSessionId(chatSessionId: string) {
  if (CHAT_ID_PATTERN.test(chatSessionId)) {
    return;
  }

  throw ApplicationError.validation({
    chat_session_id: ['Expected a chat session id in the format chat_<uuid>.'],
  });
}

function titleFromMessages(messages: ChatMessageRequest[]) {
  const firstUserText = messages
    .filter((message) => message.role === 'user')
    .map(getMessageText)
    .find((text) => text.length > 0);

  if (!firstUserText) {
    return DEFAULT_CHAT_TITLE;
  }

  return firstUserText.length > 64
    ? `${firstUserText.slice(0, 61).trim()}...`
    : firstUserText;
}

function getMessageText(message: ChatMessageRequest) {
  return message.parts
    .map((part) =>
      part.type === 'text' && 'text' in part && typeof part.text === 'string'
        ? part.text
        : '',
    )
    .join('')
    .trim();
}
