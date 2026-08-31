"use client"

import * as React from "react"
import type { History } from "@/components/ps-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

type Range = "7d" | "30d" | "90d" | "365d" | "all"
type DatedPoint = { date: string }

const ranges: Array<{ value: Range; label: string; days: number | null }> = [
  { value: "7d", label: "7D", days: 7 },
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
  { value: "365d", label: "1Y", days: 365 },
  { value: "all", label: "All", days: null },
]

const ratingConfig = {
  rating: { label: "Rating", color: "var(--chart-1)" },
  performance: { label: "Performance", color: "var(--chart-2)" },
} satisfies ChartConfig

const frontierConfig = {
  actualFrontier: { label: "Actual frontier", color: "var(--chart-1)" },
  virtualFrontier: { label: "Virtual frontier", color: "var(--chart-2)" },
} satisfies ChartConfig

const activityConfig = {
  actual: { label: "Actual", color: "var(--chart-1)" },
  virtual: { label: "Virtual", color: "var(--chart-2)" },
} satisfies ChartConfig

function shortDate(value: string) {
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function filterRange<T extends DatedPoint>(data: T[], range: Range) {
  const selected = ranges.find((item) => item.value === range)
  if (!selected?.days || data.length === 0) return data
  const latest = Math.max(...data.map((item) => new Date(item.date).getTime()))
  const cutoff = latest - selected.days * 86400000
  return data.filter((item) => new Date(item.date).getTime() >= cutoff)
}

function ratingSeries(history: History) {
  return [...(history.raw?.actualHistory ?? [])]
    .sort((a, b) => a.dateText.localeCompare(b.dateText))
    .map((item) => ({ date: item.dateText.slice(0, 10), contest: item.contestId.toUpperCase(), rating: item.newRating ?? null, performance: item.performance ?? null }))
}

function frontierSeries(history: History) {
  return history.sessions
    .filter((item) => item.type !== "practice")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((item) => ({
      date: item.startAt,
      contest: item.contestId.toUpperCase(),
      actualFrontier: item.type === "actual" ? item.metrics.highestSolvedDifficulty ?? null : null,
      virtualFrontier: item.type === "virtual" ? item.metrics.highestSolvedDifficulty ?? null : null,
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
      week: shortDate(new Date(start).toISOString()),
      actual: inWeek.filter((item) => item.type === "actual").length,
      virtual: inWeek.filter((item) => item.type === "virtual").length,
      solved: inWeek.reduce((sum, item) => sum + item.metrics.solved, 0),
    }
  })
}

function RangeSelector({ value, onChange }: { value: Range; onChange: (value: Range) => void }) {
  return (
    <ToggleGroup type="single" variant="outline" value={value} onValueChange={(next) => next && onChange(next as Range)} className="w-full justify-start">
      {ranges.map((item) => <ToggleGroupItem key={item.value} value={item.value} size="sm" className="flex-1 px-2">{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
  )
}

export function GrowthChart({ history }: { history: History }) {
  const [range, setRange] = React.useState<Range>("90d")
  const ratings = filterRange(ratingSeries(history), range)
  const frontier = filterRange(frontierSeries(history), range)
  const allRatings = ratingSeries(history)

  return (
    <Card className="mx-auto w-full max-w-6xl shadow-xs">
      <Tabs defaultValue="rated">
        <CardHeader>
          <CardTitle>Growth</CardTitle>
          <CardDescription>Rated history by date, with virtual sessions kept as a separate frontier view</CardDescription>
          <TabsList className="mt-2 grid w-full grid-cols-2">
            <TabsTrigger value="rated">Rated only</TabsTrigger>
            <TabsTrigger value="full">Actual + Virtual</TabsTrigger>
          </TabsList>
          <div className="mt-2"><RangeSelector value={range} onChange={setRange} /></div>
        </CardHeader>
        <CardContent>
          <TabsContent value="rated" className="mt-0">
            <ChartContainer config={ratingConfig} className="aspect-auto h-[420px] w-full">
              <AreaChart data={ratings} margin={{ left: 8, right: 16, top: 16 }}>
                <defs>
                  <linearGradient id="fillRating" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-rating)" stopOpacity={0.45} /><stop offset="95%" stopColor="var(--color-rating)" stopOpacity={0.04} /></linearGradient>
                  <linearGradient id="fillPerformance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-performance)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--color-performance)" stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} fontSize={11} tickFormatter={shortDate} />
                <YAxis width={42} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" labelFormatter={(value) => `${value}`} />} />
                <Area dataKey="performance" type="monotone" fill="url(#fillPerformance)" stroke="var(--color-performance)" strokeWidth={2} connectNulls />
                <Area dataKey="rating" type="monotone" fill="url(#fillRating)" stroke="var(--color-rating)" strokeWidth={2.5} connectNulls />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Current</p><p className="font-mono text-lg font-semibold">{allRatings.at(-1)?.rating ?? "—"}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Peak</p><p className="font-mono text-lg font-semibold">{Math.max(...allRatings.map((item) => item.rating ?? 0))}</p></div>
              <div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Best perf.</p><p className="font-mono text-lg font-semibold">{Math.max(...allRatings.map((item) => item.performance ?? 0))}</p></div>
            </div>
          </TabsContent>

          <TabsContent value="full" className="mt-0">
            <p className="mb-3 text-xs text-muted-foreground">Virtual contests do not change rating, so this view compares highest solved difficulty instead of estimating a virtual rating.</p>
            <ChartContainer config={frontierConfig} className="aspect-auto h-[420px] w-full">
              <LineChart data={frontier} margin={{ left: 8, right: 16, top: 16 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={30} fontSize={11} tickFormatter={shortDate} />
                <YAxis width={46} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" labelFormatter={(value) => shortDate(String(value))} />} />
                <Line dataKey="actualFrontier" type="monotone" stroke="var(--color-actualFrontier)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line dataKey="virtualFrontier" type="monotone" stroke="var(--color-virtualFrontier)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

export function TrainingLog({ history }: { history: History }) {
  const activity = activitySeries(history)

  return (
    <Card className="mx-auto w-full max-w-6xl shadow-xs">
      <CardHeader><CardTitle>Training log</CardTitle><CardDescription>Full-contest volume for the latest four weeks</CardDescription></CardHeader>
      <CardContent>
        <ChartContainer config={activityConfig} className="aspect-auto h-[420px] w-full">
          <BarChart data={activity} margin={{ left: 8, right: 16, top: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="actual" fill="var(--color-actual)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="virtual" fill="var(--color-virtual)" radius={[4, 4, 0, 0]} />
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {activity.map((item) => <div key={item.week} className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">week {item.week}</p><p className="font-mono text-lg font-semibold">{item.solved} AC</p></div>)}
        </div>
      </CardContent>
    </Card>
  )
}
