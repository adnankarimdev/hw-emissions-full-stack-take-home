import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  sites: SiteSummary[]
}

export function SitesOverviewTable({ sites }: SitesOverviewTableProps) {
  return (
    <Card id="sites">
      <CardHeader>
        <CardTitle>Site Performance</CardTitle>
        <CardDescription>Current totals and compliance status</CardDescription>
      </CardHeader>
      <CardContent>
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
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No sites have been created yet.
                </TableCell>
              </TableRow>
            ) : null}
            {sites.map((site) => {
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
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
