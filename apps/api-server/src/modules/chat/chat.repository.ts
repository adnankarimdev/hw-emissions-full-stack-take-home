import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseClient } from '../../shared/database/database-client.type';
import { PrismaService } from '../../shared/database/prisma.service';

type CreateChatSessionData = {
  id: string;
  title: string;
};

type ReplaceChatMessagesData = {
  id: string;
  messages: Array<{
    messageId: string;
    metadata?: Prisma.InputJsonValue;
    parts: Prisma.InputJsonValue;
    position: number;
    role: string;
  }>;
  title: string;
};

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(
    data: CreateChatSessionData,
    client: DatabaseClient = this.prisma,
  ) {
    return client.chatSession.create({
      data: {
        id: data.id,
        title: data.title,
      },
      include: {
        messages: true,
      },
    });
  }

  findSessionById(id: string, client: DatabaseClient = this.prisma) {
    return client.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  findLatestSession(client: DatabaseClient = this.prisma) {
    return client.chatSession.findFirst({
      include: {
        messages: {
          orderBy: {
            position: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  listSessions(client: DatabaseClient = this.prisma) {
    return client.chatSession.findMany({
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async deleteSession(id: string, client: DatabaseClient = this.prisma) {
    const result = await client.chatSession.deleteMany({
      where: {
        id,
      },
    });

    return result.count;
  }

  replaceMessages(data: ReplaceChatMessagesData) {
    return this.prisma.$transaction(async (transaction) => {
      const existingSession = await transaction.chatSession.findUnique({
        where: {
          id: data.id,
        },
        select: {
          id: true,
        },
      });

      if (!existingSession) {
        return null;
      }

      await transaction.chatSession.update({
        where: {
          id: data.id,
        },
        data: {
          title: data.title,
        },
      });

      await transaction.chatMessage.deleteMany({
        where: {
          sessionId: data.id,
        },
      });

      if (data.messages.length > 0) {
        await transaction.chatMessage.createMany({
          data: data.messages.map((message) => {
            const base = {
              sessionId: data.id,
              messageId: message.messageId,
              role: message.role,
              parts: message.parts,
              position: message.position,
            };

            if (message.metadata === undefined) {
              return base;
            }

            return {
              ...base,
              metadata: message.metadata,
            };
          }),
        });
      }

      return this.findSessionById(data.id, transaction);
    });
  }
}
