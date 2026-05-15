import { RadioTowerIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SiteSummary } from "@/features/sites/types"

type ManualIngestionFormPlaceholderProps = {
  sites: SiteSummary[]
}

export function ManualIngestionFormPlaceholder({
  sites,
}: ManualIngestionFormPlaceholderProps) {
  const defaultSite = sites[0]

  return (
    <Card id="ingestion">
      <CardHeader>
        <div className="flex items-center gap-2">
          <RadioTowerIcon className="size-4 text-muted-foreground" />
          <CardTitle>Manual Ingestion</CardTitle>
        </div>
        <CardDescription>Submit a sensor batch for a monitored site</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="site-id">Site ID</Label>
            <Input id="site-id" readOnly defaultValue={defaultSite?.id ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="idempotency-key">Idempotency Key</Label>
            <Input
              id="idempotency-key"
              readOnly
              defaultValue="demo-batch-2026-05-14-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="source-id">Source ID</Label>
              <Input id="source-id" readOnly defaultValue="sensor-north-7" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="methane-kg">Methane kg</Label>
              <Input id="methane-kg" readOnly defaultValue="126" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>
          Submit Batch
        </Button>
      </CardFooter>
    </Card>
  )
}
