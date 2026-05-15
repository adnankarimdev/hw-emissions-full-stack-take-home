import { Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';
import { OutboxWorker } from './outbox.worker';

@Module({
  providers: [OutboxRepository, OutboxWorker],
  exports: [OutboxRepository, OutboxWorker],
})
export class OutboxModule {}
