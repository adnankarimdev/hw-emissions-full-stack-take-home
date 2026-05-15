import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { SitesModule } from '../sites/sites.module';
import { IngestController } from './ingest.controller';
import { IngestionService } from './ingestion.service';
import { IngestMeasurementsProcessor } from './processors/ingest-measurements.processor';
import { MeasurementsRepository } from './repositories/measurements.repository';

@Module({
  imports: [SitesModule, OutboxModule],
  controllers: [IngestController],
  providers: [
    IngestionService,
    IngestMeasurementsProcessor,
    MeasurementsRepository,
  ],
})
export class IngestionModule {}
