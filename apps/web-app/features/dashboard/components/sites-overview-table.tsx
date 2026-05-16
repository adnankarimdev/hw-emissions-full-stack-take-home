import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SiteStatusBadge } from "@/features/sites/components/site-status-badge"
import type { SiteSummary } from "@/features/sites/types"
import {
  formatKilograms,
  formatPercent,
  formatReadingTimestamp,
} from "@/lib/format/emissions"

type SitesOverviewTableProps = {
  isLoading?: boolean
  sites: SiteSummary[]
  variant?: "card" | "embedded"
}

export function SitesOverviewTable({
  isLoading = false,
  sites,
  variant = "card",
}: SitesOverviewTableProps) {
  if (variant === "embedded") {
    return (
      <section id="sites" className="border-t pt-5">
        <div className="mb-3">
          <h2 className="font-heading text-base font-medium leading-normal">
            Site Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Current totals and compliance status
          </p>
        </div>
        <SitesTable isLoading={isLoading} sites={sites} />
      </section>
    )
  }

  return (
    <Card id="sites">
      <CardHeader>
        <CardTitle>Site Performance</CardTitle>
        <CardDescription>Current totals and compliance status</CardDescription>
      </CardHeader>
      <CardContent>
        <SitesTable isLoading={isLoading} sites={sites} />
      </CardContent>
    </Card>
  )
}

function SitesTable({
  isLoading,
  sites,
}: {
  isLoading: boolean
  sites: SiteSummary[]
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Site</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Limit Used</TableHead>
            <TableHead className="text-right">Latest Reading</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-busy={isLoading}>
          {isLoading ? <SitesTableSkeleton /> : null}
          {!isLoading && sites.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No sites have been created yet.
              </TableCell>
            </TableRow>
          ) : null}
          {!isLoading
            ? sites.map((site) => {
                const limitUsed = site.totalEmissionsKg / site.emissionLimitKg

                return (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {site.location}
                      </div>
                    </TableCell>
                    <TableCell>{site.operator}</TableCell>
                    <TableCell>
                      <SiteStatusBadge status={site.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatKilograms(site.totalEmissionsKg)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(limitUsed)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatReadingTimestamp(site.latestReadingAt)}
                    </TableCell>
                  </TableRow>
                )
              })
            : null}
        </TableBody>
      </Table>
    </div>
  )
}

function SitesTableSkeleton() {
  return Array.from({ length: 3 }, (_, index) => (
    <TableRow key={index}>
      <TableCell>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-4 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-28" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-5 w-20" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-5 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-5 w-24" />
      </TableCell>
    </TableRow>
  ))
}
