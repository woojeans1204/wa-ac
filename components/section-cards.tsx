"use client"

import type { History } from "@/components/ps-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

function profileMetrics(history: History) {
  const rated = (history.raw?.actualHistory ?? []).filter((item) => item.newRating != null)
  const performance = (history.raw?.actualHistory ?? []).filter((item) => item.performance != null)
  const current = rated.at(-1)?.newRating ?? 0
  const peak = Math.max(current, ...rated.map((item) => item.newRating ?? 0))
  const recent = history.sessions.filter((item) => item.type !== "practice").slice(0, 4)
  const solved = recent.reduce((sum, item) => sum + item.metrics.solved, 0)
  const contestCount = history.summary.actualSessions + history.summary.virtualSessions
  const virtualShare = contestCount ? Math.round((history.summary.virtualSessions / contestCount) * 100) : 0
  return { current, peak, latestPerformance: performance.at(-1)?.performance ?? 0, solved, virtualShare }
}

export function SectionCards({ history }: { history: History }) {
  const metrics = profileMetrics(history)

  return (
    <Card className="overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-blue-50/60 py-0 shadow-xs dark:to-blue-950/20">
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(320px,1.15fr)_minmax(520px,1fr)] lg:items-center lg:p-8">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Avatar className="size-16 shrink-0 rounded-xl border shadow-sm sm:size-20">
            <AvatarFallback className="rounded-xl bg-slate-900 text-xl font-semibold text-white">SP</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Competitive programming profile
              <Badge variant="outline" className="rounded-md bg-background">AtCoder</Badge>
            </div>
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{history.user}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span><strong className="font-mono text-lg text-foreground">{metrics.current}</strong> rating</span>
              <span><strong className="font-mono text-lg text-foreground">{metrics.peak}</strong> peak</span>
              <span><strong className="font-mono text-lg text-foreground">{metrics.latestPerformance}</strong> recent perf.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-background/80 sm:grid-cols-4">
          <ProfileStat label="Rated" value={history.summary.actualSessions} />
          <ProfileStat label="Virtual" value={history.summary.virtualSessions} />
          <ProfileStat label="Recent solved" value={metrics.solved} />
          <ProfileStat label="Virtual share" value={`${metrics.virtualShare}%`} />
        </div>
      </CardContent>
      <div className="border-t bg-muted/25 px-5 py-3 text-xs text-muted-foreground sm:px-6 lg:px-8">
        {history.summary.submissions} submissions imported · practice sessions excluded from full-contest views
      </div>
    </Card>
  )
}

function ProfileStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-b p-4 last:border-b-0 even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
