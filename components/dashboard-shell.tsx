"use client"

import * as React from "react"
import { GrowthChart, TrainingLog } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { ProblemExplorer } from "@/components/problem-explorer"
import type { History } from "@/components/ps-types"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { TrainingFrontier } from "@/components/training-frontier"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type SectionId = "match-history" | "problems" | "growth" | "training-log" | "frontier"

const validSections = new Set<SectionId>(["match-history", "problems", "growth", "training-log", "frontier"])

export function DashboardShell({ history }: { history: History }) {
  const [activeSection, setActiveSection] = React.useState<SectionId>("match-history")

  React.useEffect(() => {
    const syncFromHash = () => {
      const section = window.location.hash.slice(1) as SectionId
      if (validSections.has(section)) setActiveSection(section)
    }
    syncFromHash()
    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  const navigate = (section: SectionId) => {
    setActiveSection(section)
    window.history.pushState(null, "", `#${section}`)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-muted/35">
      <SiteHeader user={history.user} />
      <main className="@container/main mx-auto w-full max-w-[1440px] px-4 py-5 lg:px-6 lg:py-7">
        <SectionCards history={history} />

        <Tabs
          value={activeSection}
          onValueChange={(value) => navigate(value as SectionId)}
          className="mt-5 gap-0"
        >
          <div className="sticky top-14 z-20 overflow-x-auto border-y bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <TabsList variant="line" className="h-14 min-w-max gap-3 sm:gap-7">
              <TabsTrigger value="match-history" className="px-3 text-sm sm:px-5">Match history</TabsTrigger>
              <TabsTrigger value="problems" className="px-3 text-sm sm:px-5">Problems</TabsTrigger>
              <TabsTrigger value="growth" className="px-3 text-sm sm:px-5">Growth</TabsTrigger>
              <TabsTrigger value="training-log" className="px-3 text-sm sm:px-5">Training log</TabsTrigger>
              <TabsTrigger value="frontier" className="px-3 text-sm sm:px-5">Frontier</TabsTrigger>
            </TabsList>
          </div>

          <div className="pt-5">
            <TabsContent value="match-history" className="m-0" aria-label="Match history">
              <DataTable data={history.sessions} />
            </TabsContent>
            <TabsContent value="problems" className="m-0">
              <ProblemExplorer history={history} />
            </TabsContent>
            <TabsContent value="growth" className="m-0">
              <GrowthChart history={history} />
            </TabsContent>
            <TabsContent value="training-log" className="m-0">
              <TrainingLog history={history} />
            </TabsContent>
            <TabsContent value="frontier" className="m-0">
              <TrainingFrontier history={history} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}
