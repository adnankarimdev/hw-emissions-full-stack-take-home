import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApplicationError } from '../../shared/errors/application-error';
import { CreateSiteRequest } from './dto/create-site.dto';
import { presentComplianceStatus, presentSite } from './sites.presenter';
import { SitesRepository } from './sites.repository';

@Injectable()
export class SitesService {
  constructor(private readonly sitesRepository: SitesRepository) {}

  async createSite(request: CreateSiteRequest) {
    const site = await this.sitesRepository.create({
      name: request.name,
      emissionLimit: request.emission_limit,
      metadata: request.metadata as Prisma.InputJsonObject,
    });

    return presentSite(site);
  }

  async getSiteMetrics(siteId: string) {
    const site = await this.sitesRepository.findById(siteId);

    if (!site) {
      throw ApplicationError.notFound(`Site ${siteId} was not found.`);
    }

    const total = site.totalEmissionsToDate.toNumber();
    const limit = site.emissionLimit.toNumber();

    return {
      site_id: site.id,
      emission_limit: limit,
      total_emissions_to_date: total,
      compliance_status: presentComplianceStatus(total, limit),
    };
  }
}
