"use client"

import * as React from "react"
import { cfBands, cfRatingColor } from "@/lib/codeforces-colors"
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

const bandSets = {
  AtCoder: [
    [0, 400],
    [400, 800],
    [800, 1200],
    [1200, 1600],
    [1600, 2000],
    [2000, Infinity],
  ],
  Codeforces: cfBands,
} as const

const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--foreground)",
]

type WindowMode = "10" | "20" | "50" | "cumulative"
type ContestScope = "all" | "actual" | "virtual"

const windows: Array<{ value: WindowMode; label: string; size: number | null }> = [
  { value: "10", label: "Rolling 10", size: 10 },
  { value: "20", label: "Rolling 20", size: 20 },
  { value: "50", label: "Rolling 50", size: 50 },
  { value: "cumulative", label: "Cumulative", size: null },
]

function bandLabel(min: number, max: number) {
  return `${min}–${max === Infinity ? "∞" : max - 1}`
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  }).format(new Date(value))
}

function fullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function FrontierHistory({
  history,
  platform,
  compact = false,
}: {
  history: History
  platform: "AtCoder" | "Codeforces"
  compact?: boolean
}) {
  const [windowMode, setWindowMode] = React.useState<WindowMode>("20")
  const [contestScope, setContestScope] = React.useState<ContestScope>("all")
  const chartRef = React.useRef<HTMLDivElement>(null)
  const bands = bandSets[platform]
  const actualCount = history.sessions.filter((session) => session.type === "actual").length
  const virtualCount = history.sessions.filter((session) => session.type === "virtual").length
  const chartConfig = React.useMemo(
    () => Object.fromEntries(
      bands.map(([min, max], index) => [
        `band${index}`,
        { label: bandLabel(min, max), color: platform === "Codeforces" ? cfRatingColor(min) : colors[index] },
      ])
    ) as ChartConfig,
    [bands, platform]
  )
  const chartData = React.useMemo(() => {
    const sessions = history.sessions
      .filter((session) =>
        session.type !== "practice" &&
        (contestScope === "all" || session.type === contestScope)
      )
      .toSorted(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      )
    const windowSize = windows.find((item) => item.value === windowMode)?.size
    return sessions.map((session, sessionIndex) => {
        const seen = Array<number>(bands.length).fill(0)
        const solved = Array<number>(bands.length).fill(0)
        const startIndex = windowSize == null
          ? 0
          : Math.max(0, sessionIndex - windowSize + 1)
        const activeSessions = sessions.slice(startIndex, sessionIndex + 1)
        for (const activeSession of activeSessions) {
          for (const problem of activeSession.problems) {
          if (problem.difficulty == null) continue
          const bandIndex = bands.findIndex(
            ([min, max]) => problem.difficulty! >= min && problem.difficulty! < max
          )
          if (bandIndex < 0) continue
          seen[bandIndex] += 1
          if (problem.solved) solved[bandIndex] += 1
          }
        }
        return {
          date: session.startAt,
          contest: session.contestId.toUpperCase(),
          ...Object.fromEntries(
            bands.flatMap((_, index) => [
              [`band${index}`, seen[index] ? Math.round((solved[index] / seen[index]) * 100) : null],
              [`band${index}Seen`, seen[index]],
              [`band${index}Solved`, solved[index]],
            ])
          ),
        }
      })
  }, [history, bands, windowMode, contestScope])

  const scopeLabel = contestScope === "all" ? "actual + virtual" : contestScope

  return (
    <Card className="@container/card" data-hover-actions>
      <CardHeader>
        <CardTitle>Solve coverage</CardTitle>
        <CardDescription>
          {windowMode === "cumulative"
            ? `Cumulative ${scopeLabel} contest solve coverage by difficulty`
            : `Solve coverage within the latest ${windowMode} ${scopeLabel} contests at each date`}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {!compact && <><ToggleGroup
            type="single"
            value={windowMode}
            onValueChange={(value) => value && setWindowMode(value as WindowMode)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {windows.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={windowMode} onValueChange={(value) => setWindowMode(value as WindowMode)}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {windows.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select></>}
          <ChartShareButton
            chartRef={chartRef}
            title="Solve coverage"
            description={`${history.user} · ${platform} · ${windows.find((item) => item.value === windowMode)?.label ?? "Rolling 20"} · ${scopeLabel}`}
            fileName={`${history.user}-${platform.toLowerCase()}-solve-coverage.png`}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!compact && <ToggleGroup
          type="single"
          value={contestScope}
          onValueChange={(value) => value && setContestScope(value as ContestScope)}
          variant="outline"
          className="w-fit"
          aria-label="Contest type"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="actual" disabled={!actualCount}>Actual</ToggleGroupItem>
          <ToggleGroupItem value="virtual" disabled={!virtualCount}>Virtual</ToggleGroupItem>
        </ToggleGroup>}
        {chartData.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No contests for this selection.</p>}
        <ChartContainer ref={chartRef} config={chartConfig} className={compact ? "aspect-auto h-[240px] w-full" : "aspect-auto h-[360px] w-full"}>
          <LineChart
            key={`${contestScope}-${windowMode}`}
            data={chartData}
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
              width={40}
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => fullDate(String(value))}
                  formatter={(value, name, item) => {
                    const index = Number(String(name).replace("band", ""))
                    const payload = item.payload as Record<string, number>
                    return (
                      <div className="flex w-full min-w-40 items-center justify-between gap-3">
                        <span className="text-muted-foreground">{bandLabel(bands[index][0], bands[index][1])}</span>
                        <span className="font-mono font-medium tabular-nums">
                          {String(value)}% · {payload[`band${index}Solved`]}/{payload[`band${index}Seen`]}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            {bands.map((_, index) => (
              <Line
                key={index}
                dataKey={`band${index}`}
                type="linear"
                stroke={`var(--color-band${index})`}
                strokeWidth={index >= 4 ? 2.5 : 2}
                strokeDasharray={platform === "AtCoder" && index === 5 ? "5 5" : undefined}
                dot={false}
                connectNulls={false}
                animationDuration={650 + index * 80}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
        {!compact && <p className="text-sm text-muted-foreground">Solved / problems appearing in the selected contests, including unattempted problems. This measures contest coverage, not a predicted chance of solving. Unrated problems are excluded.</p>}
      </CardContent>
    </Card>
  )
}

export function ShadcnFrontier({
  history,
  platform = "AtCoder",
}: {
  history: History
  platform?: "AtCoder" | "Codeforces"
}) {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <FrontierHistory history={history} platform={platform} />
    </div>
  )
}
