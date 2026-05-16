import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApplicationError } from '../../shared/errors/application-error';
import { CreateSiteRequest } from './dto/create-site.dto';
import { SiteEmissionsTrendQuery } from './dto/site-emissions-trend-query.dto';
import {
  presentComplianceStatus,
  presentSite,
  presentSiteListItem,
} from './sites.presenter';
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

  async listSites() {
    const sites = await this.sitesRepository.list();

    return sites.map(presentSiteListItem);
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

  async getSiteEmissionsTrend(siteId: string, query: SiteEmissionsTrendQuery) {
    const site = await this.sitesRepository.findById(siteId);

    if (!site) {
      throw ApplicationError.notFound(`Site ${siteId} was not found.`);
    }

    const range = buildUtcDayRange(query.days);
    const [baselineResult, measurements] = await Promise.all([
      this.sitesRepository.sumMeasurementsBefore(siteId, range.start),
      this.sitesRepository.listMeasurementsInRange(
        siteId,
        range.start,
        range.endExclusive,
      ),
    ]);
    const totalsByDate = new Map<string, number>();

    for (const measurement of measurements) {
      const dateKey = toUtcDateKey(measurement.measuredAt);
      const currentTotal = totalsByDate.get(dateKey) ?? 0;

      totalsByDate.set(
        dateKey,
        currentTotal + measurement.methaneKg.toNumber(),
      );
    }

    const limit = site.emissionLimit.toNumber();
    let cumulativeTotal = baselineResult._sum.methaneKg?.toNumber() ?? 0;

    const points = range.dateKeys.map((dateKey) => {
      const methaneTotal = totalsByDate.get(dateKey) ?? 0;

      cumulativeTotal += methaneTotal;

      return {
        date: dateKey,
        methane_kg: methaneTotal,
        cumulative_emissions_to_date: cumulativeTotal,
        emission_limit: limit,
        compliance_status: presentComplianceStatus(cumulativeTotal, limit),
      };
    });

    return {
      site_id: site.id,
      days: query.days,
      start_date: range.dateKeys[0],
      end_date: range.dateKeys[range.dateKeys.length - 1],
      timezone: 'UTC',
      points,
    };
  }
}

function buildUtcDayRange(days: number, now = new Date()) {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startTime = today - (days - 1) * millisecondsInDay;
  const endExclusiveTime = today + millisecondsInDay;
  const dateKeys = Array.from({ length: days }, (_, index) =>
    toUtcDateKey(new Date(startTime + index * millisecondsInDay)),
  );

  return {
    start: new Date(startTime),
    endExclusive: new Date(endExclusiveTime),
    dateKeys,
  };
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const millisecondsInDay = 24 * 60 * 60 * 1000;
