import { Site } from '@prisma/client';

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

export function presentComplianceStatus(total: number, limit: number) {
  return total > limit ? 'Limit Exceeded' : 'Within Limit';
}
