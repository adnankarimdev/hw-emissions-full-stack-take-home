import { createHash } from 'node:crypto';
import { IngestMeasurementsRequest } from '../dto/ingest-measurements.dto';

export type MeasurementReadingCommand = {
  sourceId: string;
  measuredAt: Date;
  methaneKg: number;
  metadata?: Record<string, unknown>;
};

export class IngestMeasurementsCommand {
  readonly siteId: string;
  readonly idempotencyKey: string;
  readonly readings: MeasurementReadingCommand[];
  readonly requestHash: string;

  private constructor(request: IngestMeasurementsRequest) {
    this.siteId = request.site_id;
    this.idempotencyKey = request.idempotency_key;
    this.readings = request.readings.map((reading) => ({
      sourceId: reading.source_id,
      measuredAt: new Date(reading.measured_at),
      methaneKg: reading.methane_kg,
      metadata: reading.metadata,
    }));
    this.requestHash = createHash('sha256')
      .update(JSON.stringify(this.toCanonicalPayload()))
      .digest('hex');
  }

  static fromRequest(request: IngestMeasurementsRequest) {
    return new IngestMeasurementsCommand(request);
  }

  get emissionsTotal() {
    return this.readings.reduce(
      (total, reading) => total + reading.methaneKg,
      0,
    );
  }

  private toCanonicalPayload() {
    return {
      site_id: this.siteId,
      readings: this.readings.map((reading) => ({
        source_id: reading.sourceId,
        measured_at: reading.measuredAt.toISOString(),
        methane_kg: reading.methaneKg,
        metadata: reading.metadata ?? null,
      })),
    };
  }
}
