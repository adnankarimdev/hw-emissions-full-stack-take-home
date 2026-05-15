import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseClient } from '../../../shared/database/database-client.type';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MeasurementReadingCommand } from '../commands/ingest-measurements.command';

type CreateBatchData = {
  siteId: string;
  idempotencyKey: string;
  requestHash: string;
  readingsCount: number;
  emissionsTotal: Prisma.Decimal;
};

@Injectable()
export class MeasurementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createBatch(data: CreateBatchData, client: DatabaseClient = this.prisma) {
    return client.ingestBatch.create({
      data: {
        siteId: data.siteId,
        idempotencyKey: data.idempotencyKey,
        requestHash: data.requestHash,
        readingsCount: data.readingsCount,
        emissionsTotal: data.emissionsTotal,
      },
    });
  }

  findBatchByIdempotencyKey(
    siteId: string,
    idempotencyKey: string,
    client: DatabaseClient = this.prisma,
  ) {
    return client.ingestBatch.findUnique({
      where: {
        siteId_idempotencyKey: {
          siteId,
          idempotencyKey,
        },
      },
    });
  }

  createMeasurements(
    siteId: string,
    batchId: string,
    readings: MeasurementReadingCommand[],
    client: DatabaseClient = this.prisma,
  ) {
    return client.measurement.createMany({
      data: readings.map((reading) => {
        const base = {
          siteId,
          batchId,
          sourceId: reading.sourceId,
          measuredAt: reading.measuredAt,
          methaneKg: new Prisma.Decimal(reading.methaneKg),
        };

        if (!reading.metadata) {
          return base;
        }

        return {
          ...base,
          metadata: reading.metadata as Prisma.InputJsonObject,
        };
      }),
    });
  }
}
