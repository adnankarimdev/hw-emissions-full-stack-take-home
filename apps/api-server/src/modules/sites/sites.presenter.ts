import type { Measurement, Site } from '@prisma/client';

type SiteListRecord = Site & {
  measurements: Pick<Measurement, 'measuredAt'>[];
};

export function presentSite(site: Site) {
  return {
    id: site.id,
    name: site.name,
    emission_limit: site.emissionLimit.toNumber(),
    total_emissions_to_date: site.totalEmissionsToDate.toNumber(),
    metadata: site.metadata,
    created_at: site.createdAt.toISOString(),
    updated_at: site.updatedAt.toISOString(),
  };
}

export function presentSiteListItem(site: SiteListRecord) {
  const total = site.totalEmissionsToDate.toNumber();
  const limit = site.emissionLimit.toNumber();
  const latestMeasurement = site.measurements[0];

  return {
    id: site.id,
    name: site.name,
    emission_limit: limit,
    total_emissions_to_date: total,
    metadata: site.metadata,
    latest_reading_at: latestMeasurement?.measuredAt.toISOString() ?? null,
    compliance_status: presentComplianceStatus(total, limit),
    created_at: site.createdAt.toISOString(),
    updated_at: site.updatedAt.toISOString(),
  };
}

export function presentComplianceStatus(total: number, limit: number) {
  return total > limit ? 'Limit Exceeded' : 'Within Limit';
}
