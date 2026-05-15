import { Injectable } from '@nestjs/common';
import { IngestMeasurementsCommand } from './commands/ingest-measurements.command';
import { IngestMeasurementsRequest } from './dto/ingest-measurements.dto';
import { IngestMeasurementsProcessor } from './processors/ingest-measurements.processor';

@Injectable()
export class IngestionService {
  constructor(
    private readonly ingestMeasurementsProcessor: IngestMeasurementsProcessor,
  ) {}

  ingestMeasurements(request: IngestMeasurementsRequest) {
    return this.ingestMeasurementsProcessor.execute(
      IngestMeasurementsCommand.fromRequest(request),
    );
  }
}
