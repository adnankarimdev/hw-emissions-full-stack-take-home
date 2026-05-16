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
  };

  beforeEach(() => {
    sitesRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      list: jest.fn(),
    };
    service = new SitesService(sitesRepository as unknown as SitesRepository);
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
