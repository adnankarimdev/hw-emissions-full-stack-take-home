import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);

  processPendingEvents() {
    this.logger.debug(
      'Outbox processing is intentionally stubbed until a real alerting transport is selected.',
    );
  }
}
