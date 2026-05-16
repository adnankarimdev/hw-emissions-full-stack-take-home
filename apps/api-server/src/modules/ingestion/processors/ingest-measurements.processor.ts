import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OutboxRepository } from '../../outbox/outbox.repository';
import { presentComplianceStatus } from '../../sites/sites.presenter';
import { SitesRepository } from '../../sites/sites.repository';
import { ApplicationError } from '../../../shared/errors/application-error';
import { TransactionManager } from '../../../shared/transactions/transaction-manager';
import { IngestMeasurementsCommand } from '../commands/ingest-measurements.command';
import { MeasurementsRepository } from '../repositories/measurements.repository';

@Injectable()
export class IngestMeasurementsProcessor {
  constructor(
    private readonly transactionManager: TransactionManager,
    private readonly sitesRepository: SitesRepository,
    private readonly measurementsRepository: MeasurementsRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async execute(command: IngestMeasurementsCommand) {
    try {
      return await this.transactionManager.run(async (tx) => {
        const siteExists = await this.sitesRepository.lockByIdForUpdate(
          command.siteId,
          tx,
        );

        if (!siteExists) {
          throw ApplicationError.notFound(
            `Site ${command.siteId} was not found.`,
          );
        }

        const emissionsTotal = new Prisma.Decimal(command.emissionsTotal);
        const batch = await this.measurementsRepository.createBatch(
          {
            siteId: command.siteId,
            idempotencyKey: command.idempotencyKey,
            requestHash: command.requestHash,
            readingsCount: command.readings.length,
            emissionsTotal,
          },
          tx,
        );

        await this.measurementsRepository.createMeasurements(
          command.siteId,
          batch.id,
          command.readings,
          tx,
        );

        const updatedSite = await this.sitesRepository.incrementTotalEmissions(
          command.siteId,
          emissionsTotal,
          tx,
        );

        await this.outboxRepository.createMeasurementIngestedEvent(
          {
            siteId: command.siteId,
            batchId: batch.id,
            readingsCount: command.readings.length,
            emissionsTotal: command.emissionsTotal,
          },
          tx,
        );

        const total = updatedSite.totalEmissionsToDate.toNumber();
        const limit = updatedSite.emissionLimit.toNumber();

        return {
          batch_id: batch.id,
          site_id: command.siteId,
          readings_accepted: command.readings.length,
          duplicate: false,
          total_emissions_to_date: total,
          compliance_status: presentComplianceStatus(total, limit),
        };
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      return this.handleDuplicateRequest(command);
    }
  }

  private async handleDuplicateRequest(command: IngestMeasurementsCommand) {
    const existingBatch =
      await this.measurementsRepository.findBatchByIdempotencyKey(
        command.siteId,
        command.idempotencyKey,
      );

    if (!existingBatch) {
      throw ApplicationError.idempotencyConflict({
        site_id: command.siteId,
        idempotency_key: command.idempotencyKey,
      });
    }

    if (existingBatch.requestHash !== command.requestHash) {
      throw ApplicationError.idempotencyConflict({
        site_id: command.siteId,
        idempotency_key: command.idempotencyKey,
      });
    }

    const site = await this.sitesRepository.findById(command.siteId);

    if (!site) {
      throw ApplicationError.notFound(`Site ${command.siteId} was not found.`);
    }

    const total = site.totalEmissionsToDate.toNumber();
    const limit = site.emissionLimit.toNumber();

    return {
      batch_id: existingBatch.id,
      site_id: command.siteId,
      readings_accepted: existingBatch.readingsCount,
      duplicate: true,
      total_emissions_to_date: total,
      compliance_status: presentComplianceStatus(total, limit),
    };
  }
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
