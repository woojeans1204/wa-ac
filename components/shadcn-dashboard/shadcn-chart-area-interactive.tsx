"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { History } from "@/components/ps-types"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const chartConfig = {
  rating: { label: "Rating", color: "var(--chart-1)" },
  actualFrontier: {
    label: "Actual top difficulty",
    color: "var(--chart-2)",
  },
  virtualFrontier: {
    label: "Virtual top difficulty",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

type TimeRange = "90d" | "365d" | "all"

const ranges: Array<{ value: TimeRange; label: string; days: number | null }> = [
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last year", days: 365 },
  { value: "all", label: "All time", days: null },
]

function shortDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function ShadcnChartAreaInteractive({
  history,
}: {
  history: History
  platform?: "AtCoder" | "Codeforces"
}) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d")

  const chartData = React.useMemo(() => {
    const ratings = new Map(
      (history.raw?.actualHistory ?? []).map((item) => [
        String(item.contestId).toLowerCase(),
        item.newRating ?? null,
      ])
    )
    let currentRating: number | null = null

    return history.sessions
      .filter((session) => session.type !== "practice")
      .toSorted(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
      .map((session) => {
        const nextRating = ratings.get(String(session.contestId).toLowerCase())
        if (nextRating != null) currentRating = nextRating

        return {
          date: session.startAt,
          contest: session.contestTitle ?? session.contestId.toUpperCase(),
          rating: currentRating,
          actualFrontier:
            session.type === "actual"
              ? session.metrics.highestSolvedDifficulty ?? null
              : null,
          virtualFrontier:
            session.type === "virtual"
              ? session.metrics.highestSolvedDifficulty ?? null
              : null,
        }
      })
  }, [history])

  const filteredData = React.useMemo(() => {
    const selected = ranges.find((range) => range.value === timeRange)
    if (!selected?.days || chartData.length === 0) return chartData

    const latest = new Date(chartData.at(-1)!.date).getTime()
    const cutoff = latest - selected.days * 86_400_000
    return chartData.filter(
      (item) => new Date(item.date).getTime() >= cutoff
    )
  }, [chartData, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Growth History</CardTitle>
        <CardDescription>
          Rating and full-contest difficulty frontier over time
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value as TimeRange)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {ranges.map((range) => (
              <ToggleGroupItem key={range.value} value={range.value}>
                {range.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRange)}
          >
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
              aria-label="Select growth period"
            >
              <SelectValue placeholder="Last 90 days" />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[360px] w-full"
        >
          <LineChart
            key={timeRange}
            data={filteredData}
            margin={{ left: 8, right: 16, top: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={shortDate}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, "auto"]}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => shortDate(String(value))}
                />
              }
            />
            <Line
              dataKey="rating"
              type="monotone"
              stroke="var(--color-rating)"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              animationDuration={700}
            />
            <Line
              dataKey="actualFrontier"
              type="monotone"
              stroke="var(--color-actualFrontier)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              animationDuration={800}
            />
            <Line
              dataKey="virtualFrontier"
              type="monotone"
              stroke="var(--color-virtualFrontier)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              connectNulls
              animationDuration={900}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
