"use client"

import type { ComponentProps } from "react"
import Link from "next/link"
import {
  ActivityIcon,
  BellIcon,
  Building2Icon,
  CircleHelpIcon,
  GaugeIcon,
  HistoryIcon,
  RadioTowerIcon,
  Settings2Icon,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const primaryNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: GaugeIcon,
    isActive: true,
  },
  {
    title: "Sites",
    href: "/dashboard#sites",
    icon: Building2Icon,
  },
  {
    title: "Ingestion",
    href: "/dashboard#ingestion",
    icon: RadioTowerIcon,
  },
  {
    title: "Alerts",
    href: "/dashboard#alerts",
    icon: BellIcon,
  },
  {
    title: "Audit Trail",
    href: "/dashboard#audit",
    icon: HistoryIcon,
  },
]

const secondaryNavItems = [
  {
    title: "Settings",
    href: "/dashboard#settings",
    icon: Settings2Icon,
  },
  {
    title: "Support",
    href: "/dashboard#support",
    icon: CircleHelpIcon,
  },
]

const currentUser = {
  name: "Operations Admin",
  email: "ops@highwood.local",
  initials: "OA",
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <ActivityIcon className="size-5!" />
                <span className="text-base font-semibold">Highwood</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={primaryNavItems} />
        <NavSecondary items={secondaryNavItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
