import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatRepository, ChatService],
})
export class ChatModule {}
