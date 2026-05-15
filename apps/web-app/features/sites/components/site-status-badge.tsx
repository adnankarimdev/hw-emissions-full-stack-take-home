import type { ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import type { ComplianceStatus } from "@/features/sites/types"

const statusConfig: Record<
  ComplianceStatus,
  {
    label: string
    variant: ComponentProps<typeof Badge>["variant"]
  }
> = {
  within_limit: {
    label: "Within Limit",
    variant: "secondary",
  },
  approaching_limit: {
    label: "Approaching Limit",
    variant: "outline",
  },
  limit_exceeded: {
    label: "Limit Exceeded",
    variant: "destructive",
  },
}

type SiteStatusBadgeProps = {
  status: ComplianceStatus
}

export function SiteStatusBadge({ status }: SiteStatusBadgeProps) {
  const config = statusConfig[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
