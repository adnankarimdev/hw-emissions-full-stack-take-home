import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

type DashboardShellProps = {
  children: ReactNode
  title: string
}

const shellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties

export function DashboardShell({ children, title }: DashboardShellProps) {
  return (
    <SidebarProvider style={shellStyle}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={title} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
