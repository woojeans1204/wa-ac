"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconTargetArrow,
  IconTrophy,
} from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type ShadcnSectionId = "dashboard" | "match-history" | "growth" | "frontier"

export function ShadcnAppSidebar({ history, activeSection, onNavigate, ...props }: { history: History; activeSection: ShadcnSectionId; onNavigate: (section: ShadcnSectionId) => void } & React.ComponentProps<typeof Sidebar>) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const navMain: Array<{ id: ShadcnSectionId; title: string; url: string; icon: React.ReactNode }> = [
    { id: "dashboard", title: "Dashboard", url: "#dashboard", icon: <IconDashboard /> },
    { id: "match-history", title: "Match history", url: "#match-history", icon: <IconListDetails /> },
    { id: "growth", title: "Growth", url: "#growth", icon: <IconChartBar /> },
    { id: "frontier", title: "Frontier", url: "#frontier", icon: <IconTargetArrow /> },
  ]
  const navSecondary = [
    { title: "Settings", url: "#", icon: <IconSettings /> },
    { title: "Get Help", url: "#", icon: <IconHelp /> },
    { title: "Search", url: "#", icon: <IconSearch /> },
  ]
  const documents = [
    { name: "AtCoder", url: "#", icon: <IconTrophy /> },
    { name: "Contest reports", url: "#", icon: <IconReport /> },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <a href="#">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">PS Matchlog</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain.map((item) => ({ ...item, isActive: activeSection === item.id, onSelect: () => onNavigate(item.id) }))} />
        {mounted && <NavDocuments items={documents} />}
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {mounted && <NavUser user={{ name: history.user, email: `AtCoder · ${history.summary.actualSessions + history.summary.virtualSessions} contests`, avatar: "" }} />}
      </SidebarFooter>
    </Sidebar>
  )
}
