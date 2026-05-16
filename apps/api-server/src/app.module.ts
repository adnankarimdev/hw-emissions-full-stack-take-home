import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './modules/chat/chat.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { SitesModule } from './modules/sites/sites.module';
import { DatabaseModule } from './shared/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    SitesModule,
    IngestionModule,
    OutboxModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
