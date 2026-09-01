"use client"

import * as React from "react"
import { IconExternalLink } from "@tabler/icons-react"
import type { History, UpsolveItem } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { buildUpsolveQueue } from "@/lib/upsolve"

type QueueStatus = "pending" | "completed"
type TimeRange = "latest" | "7d" | "30d" | "all"

const ranges: Array<{ value: TimeRange; label: string; days?: number }> = [
  { value: "latest", label: "Latest" },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "all", label: "All" },
]

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
})

function filterByRange(
  items: UpsolveItem[],
  range: TimeRange,
  latestSessionId?: string
) {
  if (range === "all") return items
  if (range === "latest") {
    return items.filter((item) => item.sourceSessionId === latestSessionId)
  }
  const days = ranges.find((item) => item.value === range)?.days ?? 0
  const cutoff = Date.now() - days * 86_400_000
  return items.filter(
    (item) => new Date(item.contestStartAt).getTime() >= cutoff
  )
}

export function ShadcnUpsolveQueue({
  history,
  platform,
}: {
  history: History
  platform: "AtCoder" | "Codeforces"
}) {
  const [status, setStatus] = React.useState<QueueStatus>("pending")
  const [range, setRange] = React.useState<TimeRange>("7d")
  const items = React.useMemo(
    () => history.upsolves ?? buildUpsolveQueue(history, platform),
    [history, platform]
  )
  const latestSessionId = history.sessions
    .filter((session) => session.type !== "practice")
    .toSorted((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .at(0)?.sessionId
  const pending = items.filter((item) => !item.completed).length
  const completed = items.filter((item) => item.completed).length
  const completionRate = items.length
    ? Math.round((completed / items.length) * 100)
    : 0
  const rows = filterByRange(
    items.filter((item) => item.completed === (status === "completed")),
    range,
    latestSessionId
  )

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Completion rate</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{completionRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as QueueStatus)}
        className="gap-4"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => value && setRange(value as TimeRange)}
            variant="outline"
            className="hidden sm:flex"
          >
            {ranges.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(value) => setRange(value as TimeRange)}>
            <SelectTrigger className="sm:hidden" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Contest</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>At contest</TableHead>
                <TableHead className="text-right">Difficulty</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="block font-medium">{item.contestId.toUpperCase()}</span>
                    <span className="block text-muted-foreground">
                      {dateFormatter.format(new Date(item.contestStartAt))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{item.problemIndex}</span>
                    {item.problemTitle && (
                      <span className="ml-2 text-muted-foreground">{item.problemTitle}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.attemptedInContest ? "destructive" : "outline"}>
                      {item.attemptedInContest ? "Unsolved" : "Not attempted"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.difficulty ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.completed ? "default" : "secondary"}>
                      {item.completed ? "Solved" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <a href={item.problemUrl} target="_blank" rel="noreferrer">
                        Open <IconExternalLink />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No problems in this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Tabs>
    </div>
  )
}
