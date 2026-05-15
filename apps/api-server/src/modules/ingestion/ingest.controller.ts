import { Body, Controller, Post } from '@nestjs/common';
import type { IngestMeasurementsRequest } from './dto/ingest-measurements.dto';
import { ingestMeasurementsSchema } from './dto/ingest-measurements.dto';
import { IngestionService } from './ingestion.service';
import { ZodValidationPipe } from '../../shared/validation/zod-validation.pipe';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post()
  ingestMeasurements(
    @Body(new ZodValidationPipe(ingestMeasurementsSchema))
    body: IngestMeasurementsRequest,
  ) {
    return this.ingestionService.ingestMeasurements(body);
  }
}
