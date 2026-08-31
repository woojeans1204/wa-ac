"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import type { History } from "@/components/ps-types"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const chartConfig = {
  rating: { label: "Rating", color: "var(--chart-1)" },
  performance: { label: "Actual performance", color: "var(--chart-2)" },
  virtual: { label: "Virtual top difficulty", color: "var(--chart-3)" },
} satisfies ChartConfig

type TimeRange = "90d" | "365d" | "all"

const ranges: Array<{ value: TimeRange; label: string; days: number | null }> = [
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last year", days: 365 },
  { value: "all", label: "All time", days: null },
]

export function ShadcnChartAreaInteractive({ history }: { history: History }) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d")

  const chartData = React.useMemo(() => {
    const actual = (history.raw?.actualHistory ?? []).map((item) => ({
      date: item.dateText.slice(0, 10),
      rating: item.newRating ?? null,
      performance: item.performance ?? null,
      virtual: null as number | null,
    }))
    const virtual = history.sessions
      .filter((session) => session.type === "virtual")
      .map((session) => ({
        date: session.startAt.slice(0, 10),
        rating: null as number | null,
        performance: null as number | null,
        virtual: session.metrics.highestSolvedDifficulty ?? null,
      }))

    return [...actual, ...virtual].sort((a, b) => a.date.localeCompare(b.date))
  }, [history])
  const referenceDate = chartData.length ? new Date(chartData.at(-1)!.date) : new Date()
  const filteredData = chartData.filter((item) => {
    const days = ranges.find((range) => range.value === timeRange)?.days
    if (days == null) return true
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - days)
    return new Date(item.date) >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Rating History</CardTitle>
        <CardDescription><span className="hidden @[540px]/card:block">Actual rating and performance with virtual contest frontier</span><span className="@[540px]/card:hidden">Actual + virtual contests</span></CardDescription>
        <CardAction>
          <ToggleGroup type="single" value={timeRange} onValueChange={(value) => value && setTimeRange(value)} variant="outline" className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex">
            {ranges.map((range) => <ToggleGroupItem key={range.value} value={range.value}>{range.label}</ToggleGroupItem>)}
          </ToggleGroup>
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <SelectTrigger className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" size="sm" aria-label="Select a value"><SelectValue placeholder="Last 90 days" /></SelectTrigger>
            <SelectContent className="rounded-xl">{ranges.map((range) => <SelectItem key={range.value} value={range.value} className="rounded-lg">{range.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs><linearGradient id="fillRating" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-rating)" stopOpacity={0.8} /><stop offset="95%" stopColor="var(--color-rating)" stopOpacity={0.1} /></linearGradient><linearGradient id="fillPerformance" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-performance)" stopOpacity={0.6} /><stop offset="95%" stopColor="var(--color-performance)" stopOpacity={0.1} /></linearGradient><linearGradient id="fillVirtual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-virtual)" stopOpacity={0.5} /><stop offset="95%" stopColor="var(--color-virtual)" stopOpacity={0.08} /></linearGradient></defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} indicator="dot" />} />
            <Area dataKey="virtual" type="natural" fill="url(#fillVirtual)" stroke="var(--color-virtual)" connectNulls />
            <Area dataKey="performance" type="natural" fill="url(#fillPerformance)" stroke="var(--color-performance)" connectNulls />
            <Area dataKey="rating" type="natural" fill="url(#fillRating)" stroke="var(--color-rating)" connectNulls />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
