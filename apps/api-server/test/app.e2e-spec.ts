import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/shared/database/prisma.service';
import { ApiExceptionFilter } from './../src/shared/errors/api-exception.filter';
import { ApiResponseInterceptor } from './../src/shared/responses/api-response.interceptor';

type ApiSuccessEnvelope<TData> = {
  success: true;
  data: TData;
  meta: {
    request_id: string;
    timestamp: string;
  };
};

type SiteResponse = {
  id: string;
  name: string;
  emission_limit: number;
  total_emissions_to_date: number;
  metadata: Record<string, unknown>;
};

type IngestionResponse = {
  batch_id: string;
  site_id: string;
  readings_accepted: number;
  duplicate: boolean;
  total_emissions_to_date: number;
  compliance_status: string;
};

type SiteMetricsResponse = {
  site_id: string;
  emission_limit: number;
  total_emissions_to_date: number;
  compliance_status: string;
};

describe('Emissions API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdSiteIds: string[] = [];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new ApiResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    if (createdSiteIds.length > 0) {
      await prisma.outboxEvent.deleteMany({
        where: {
          aggregateId: {
            in: createdSiteIds,
          },
        },
      });
      await prisma.site.deleteMany({
        where: {
          id: {
            in: createdSiteIds,
          },
        },
      });
      createdSiteIds.length = 0;
    }

    await app.close();
  });

  it('creates a site, ingests a batch idempotently, and returns metrics', async () => {
    const siteResponse = await request(app.getHttpServer())
      .post('/sites')
      .send({
        name: `E2E Pad ${Date.now()}`,
        emission_limit: 1000,
        metadata: {
          location: 'Calgary, AB',
          operator: 'E2E Operator',
        },
      })
      .expect(201);
    const createdSite = siteResponse.body as ApiSuccessEnvelope<SiteResponse>;
    const siteId = createdSite.data.id;
    createdSiteIds.push(siteId);

    const payload = {
      site_id: siteId,
      idempotency_key: `e2e-${Date.now()}`,
      readings: [
        {
          source_id: 'sensor-e2e-1',
          measured_at: '2026-05-16T06:45:00.000Z',
          methane_kg: 42.5,
          metadata: {
            submitted_by: 'e2e-test',
          },
        },
      ],
    };

    const firstIngestResponse = await request(app.getHttpServer())
      .post('/ingest')
      .send(payload)
      .expect(201);
    const firstIngest =
      firstIngestResponse.body as ApiSuccessEnvelope<IngestionResponse>;

    expect(firstIngest.data).toMatchObject({
      site_id: siteId,
      readings_accepted: 1,
      duplicate: false,
      total_emissions_to_date: 42.5,
      compliance_status: 'Within Limit',
    });

    const retryResponse = await request(app.getHttpServer())
      .post('/ingest')
      .send(payload)
      .expect(201);
    const retry = retryResponse.body as ApiSuccessEnvelope<IngestionResponse>;

    expect(retry.data).toMatchObject({
      batch_id: firstIngest.data.batch_id,
      site_id: siteId,
      readings_accepted: 1,
      duplicate: true,
      total_emissions_to_date: 42.5,
      compliance_status: 'Within Limit',
    });

    await expect(
      prisma.measurement.count({
        where: {
          siteId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.ingestBatch.count({
        where: {
          siteId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.outboxEvent.count({
        where: {
          aggregateId: siteId,
          eventType: 'measurement.batch_ingested',
        },
      }),
    ).resolves.toBe(1);

    const metricsResponse = await request(app.getHttpServer())
      .get(`/sites/${siteId}/metrics`)
      .expect(200);
    const metrics =
      metricsResponse.body as ApiSuccessEnvelope<SiteMetricsResponse>;

    expect(metrics.data).toEqual({
      site_id: siteId,
      emission_limit: 1000,
      total_emissions_to_date: 42.5,
      compliance_status: 'Within Limit',
    });
  });
});
