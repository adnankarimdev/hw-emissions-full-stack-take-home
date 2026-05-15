import type { Metadata } from "next"

import { DashboardPage } from "@/features/dashboard/components/dashboard-page"

export const metadata: Metadata = {
  title: "Dashboard | Emissions Platform",
}

export default function Page() {
  return <DashboardPage />
}
