"use client"

import type { History } from "@/components/ps-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityIcon, FlagIcon, TrendingUpIcon, TrophyIcon } from "lucide-react"

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
    <div className="grid gap-4 @3xl/main:grid-cols-2 @7xl/main:grid-cols-4">
      <Card className="@container/card @3xl/main:col-span-2 bg-gradient-to-br from-card to-blue-50/70 shadow-xs">
        <CardHeader className="grid grid-cols-[auto_1fr] items-center gap-x-4">
          <Avatar className="row-span-3 size-14 rounded-lg border">
            <AvatarFallback className="rounded-lg bg-slate-900 text-base font-semibold text-white">SP</AvatarFallback>
          </Avatar>
          <CardDescription className="flex items-center gap-2">Competitive programming profile <Badge variant="outline" className="rounded-md bg-background">AtCoder</Badge></CardDescription>
          <CardTitle className="truncate text-2xl font-semibold tracking-tight">{history.user}</CardTitle>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span><strong className="font-mono text-foreground">{metrics.current}</strong> rating</span>
            <span><strong className="font-mono text-foreground">{metrics.peak}</strong> peak</span>
            <span><strong className="font-mono text-foreground">{metrics.latestPerformance}</strong> recent perf.</span>
          </div>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{history.summary.actualSessions} rated contests</span><span>{history.summary.virtualSessions} virtual contests</span><span>{history.summary.submissions} submissions imported</span>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
        <CardHeader>
          <CardDescription>Recent 4 contests</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">{metrics.solved} solved</CardTitle>
          <CardAction><Badge variant="outline"><ActivityIcon /> Active</Badge></CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex items-center gap-2 font-medium">Current training volume <TrendingUpIcon className="size-4" /></div>
          <div className="text-muted-foreground">Actual + virtual sessions</div>
        </CardFooter>
      </Card>

      <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
        <CardHeader>
          <CardDescription>Training mix</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">{metrics.virtualShare}% virtual</CardTitle>
          <CardAction><Badge variant="outline"><FlagIcon /> {history.summary.actualSessions} actual</Badge></CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="flex items-center gap-2 font-medium">Contest repetition first <TrophyIcon className="size-4" /></div>
          <div className="text-muted-foreground">Practice sessions excluded</div>
        </CardFooter>
      </Card>
    </div>
  )
}
