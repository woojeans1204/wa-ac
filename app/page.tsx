import type { Metadata } from "next"
import history from "./data/history.json"
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import type { History } from "@/components/ps-types"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: "SSS_PrizeHunter · PS Matchlog",
  description: "Competitive programming match history and training frontier.",
};

export default function Home() {
  const data = history as History

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 62)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties
      }
    >
      <AppSidebar history={data} variant="inset" />
      <SidebarInset>
        <SiteHeader user={data.user} />
        <main className="@container/main flex flex-1 flex-col gap-5 bg-muted/35 p-4 lg:p-6">
          <SectionCards history={data} />
          <div className="grid gap-5 @5xl/main:grid-cols-[minmax(0,1.65fr)_minmax(340px,.85fr)]">
            <DataTable data={data.sessions} />
            <ChartAreaInteractive history={data} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
