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
  "Within Limit": {
    label: "Within Limit",
    variant: "secondary",
  },
  "Limit Exceeded": {
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
