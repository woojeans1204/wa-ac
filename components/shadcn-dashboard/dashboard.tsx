"use client"

import * as React from "react"
import type { History } from "@/components/ps-types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ShadcnChartAreaInteractive } from "@/components/shadcn-dashboard/shadcn-chart-area-interactive"
import { ShadcnDataTable } from "@/components/shadcn-dashboard/shadcn-data-table"
import { Button } from "@/components/ui/button"
import { ShadcnSiteHeader } from "@/components/shadcn-dashboard/shadcn-site-header"
import { FrontierHistory } from "@/components/shadcn-dashboard/shadcn-frontier"
import { ShadcnProfileHeader } from "@/components/shadcn-dashboard/shadcn-profile-header"
import { ShadcnUpsolveQueue } from "@/components/shadcn-dashboard/shadcn-upsolve-queue"
import { trackEvent } from "@/lib/analytics"

type ShadcnSectionId = "dashboard" | "match-history" | "upsolve" | "growth"

const validSections = new Set<ShadcnSectionId>(["dashboard", "match-history", "upsolve", "growth"])
const sections: Array<{ id: ShadcnSectionId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "match-history", label: "Match history" },
  { id: "upsolve", label: "Upsolve" },
  { id: "growth", label: "Growth" },
]

export function ShadcnDashboard({ history, platform = "AtCoder", headerContent, error }: { history: History; platform?: "AtCoder" | "Codeforces"; headerContent?: React.ReactNode; error?: string }) {
  const [activeSection, setActiveSection] = React.useState<ShadcnSectionId>("dashboard")

  React.useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1)
      const section = (hash === "frontier" ? "growth" : hash) as ShadcnSectionId
      if (hash === "frontier") window.history.replaceState(null, "", "#growth")
      setActiveSection(validSections.has(section) ? section : "dashboard")
    }
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
    }
  }, [])

  const navigate = (section: ShadcnSectionId) => {
    setActiveSection(section)
    window.history.pushState(null, "", `#${section}`)
    trackEvent("tab_view", { section, platform })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <ShadcnSiteHeader>{headerContent}</ShadcnSiteHeader>
        <main className="@container/main mx-auto flex w-full max-w-[1200px] flex-col px-2 md:px-3 lg:px-4">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <ShadcnProfileHeader history={history} platform={platform} />
            {error && <p role="alert" className="px-4 text-sm text-destructive lg:px-6">{error}</p>}
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
                      className="min-w-0 flex-1 px-1 text-sm sm:flex-none sm:px-4 sm:text-[15px]"
                    >
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {activeSection === "dashboard" && (
                <>
                  <div className="flex items-center justify-between px-4 lg:px-6">
                    <h2 className="font-semibold">Recent contests</h2>
                    <Button variant="ghost" size="sm" onClick={() => navigate("match-history")}>View all contests</Button>
                  </div>
                  <ShadcnDataTable
                    key={`${platform}:${history.user}:recent`}
                    data={history.sessions
                      .filter((session) => session.type !== "practice")
                      .toSorted((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))
                      .slice(0, 5)}
                    platform={platform}
                  />
                  <div className="grid gap-6 px-4 lg:px-6 @5xl/main:grid-cols-2">
                    <FrontierHistory history={history} platform={platform} compact />
                    <ShadcnChartAreaInteractive history={history} platform={platform} compact />
                  </div>
                </>
              )}
              {activeSection === "match-history" && (
                <div className="w-full">
                  <ShadcnDataTable
                    key={`${platform}:${history.user}:history`}
                    data={history.sessions.filter(
                      (session) => session.type !== "practice"
                    )}
                    platform={platform}
                    showRowsPerPage
                  />
                </div>
              )}
              {activeSection === "upsolve" && (
                <ShadcnUpsolveQueue history={history} platform={platform} />
              )}
              {activeSection === "growth" && (
                <div className="grid gap-6 px-4 lg:px-6">
                  <ShadcnChartAreaInteractive history={history} platform={platform} />
                  <FrontierHistory history={history} platform={platform} />
                </div>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
