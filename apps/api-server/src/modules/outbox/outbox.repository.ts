import { Injectable } from '@nestjs/common';
import { DatabaseClient } from '../../shared/database/database-client.type';
import { PrismaService } from '../../shared/database/prisma.service';

type MeasurementIngestedEvent = {
  siteId: string;
  batchId: string;
  readingsCount: number;
  emissionsTotal: number;
};

@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  createMeasurementIngestedEvent(
    event: MeasurementIngestedEvent,
    client: DatabaseClient = this.prisma,
  ) {
    return client.outboxEvent.create({
      data: {
        aggregateType: 'site',
        aggregateId: event.siteId,
        eventType: 'measurement.batch_ingested',
        payload: {
          site_id: event.siteId,
          batch_id: event.batchId,
          readings_count: event.readingsCount,
          emissions_total: event.emissionsTotal,
        },
      },
    });
  }
}
