import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseClient } from '../../shared/database/database-client.type';
import { PrismaService } from '../../shared/database/prisma.service';

type CreateSiteData = {
  name: string;
  emissionLimit: number;
  metadata: Prisma.InputJsonObject;
};

@Injectable()
export class SitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSiteData, client: DatabaseClient = this.prisma) {
    return client.site.create({
      data: {
        name: data.name,
        emissionLimit: new Prisma.Decimal(data.emissionLimit),
        metadata: data.metadata,
      },
    });
  }

  findById(id: string, client: DatabaseClient = this.prisma) {
    return client.site.findUnique({
      where: { id },
    });
  }

  list(client: DatabaseClient = this.prisma) {
    return client.site.findMany({
      include: {
        measurements: {
          orderBy: {
            measuredAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  sumMeasurementsBefore(
    siteId: string,
    before: Date,
    client: DatabaseClient = this.prisma,
  ) {
    return client.measurement.aggregate({
      where: {
        siteId,
        measuredAt: {
          lt: before,
        },
      },
      _sum: {
        methaneKg: true,
      },
    });
  }

  listMeasurementsInRange(
    siteId: string,
    start: Date,
    end: Date,
    client: DatabaseClient = this.prisma,
  ) {
    return client.measurement.findMany({
      where: {
        siteId,
        measuredAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        measuredAt: true,
        methaneKg: true,
      },
      orderBy: {
        measuredAt: 'asc',
      },
    });
  }

  incrementTotalEmissions(
    siteId: string,
    amount: Prisma.Decimal,
    client: DatabaseClient = this.prisma,
  ) {
    return client.site.update({
      where: { id: siteId },
      data: {
        totalEmissionsToDate: {
          increment: amount,
        },
      },
    });
  }
}
