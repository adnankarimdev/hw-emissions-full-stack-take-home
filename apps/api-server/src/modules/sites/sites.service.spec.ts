import { Prisma } from '@prisma/client';
import { ApplicationErrorCode } from '../../shared/errors/application-error';
import { SitesRepository } from './sites.repository';
import { SitesService } from './sites.service';

describe('SitesService', () => {
  let service: SitesService;
  let sitesRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    list: jest.Mock;
    listMeasurementsInRange: jest.Mock;
    sumMeasurementsBefore: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-16T12:00:00.000Z'));

    sitesRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
      listMeasurementsInRange: jest.fn(),
      sumMeasurementsBefore: jest.fn(),
    };
    service = new SitesService(sitesRepository as unknown as SitesRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns within-limit metrics when the total is below the emission limit', async () => {
    sitesRepository.findById.mockResolvedValueOnce(
      createSite({ total: 75, limit: 100 }),
    );

    await expect(service.getSiteMetrics('site-1')).resolves.toEqual({
      site_id: 'site-1',
      emission_limit: 100,
      total_emissions_to_date: 75,
      compliance_status: 'Within Limit',
    });
  });

  it('returns limit-exceeded metrics when the total is above the emission limit', async () => {
    sitesRepository.findById.mockResolvedValueOnce(
      createSite({ total: 125, limit: 100 }),
    );

    await expect(service.getSiteMetrics('site-1')).resolves.toEqual({
      site_id: 'site-1',
      emission_limit: 100,
      total_emissions_to_date: 125,
      compliance_status: 'Limit Exceeded',
    });
  });

  it('throws a site-not-found error when metrics are requested for a missing site', async () => {
    sitesRepository.findById.mockResolvedValueOnce(null);

    await expect(service.getSiteMetrics('missing-site')).rejects.toMatchObject({
      code: ApplicationErrorCode.SiteNotFound,
      statusCode: 404,
    });
  });

  it('returns a per-site cumulative emissions trend from measured readings', async () => {
    sitesRepository.findById.mockResolvedValueOnce(
      createSite({ total: 125, limit: 100 }),
    );
    sitesRepository.sumMeasurementsBefore.mockResolvedValueOnce({
      _sum: {
        methaneKg: new Prisma.Decimal(25),
      },
    });
    sitesRepository.listMeasurementsInRange.mockResolvedValueOnce([
      createMeasurement('2026-05-14T04:00:00.000Z', 10),
      createMeasurement('2026-05-16T06:00:00.000Z', 35),
      createMeasurement('2026-05-16T18:00:00.000Z', 55),
    ]);

    await expect(
      service.getSiteEmissionsTrend('site-1', { days: 3 }),
    ).resolves.toEqual({
      site_id: 'site-1',
      days: 3,
      start_date: '2026-05-14',
      end_date: '2026-05-16',
      timezone: 'UTC',
      points: [
        {
          date: '2026-05-14',
          methane_kg: 10,
          cumulative_emissions_to_date: 35,
          emission_limit: 100,
          compliance_status: 'Within Limit',
        },
        {
          date: '2026-05-15',
          methane_kg: 0,
          cumulative_emissions_to_date: 35,
          emission_limit: 100,
          compliance_status: 'Within Limit',
        },
        {
          date: '2026-05-16',
          methane_kg: 90,
          cumulative_emissions_to_date: 125,
          emission_limit: 100,
          compliance_status: 'Limit Exceeded',
        },
      ],
    });
    expect(sitesRepository.sumMeasurementsBefore).toHaveBeenCalledWith(
      'site-1',
      new Date('2026-05-14T00:00:00.000Z'),
    );
    expect(sitesRepository.listMeasurementsInRange).toHaveBeenCalledWith(
      'site-1',
      new Date('2026-05-14T00:00:00.000Z'),
      new Date('2026-05-17T00:00:00.000Z'),
    );
  });

  it('throws a site-not-found error when trend data is requested for a missing site', async () => {
    sitesRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.getSiteEmissionsTrend('missing-site', { days: 7 }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCode.SiteNotFound,
      statusCode: 404,
    });
  });
});

function createSite({
  id = 'site-1',
  limit,
  total,
}: {
  id?: string;
  limit: number;
  total: number;
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

function createMeasurement(measuredAt: string, methaneKg: number) {
  return {
    measuredAt: new Date(measuredAt),
    methaneKg: new Prisma.Decimal(methaneKg),
  };
}
