"use client"

import type * as React from "react"
import type { History } from "@/components/ps-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { ActivityIcon, ChartNoAxesCombinedIcon, Code2Icon, CrosshairIcon, HistoryIcon, TrophyIcon } from "lucide-react"

const nav = [
  { id: "match-history", title: "Match history", icon: HistoryIcon },
  { id: "growth", title: "Growth", icon: ChartNoAxesCombinedIcon },
  { id: "training-log", title: "Training log", icon: ActivityIcon },
  { id: "frontier", title: "Frontier", icon: CrosshairIcon },
] as const

export type SectionId = (typeof nav)[number]["id"]

export function AppSidebar({ history, activeSection, onNavigate, ...props }: React.ComponentProps<typeof Sidebar> & { history: History; activeSection: SectionId; onNavigate: (section: SectionId) => void }) {
  const rated = (history.raw?.actualHistory ?? []).filter((item) => item.newRating != null)
  const rating = rated.at(-1)?.newRating ?? 0
  const fullContests = history.summary.actualSessions + history.summary.virtualSessions

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" onClick={() => onNavigate("match-history")}><span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Code2Icon className="size-4" /></span><span className="grid flex-1 text-left"><span className="font-semibold">PS Matchlog</span><span className="text-xs text-muted-foreground">Contest intelligence</span></span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Player</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{nav.map((item) => <SidebarMenuItem key={item.title}><SidebarMenuButton isActive={activeSection === item.id} onClick={() => onNavigate(item.id)}><item.icon /><span>{item.title}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Platforms</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={() => onNavigate("match-history")}><TrophyIcon /><span>AtCoder</span><Badge variant="outline" className="ml-auto">{fullContests}</Badge></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-emerald-600 text-white">SP</AvatarFallback></Avatar><span className="grid flex-1 text-left"><span className="truncate text-sm font-medium">{history.user}</span><span className="truncate font-mono text-xs text-muted-foreground">rating {rating}</span></span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
