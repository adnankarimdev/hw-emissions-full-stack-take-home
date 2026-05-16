import { Prisma } from '@prisma/client';
import { ApplicationErrorCode } from '../../../shared/errors/application-error';
import { TransactionManager } from '../../../shared/transactions/transaction-manager';
import { OutboxRepository } from '../../outbox/outbox.repository';
import { SitesRepository } from '../../sites/sites.repository';
import { IngestMeasurementsCommand } from '../commands/ingest-measurements.command';
import { MeasurementsRepository } from '../repositories/measurements.repository';
import { IngestMeasurementsProcessor } from './ingest-measurements.processor';

describe('IngestMeasurementsProcessor', () => {
  const tx = { transaction: true };
  let processor: IngestMeasurementsProcessor;
  let transactionManager: { run: jest.Mock };
  let sitesRepository: {
    findById: jest.Mock;
    incrementTotalEmissions: jest.Mock;
  };
  let measurementsRepository: {
    createBatch: jest.Mock;
    createMeasurements: jest.Mock;
    findBatchByIdempotencyKey: jest.Mock;
  };
  let outboxRepository: {
    createMeasurementIngestedEvent: jest.Mock;
  };

  beforeEach(() => {
    transactionManager = {
      run: jest.fn(
        async (handler: (transaction: unknown) => Promise<unknown>) =>
          handler(tx),
      ),
    };
    sitesRepository = {
      findById: jest.fn(),
      incrementTotalEmissions: jest.fn(),
    };
    measurementsRepository = {
      createBatch: jest.fn(),
      createMeasurements: jest.fn(),
      findBatchByIdempotencyKey: jest.fn(),
    };
    outboxRepository = {
      createMeasurementIngestedEvent: jest.fn(),
    };

    processor = new IngestMeasurementsProcessor(
      transactionManager as unknown as TransactionManager,
      sitesRepository as unknown as SitesRepository,
      measurementsRepository as unknown as MeasurementsRepository,
      outboxRepository as unknown as OutboxRepository,
    );
  });

  it('persists measurements, increments the site total, and writes an outbox event in one transaction', async () => {
    const command = createCommand();

    sitesRepository.findById.mockResolvedValueOnce(createSite({ total: 0 }));
    measurementsRepository.createBatch.mockResolvedValueOnce({
      id: 'batch-1',
    });
    measurementsRepository.createMeasurements.mockResolvedValueOnce({
      count: 2,
    });
    sitesRepository.incrementTotalEmissions.mockResolvedValueOnce(
      createSite({ total: 30, limit: 100 }),
    );
    outboxRepository.createMeasurementIngestedEvent.mockResolvedValueOnce({
      id: 'event-1',
    });

    const result = await processor.execute(command);

    expect(transactionManager.run).toHaveBeenCalledTimes(1);
    expect(sitesRepository.findById).toHaveBeenCalledWith('site-1', tx);
    const [createBatchData, createBatchTx] = measurementsRepository.createBatch
      .mock.calls[0] as [
      {
        siteId: string;
        idempotencyKey: string;
        requestHash: string;
        readingsCount: number;
        emissionsTotal: Prisma.Decimal;
      },
      unknown,
    ];
    expect(createBatchData).toMatchObject({
      siteId: 'site-1',
      idempotencyKey: 'retry-key-1',
      requestHash: command.requestHash,
      readingsCount: 2,
    });
    expect(createBatchData.emissionsTotal.toNumber()).toBe(30);
    expect(createBatchTx).toBe(tx);
    expect(measurementsRepository.createMeasurements).toHaveBeenCalledWith(
      'site-1',
      'batch-1',
      command.readings,
      tx,
    );
    const [incrementSiteId, incrementAmount, incrementTx] = sitesRepository
      .incrementTotalEmissions.mock.calls[0] as [
      string,
      Prisma.Decimal,
      unknown,
    ];
    expect(incrementSiteId).toBe('site-1');
    expect(incrementAmount.toNumber()).toBe(30);
    expect(incrementTx).toBe(tx);
    expect(
      outboxRepository.createMeasurementIngestedEvent,
    ).toHaveBeenCalledWith(
      {
        siteId: 'site-1',
        batchId: 'batch-1',
        readingsCount: 2,
        emissionsTotal: 30,
      },
      tx,
    );
    expect(result).toEqual({
      batch_id: 'batch-1',
      site_id: 'site-1',
      readings_accepted: 2,
      duplicate: false,
      total_emissions_to_date: 30,
      compliance_status: 'Within Limit',
    });
  });

  it('returns the existing batch on an identical idempotent retry without double-counting emissions', async () => {
    const command = createCommand();

    transactionManager.run.mockRejectedValueOnce(createUniqueConstraintError());
    measurementsRepository.findBatchByIdempotencyKey.mockResolvedValueOnce({
      id: 'batch-1',
      requestHash: command.requestHash,
      readingsCount: 2,
    });
    sitesRepository.findById.mockResolvedValueOnce(
      createSite({ total: 30, limit: 100 }),
    );

    const result = await processor.execute(command);

    expect(
      measurementsRepository.findBatchByIdempotencyKey,
    ).toHaveBeenCalledWith('site-1', 'retry-key-1');
    expect(measurementsRepository.createMeasurements).not.toHaveBeenCalled();
    expect(sitesRepository.incrementTotalEmissions).not.toHaveBeenCalled();
    expect(
      outboxRepository.createMeasurementIngestedEvent,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      batch_id: 'batch-1',
      site_id: 'site-1',
      readings_accepted: 2,
      duplicate: true,
      total_emissions_to_date: 30,
      compliance_status: 'Within Limit',
    });
  });

  it('rejects a reused idempotency key when the retried payload is different', async () => {
    const command = createCommand();

    transactionManager.run.mockRejectedValueOnce(createUniqueConstraintError());
    measurementsRepository.findBatchByIdempotencyKey.mockResolvedValueOnce({
      id: 'batch-1',
      requestHash: 'different-request-hash',
      readingsCount: 2,
    });

    await expect(processor.execute(command)).rejects.toMatchObject({
      code: ApplicationErrorCode.IdempotencyConflict,
      statusCode: 409,
    });
    expect(sitesRepository.incrementTotalEmissions).not.toHaveBeenCalled();
    expect(
      outboxRepository.createMeasurementIngestedEvent,
    ).not.toHaveBeenCalled();
  });

  it('rejects missing sites before writing any ingestion records', async () => {
    const command = createCommand();

    sitesRepository.findById.mockResolvedValueOnce(null);

    await expect(processor.execute(command)).rejects.toMatchObject({
      code: ApplicationErrorCode.SiteNotFound,
      statusCode: 404,
    });
    expect(measurementsRepository.createBatch).not.toHaveBeenCalled();
    expect(measurementsRepository.createMeasurements).not.toHaveBeenCalled();
    expect(sitesRepository.incrementTotalEmissions).not.toHaveBeenCalled();
    expect(
      outboxRepository.createMeasurementIngestedEvent,
    ).not.toHaveBeenCalled();
  });
});

function createCommand() {
  return IngestMeasurementsCommand.fromRequest({
    site_id: 'site-1',
    idempotency_key: 'retry-key-1',
    readings: [
      {
        source_id: 'sensor-north-1',
        measured_at: '2026-05-16T06:00:00.000Z',
        methane_kg: 12.5,
      },
      {
        source_id: 'sensor-north-2',
        measured_at: '2026-05-16T06:01:00.000Z',
        methane_kg: 17.5,
        metadata: {
          submitted_by: 'unit-test',
        },
      },
    ],
  });
}

function createSite({
  id = 'site-1',
  limit = 100,
  total = 0,
}: {
  id?: string;
  limit?: number;
  total?: number;
}) {
  return {
    id,
    name: 'Bear Creek Pad 14',
    emissionLimit: new Prisma.Decimal(limit),
    totalEmissionsToDate: new Prisma.Decimal(total),
    metadata: {},
    createdAt: new Date('2026-05-16T00:00:00.000Z'),
    updatedAt: new Date('2026-05-16T00:00:00.000Z'),
  };
}

function createUniqueConstraintError() {
  return {
    code: 'P2002',
  };
}
