"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { History } from "@/components/ps-types"
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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const bandSets = {
  AtCoder: [
    [0, 400],
    [400, 800],
    [800, 1200],
    [1200, 1600],
    [1600, 2000],
    [2000, Infinity],
  ],
  Codeforces: [
    [800, 1200],
    [1200, 1400],
    [1400, 1600],
    [1600, 1900],
    [1900, 2100],
    [2100, Infinity],
  ],
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
}: {
  history: History
  platform: "AtCoder" | "Codeforces"
}) {
  const [windowMode, setWindowMode] = React.useState<WindowMode>("20")
  const bands = bandSets[platform]
  const chartConfig = React.useMemo(
    () => Object.fromEntries(
      bands.map(([min, max], index) => [
        `band${index}`,
        { label: bandLabel(min, max), color: colors[index] },
      ])
    ) as ChartConfig,
    [bands]
  )
  const chartData = React.useMemo(() => {
    const sessions = history.sessions
      .filter((session) => session.type !== "practice")
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
  }, [history, bands, windowMode])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Frontier History</CardTitle>
        <CardDescription>
          {windowMode === "cumulative"
            ? "Cumulative full-contest solve coverage by difficulty"
            : `Solve coverage within the latest ${windowMode} full contests at each date`}
        </CardDescription>
        <CardAction>
          <ToggleGroup
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
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[360px] w-full">
          <LineChart
            key={windowMode}
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
                        <span className="text-muted-foreground">{bandLabel(...bands[index])}</span>
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
                type="monotone"
                stroke={`var(--color-band${index})`}
                strokeWidth={index >= 4 ? 2.5 : 2}
                strokeDasharray={index === 5 ? "5 5" : undefined}
                dot={false}
                connectNulls
                animationDuration={650 + index * 80}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
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
  const problems = history.sessions
    .filter((session) => session.type !== "practice")
    .flatMap((session) => session.problems)
  const bands = bandSets[platform]

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <FrontierHistory history={history} platform={platform} />
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {bands.map(([min, max]) => {
          const seen = problems.filter(
            (problem) =>
              (problem.difficulty ?? -1) >= min &&
              (problem.difficulty ?? -1) < max
          )
          const solved = seen.filter((problem) => problem.solved).length
          const rate = seen.length ? Math.round((solved / seen.length) * 100) : 0
          return (
            <Card key={min} className="@container/card">
              <CardHeader>
                <CardDescription>{bandLabel(min, max)}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {rate}%
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">{solved}/{seen.length}</Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-3 text-sm">
                <Progress value={rate} />
                <div className="text-muted-foreground">
                  Problems solved in full contests
                </div>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
