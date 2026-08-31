"use client"

import type { History } from "@/components/ps-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

const ratingConfig = {
  rating: { label: "Rating", color: "var(--chart-1)" },
  performance: { label: "Performance", color: "var(--chart-2)" },
} satisfies ChartConfig

const activityConfig = {
  actual: { label: "Actual", color: "var(--chart-1)" },
  virtual: { label: "Virtual", color: "var(--chart-2)" },
} satisfies ChartConfig

function ratingSeries(history: History) {
  return (history.raw?.actualHistory ?? []).map((item) => ({
    contest: item.contestId.toUpperCase(),
    rating: item.newRating ?? null,
    performance: item.performance ?? null,
  }))
}

function activitySeries(history: History) {
  const contestSessions = history.sessions.filter((item) => item.type !== "practice")
  const latest = Math.max(...contestSessions.map((item) => new Date(item.startAt).getTime()))
  return Array.from({ length: 4 }, (_, index) => {
    const end = latest - (3 - index) * 7 * 86400000
    const start = end - 7 * 86400000
    const inWeek = contestSessions.filter((item) => {
      const time = new Date(item.startAt).getTime()
      return time > start && time <= end
    })
    return {
      week: `${new Date(start).getMonth() + 1}/${new Date(start).getDate()}`,
      actual: inWeek.filter((item) => item.type === "actual").length,
      virtual: inWeek.filter((item) => item.type === "virtual").length,
      solved: inWeek.reduce((sum, item) => sum + item.metrics.solved, 0),
    }
  })
}

export function ChartAreaInteractive({ history }: { history: History }) {
  const ratings = ratingSeries(history)
  const activity = activitySeries(history)

  return (
    <Card className="min-w-0 shadow-xs">
      <Tabs defaultValue="rating">
        <CardHeader>
          <CardTitle>Growth</CardTitle>
          <CardDescription>Codeforces-style rating history and Strava-style training volume</CardDescription>
          <TabsList className="mt-2 grid w-full grid-cols-2">
            <TabsTrigger value="rating">Rating</TabsTrigger>
            <TabsTrigger value="activity">Last 4 weeks</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="rating" className="mt-0">
            <ChartContainer config={ratingConfig} className="aspect-auto h-[290px] w-full">
              <AreaChart data={ratings} margin={{ left: 2, right: 8, top: 12 }}>
                <defs>
                  <linearGradient id="fillRating" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-rating)" stopOpacity={0.45} /><stop offset="95%" stopColor="var(--color-rating)" stopOpacity={0.04} /></linearGradient>
                  <linearGradient id="fillPerformance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-performance)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--color-performance)" stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="contest" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis width={38} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area dataKey="performance" type="monotone" fill="url(#fillPerformance)" stroke="var(--color-performance)" strokeWidth={2} connectNulls />
                <Area dataKey="rating" type="monotone" fill="url(#fillRating)" stroke="var(--color-rating)" strokeWidth={2.5} connectNulls />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Current</p><p className="font-mono font-semibold">{ratings.at(-1)?.rating ?? "—"}</p></div>
              <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Peak</p><p className="font-mono font-semibold">{Math.max(...ratings.map((item) => item.rating ?? 0))}</p></div>
              <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Best perf.</p><p className="font-mono font-semibold">{Math.max(...ratings.map((item) => item.performance ?? 0))}</p></div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <ChartContainer config={activityConfig} className="aspect-auto h-[290px] w-full">
              <BarChart data={activity} margin={{ left: 2, right: 8, top: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="virtual" fill="var(--color-virtual)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {activity.map((item) => <div key={item.week} className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">week {item.week}</p><p className="font-mono font-semibold">{item.solved} AC</p></div>)}
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
