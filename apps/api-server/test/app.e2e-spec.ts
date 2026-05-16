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

type SiteEmissionsTrendResponse = {
  site_id: string;
  days: number;
  start_date: string;
  end_date: string;
  timezone: string;
  points: Array<{
    date: string;
    methane_kg: number;
    cumulative_emissions_to_date: number;
    emission_limit: number;
    compliance_status: string;
  }>;
};

type ChatSessionResponse = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: Array<{
    id: string;
    role: string;
    parts: Array<Record<string, unknown>>;
  }>;
};

type DeletedChatSessionResponse = {
  deleted: boolean;
  id: string;
};

describe('Emissions API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdSiteIds: string[] = [];
  const createdChatSessionIds: string[] = [];

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

    if (createdChatSessionIds.length > 0) {
      await prisma.chatSession.deleteMany({
        where: {
          id: {
            in: createdChatSessionIds,
          },
        },
      });
      createdChatSessionIds.length = 0;
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

    const measuredAt = new Date();
    const measuredAtDateKey = measuredAt.toISOString().slice(0, 10);
    const payload = {
      site_id: siteId,
      idempotency_key: `e2e-${Date.now()}`,
      readings: [
        {
          source_id: 'sensor-e2e-1',
          measured_at: measuredAt.toISOString(),
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

    const trendResponse = await request(app.getHttpServer())
      .get(`/sites/${siteId}/emissions-trend?days=7`)
      .expect(200);
    const trend =
      trendResponse.body as ApiSuccessEnvelope<SiteEmissionsTrendResponse>;

    expect(trend.data).toMatchObject({
      site_id: siteId,
      days: 7,
      timezone: 'UTC',
    });
    expect(trend.data.points).toHaveLength(7);
    expect(trend.data.points.at(-1)).toMatchObject({
      date: measuredAtDateKey,
      methane_kg: 42.5,
      cumulative_emissions_to_date: 42.5,
      emission_limit: 1000,
      compliance_status: 'Within Limit',
    });
  });

  it('persists operations chat sessions and messages through the backend API', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/chat/sessions')
      .send()
      .expect(201);
    const createdChat =
      createResponse.body as ApiSuccessEnvelope<ChatSessionResponse>;
    createdChatSessionIds.push(createdChat.data.id);

    expect(createdChat.data).toMatchObject({
      title: 'New operations chat',
      message_count: 0,
      messages: [],
    });
    expect(createdChat.data.id).toMatch(/^chat_[a-f0-9]{32}$/);

    const messages = [
      {
        id: 'user-message-1',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Show me Calgary site metrics.',
          },
        ],
      },
      {
        id: 'assistant-message-1',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: 'I can render the metrics view.',
          },
        ],
      },
    ];

    const saveResponse = await request(app.getHttpServer())
      .put(`/chat/sessions/${createdChat.data.id}/messages`)
      .send({
        messages,
      })
      .expect(200);
    const savedChat =
      saveResponse.body as ApiSuccessEnvelope<ChatSessionResponse>;

    expect(savedChat.data).toMatchObject({
      id: createdChat.data.id,
      title: 'Show me Calgary site metrics.',
      message_count: 2,
      messages,
    });

    const fetchedResponse = await request(app.getHttpServer())
      .get(`/chat/sessions/${createdChat.data.id}`)
      .expect(200);
    const fetchedChat =
      fetchedResponse.body as ApiSuccessEnvelope<ChatSessionResponse>;

    expect(fetchedChat.data.messages).toEqual(messages);

    const latestResponse = await request(app.getHttpServer())
      .get('/chat/sessions/latest')
      .expect(200);
    const latestChat =
      latestResponse.body as ApiSuccessEnvelope<ChatSessionResponse | null>;

    expect(latestChat.data?.id).toBe(createdChat.data.id);

    const listResponse = await request(app.getHttpServer())
      .get('/chat/sessions')
      .expect(200);
    const chatList = listResponse.body as ApiSuccessEnvelope<
      Array<Omit<ChatSessionResponse, 'messages'>>
    >;

    expect(chatList.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdChat.data.id,
          message_count: 2,
        }),
      ]),
    );

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/chat/sessions/${createdChat.data.id}`)
      .expect(200);
    const deletedChat =
      deleteResponse.body as ApiSuccessEnvelope<DeletedChatSessionResponse>;

    expect(deletedChat.data).toEqual({
      id: createdChat.data.id,
      deleted: true,
    });

    await request(app.getHttpServer())
      .get(`/chat/sessions/${createdChat.data.id}`)
      .expect(404);
  });
});
