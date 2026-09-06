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
    year: "2-digit",
  }).format(date)
}

export function ShadcnChartAreaInteractive({
  history,
  platform = "AtCoder",
  compact = false,
}: {
  history: History
  platform?: "AtCoder" | "Codeforces"
  compact?: boolean
}) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all")
  const chartConfig = React.useMemo(() => {
    const colors = platform === "Codeforces"
      ? { rating: "var(--cf-chart-rating)", actualFrontier: "var(--cf-chart-actual)", virtualFrontier: "var(--cf-chart-virtual)" }
      : { rating: "var(--chart-1)", actualFrontier: "var(--chart-2)", virtualFrontier: "var(--chart-3)" }
    return {
      rating: { label: "Rating", color: colors.rating },
      actualFrontier: { label: "Actual top difficulty", color: colors.actualFrontier },
      virtualFrontier: { label: "Virtual top difficulty", color: colors.virtualFrontier },
    } satisfies ChartConfig
  }, [platform])

  const chartData = React.useMemo(() => {
    const ratings = new Map(
      (history.raw?.actualHistory ?? []).map((item) => [
        String(item.contestId).toLowerCase(),
        item.newRating ?? null,
      ])
    )
    return history.sessions
      .filter((session) => session.type !== "practice")
      .toSorted(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
      .reduce<Array<{
        date: string
        contest: string
        rating: number | null
        actualFrontier: number | null
        virtualFrontier: number | null
      }>>((items, session) => {
        const nextRating = session.type === "actual" ? ratings.get(String(session.contestId).toLowerCase()) : null
        const currentRating = nextRating ?? items.at(-1)?.rating ?? null

        return [...items, {
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
        }]
      }, [])
  }, [history])

  const filteredData = React.useMemo(() => {
    const selected = ranges.find((range) => range.value === timeRange)
    if (!selected?.days || chartData.length === 0) return chartData

    const latestDate = Math.max(...chartData.map((item) => new Date(item.date).getTime()))
    const cutoff = latestDate - selected.days * 86_400_000
    return chartData.filter(
      (item) => new Date(item.date).getTime() >= cutoff
    )
  }, [chartData, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
      <CardTitle>Rating & difficulty history</CardTitle>
      <CardDescription>
          Official rating with actual and virtual top difficulty
          {timeRange !== "all" && " · period ends today"}
        </CardDescription>
        {!compact && <CardAction>
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
        </CardAction>}
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No contests in this period. Select All time to see earlier records.</p>}
        <ChartContainer
          config={chartConfig}
          className={compact ? "aspect-auto h-[240px] w-full" : "aspect-auto h-[360px] w-full"}
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
              type="linear"
              stroke="var(--color-actualFrontier)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              animationDuration={800}
            />
            <Line
              dataKey="virtualFrontier"
              type="linear"
              stroke="var(--color-virtualFrontier)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
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
