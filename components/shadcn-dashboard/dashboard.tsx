"use client"

import * as React from "react"
import type { History } from "@/components/ps-types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { ShadcnSectionId } from "@/components/shadcn-dashboard/shadcn-app-sidebar"
import { ShadcnChartAreaInteractive } from "@/components/shadcn-dashboard/shadcn-chart-area-interactive"
import { ShadcnDataTable } from "@/components/shadcn-dashboard/shadcn-data-table"
import { ShadcnSectionCards } from "@/components/shadcn-dashboard/shadcn-section-cards"
import { ShadcnSiteHeader } from "@/components/shadcn-dashboard/shadcn-site-header"
import { FrontierHistory, ShadcnFrontier } from "@/components/shadcn-dashboard/shadcn-frontier"
import { ShadcnProfileHeader } from "@/components/shadcn-dashboard/shadcn-profile-header"
import { ShadcnUpsolveQueue } from "@/components/shadcn-dashboard/shadcn-upsolve-queue"

const validSections = new Set<ShadcnSectionId>(["dashboard", "match-history", "upsolve", "growth", "frontier"])
const sections: Array<{ id: ShadcnSectionId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "match-history", label: "Match history" },
  { id: "upsolve", label: "Upsolve" },
  { id: "growth", label: "Growth" },
  { id: "frontier", label: "Frontier" },
]

export function ShadcnDashboard({ history, platform = "AtCoder", headerContent }: { history: History; platform?: "AtCoder" | "Codeforces"; headerContent?: React.ReactNode }) {
  const [activeSection, setActiveSection] = React.useState<ShadcnSectionId>("dashboard")

  React.useEffect(() => {
    const sync = () => {
      const section = window.location.hash.slice(1) as ShadcnSectionId
      if (validSections.has(section)) setActiveSection(section)
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  const navigate = (section: ShadcnSectionId) => {
    setActiveSection(section)
    window.history.pushState(null, "", `#${section}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ShadcnSiteHeader>{headerContent}</ShadcnSiteHeader>
        <main className="@container/main mx-auto flex w-full max-w-[1200px] flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <ShadcnProfileHeader history={history} platform={platform} />
            <Tabs
              value={activeSection}
              onValueChange={(value) => navigate(value as ShadcnSectionId)}
              className="w-full gap-6"
            >
              <div className="border-y px-4 lg:px-6">
                <TabsList
                  variant="line"
                  className="h-12 w-full justify-start overflow-x-auto"
                >
                  {sections.map((section) => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="flex-none px-4"
                    >
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {activeSection === "dashboard" && (
                <>
                  <ShadcnSectionCards history={history} />
                  <div className="grid gap-6 px-4 lg:px-6 @5xl/main:grid-cols-2">
                    <FrontierHistory history={history} platform={platform} />
                    <ShadcnChartAreaInteractive history={history} platform={platform} />
                  </div>
                  <ShadcnDataTable
                    data={history.sessions
                      .filter((session) => session.type !== "practice")
                      .slice(0, 10)}
                  />
                </>
              )}
              {activeSection === "match-history" && (
                <ShadcnDataTable
                  data={history.sessions.filter(
                    (session) => session.type !== "practice"
                  )}
                />
              )}
              {activeSection === "upsolve" && (
                <ShadcnUpsolveQueue history={history} platform={platform} />
              )}
              {activeSection === "growth" && (
                <div className="px-4 lg:px-6">
                  <ShadcnChartAreaInteractive history={history} platform={platform} />
                </div>
              )}
              {activeSection === "frontier" && (
                <ShadcnFrontier history={history} platform={platform} />
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
