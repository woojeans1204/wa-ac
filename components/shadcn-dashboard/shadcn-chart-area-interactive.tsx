"use client"

import * as React from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts"
import type { History, Session } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
  previous: { label: "Period start", color: "var(--chart-2)" },
  current: { label: "Now", color: "var(--chart-1)" },
} satisfies ChartConfig

const bands = [
  { label: "0–399", min: 0, max: 400 },
  { label: "400–799", min: 400, max: 800 },
  { label: "800–1199", min: 800, max: 1200 },
  { label: "1200–1599", min: 1200, max: 1600 },
  { label: "1600–1999", min: 1600, max: 2000 },
  { label: "2000+", min: 2000, max: Infinity },
] as const

type TimeRange = "90d" | "365d" | "all"

const ranges: Array<{ value: TimeRange; label: string; days: number | null }> = [
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last year", days: 365 },
  { value: "all", label: "All time", days: null },
]

function frontierSnapshot(sessions: Session[]) {
  const problems = sessions.flatMap((session) => session.problems)
  return bands.map((band) => {
    const seen = problems.filter((problem) => {
      const difficulty = problem.difficulty ?? -1
      return difficulty >= band.min && difficulty < band.max
    })
    const solved = seen.filter((problem) => problem.solved).length
    return seen.length ? Math.round((solved / seen.length) * 100) : 0
  })
}

export function ShadcnChartAreaInteractive({ history }: { history: History }) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d")

  const { chartData, biggestGain } = React.useMemo(() => {
    const sessions = history.sessions
      .filter((session) => session.type !== "practice")
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
    const latest = sessions.length
      ? new Date(sessions.at(-1)!.startAt).getTime()
      : Date.now()
    const days = ranges.find((range) => range.value === timeRange)?.days
    const cutoff = days == null ? -Infinity : latest - days * 86_400_000
    const previousSessions = sessions.filter(
      (session) => new Date(session.startAt).getTime() < cutoff
    )
    const current = frontierSnapshot(sessions)
    const previous = frontierSnapshot(previousSessions)
    const data = bands.map((band, index) => ({
      band: band.label,
      current: current[index],
      previous: previous[index],
      gain: current[index] - previous[index],
    }))
    const gain = [...data].sort((a, b) => b.gain - a.gain)[0]
    return { chartData: data, biggestGain: gain }
  }, [history, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Growth Frontier</CardTitle>
        <CardDescription>
          Actual and virtual full-contest solve coverage by difficulty
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
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[420px] max-h-[55vh] w-full">
          <RadarChart key={timeRange} data={chartData} outerRadius="72%">
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis dataKey="band" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="previous"
              fill="var(--color-previous)"
              fillOpacity={0.15}
              stroke="var(--color-previous)"
              strokeDasharray="4 4"
              animationDuration={700}
            />
            <Radar
              dataKey="current"
              fill="var(--color-current)"
              fillOpacity={0.35}
              stroke="var(--color-current)"
              animationDuration={900}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="justify-between gap-2 text-sm">
        <span className="text-muted-foreground">Coverage change over the selected period</span>
        {biggestGain && (
          <Badge variant="outline">
            Best gain: {biggestGain.band} {biggestGain.gain >= 0 ? "+" : ""}{biggestGain.gain}p
          </Badge>
        )}
      </CardFooter>
    </Card>
  )
}
