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
import { ChartShareButton } from "@/components/shadcn-dashboard/chart-share-button"

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
  const chartRef = React.useRef<HTMLDivElement>(null)
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
    <Card className="@container/card" data-hover-actions>
      <CardHeader className={compact ? "flex flex-col gap-3" : "flex min-h-36 flex-col gap-3"}>
      <CardTitle>Rating & difficulty history</CardTitle>
      <CardDescription>
          Official rating with actual and virtual top difficulty
          {timeRange !== "all" && " · relative to latest contest"}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {!compact && <><ToggleGroup
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
          </Select></>}
          <ChartShareButton
            chartRef={chartRef}
            title="Rating & difficulty history"
            description={`${history.user} · ${platform} · ${ranges.find((range) => range.value === timeRange)?.label ?? "All time"}`}
            fileName={`${history.user}-${platform.toLowerCase()}-rating-history.png`}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No contests in this period. Select All time to see earlier records.</p> : <ChartContainer
          ref={chartRef}
          config={chartConfig}
          className={compact ? "aspect-auto h-[280px] w-full" : "aspect-auto h-[360px] w-full"}
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
              dot={filteredData.filter((item) => item.rating != null).length === 1 ? { r: 3, fill: "var(--color-rating)", strokeWidth: 0 } : false}
              connectNulls
              animationDuration={700}
            />
            <Line
              dataKey="actualFrontier"
              type="linear"
              stroke="var(--color-actualFrontier)"
              strokeWidth={1.5}
              dot={filteredData.filter((item) => item.actualFrontier != null).length === 1 ? { r: 3, fill: "var(--color-actualFrontier)", strokeWidth: 0 } : false}
              activeDot={{ r: 4 }}
              connectNulls
              animationDuration={800}
            />
            <Line
              dataKey="virtualFrontier"
              type="linear"
              stroke="var(--color-virtualFrontier)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={filteredData.filter((item) => item.virtualFrontier != null).length === 1 ? { r: 3, fill: "var(--color-virtualFrontier)", strokeWidth: 0 } : false}
              activeDot={{ r: 4 }}
              connectNulls
              animationDuration={900}
            />
            <ChartLegend
              height={compact ? 60 : 48}
              content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-2 [&>div]:whitespace-nowrap" />}
            />
          </LineChart>
        </ChartContainer>}
      </CardContent>
    </Card>
  )
}
