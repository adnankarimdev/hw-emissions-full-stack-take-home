"use client"

import type { ComponentProps } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ActivityIcon,
  GaugeIcon,
  MessageSquareIcon,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
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
  },
  {
    title: "Chat",
    href: "/chat",
    icon: MessageSquareIcon,
  },
]

const currentUser = {
  name: "Operations Admin",
  email: "ops@highwood.local",
  initials: "OA",
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const navItems = primaryNavItems.map((item) => ({
    ...item,
    isActive:
      item.href === "/dashboard"
        ? pathname === "/" || pathname.startsWith("/dashboard")
        : pathname.startsWith(item.href),
  }))

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
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
