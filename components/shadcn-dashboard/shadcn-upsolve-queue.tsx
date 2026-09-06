"use client"

import * as React from "react"
import { cfRatingColor } from "@/lib/codeforces-colors"
import { IconAdjustmentsHorizontal, IconExternalLink } from "@tabler/icons-react"
import type { History, UpsolveItem } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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

type QueueStatus = "all" | "pending" | "completed"
type TimeRange = "latest" | "7d" | "30d" | "all"
type SortOrder = "latest" | "oldest" | "index-asc" | "index-desc" | "attempted"

const CONTESTS_PER_LOAD = 10

const ranges: Array<{ value: TimeRange; label: string; days?: number }> = [
  { value: "latest", label: "Latest contest" },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "all", label: "All" },
]

const indexCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

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

function problemIndex(index: string) {
  return index.trim().toUpperCase()
}

function problemIndexGroup(index: string) {
  return problemIndex(index).replace(/\d+$/, "")
}

export function ShadcnUpsolveQueue({
  history,
  platform,
}: {
  history: History
  platform: "AtCoder" | "Codeforces"
}) {
  const [status, setStatus] = React.useState<QueueStatus>("pending")
  const [range, setRange] = React.useState<TimeRange>("latest")
  const [minimumIndex, setMinimumIndex] = React.useState("any")
  const [maximumIndex, setMaximumIndex] = React.useState("any")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("latest")
  const [visibleContestCount, setVisibleContestCount] = React.useState(CONTESTS_PER_LOAD)
  const items = React.useMemo(
    () => history.upsolves ?? buildUpsolveQueue(history, platform),
    [history, platform]
  )
  const problemIndexes = React.useMemo(
    () => [...new Set(items.map((item) => problemIndexGroup(item.problemIndex)))]
      .toSorted(indexCollator.compare),
    [items]
  )
  const latestSessionId = history.sessions
    .filter((session) => session.type !== "practice")
    .toSorted((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    .at(0)?.sessionId
  const eligible = filterByRange(items, range, latestSessionId)
    .filter((item) => {
      const index = problemIndexGroup(item.problemIndex)
      const minimumMatches = minimumIndex === "any" || indexCollator.compare(index, minimumIndex) >= 0
      const maximumMatches = maximumIndex === "any" || indexCollator.compare(index, maximumIndex) <= 0
      return minimumMatches && maximumMatches
    })
  const pending = eligible.filter((item) => !item.completed).length
  const completed = eligible.filter((item) => item.completed).length
  const rows = eligible
    .filter((item) => status === "all" || item.completed === (status === "completed"))
    .toSorted((a, b) => {
      if (sortOrder === "attempted") {
        return Number(b.attemptedInContest) - Number(a.attemptedInContest)
          || indexCollator.compare(a.problemIndex, b.problemIndex)
      }
      if (sortOrder === "index-asc") {
        return indexCollator.compare(problemIndex(a.problemIndex), problemIndex(b.problemIndex))
          || new Date(b.contestStartAt).getTime() - new Date(a.contestStartAt).getTime()
      }
      if (sortOrder === "index-desc") {
        return indexCollator.compare(problemIndex(b.problemIndex), problemIndex(a.problemIndex))
          || new Date(b.contestStartAt).getTime() - new Date(a.contestStartAt).getTime()
      }
      if (sortOrder === "oldest") {
        return new Date(a.contestStartAt).getTime() - new Date(b.contestStartAt).getTime()
      }
      return new Date(b.contestStartAt).getTime() - new Date(a.contestStartAt).getTime()
    })

  const groups = [...Map.groupBy(rows, (item) => item.sourceSessionId).values()]
    .toSorted((a, b) => {
      const dateOrder = Date.parse(b[0].contestStartAt) - Date.parse(a[0].contestStartAt)
      return sortOrder === "oldest" ? -dateOrder : dateOrder
    })
  const visibleGroups = groups.slice(0, visibleContestCount)

  const resetVisibleContests = () => setVisibleContestCount(CONTESTS_PER_LOAD)

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <Tabs
        value={status}
        onValueChange={(value) => {
          setStatus(value as QueueStatus)
          resetVisibleContests()
        }}
        className="gap-4"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <TabsList>
            <TabsTrigger value="pending">Pending <Badge variant="secondary">{pending}</Badge></TabsTrigger>
            <TabsTrigger value="completed">Completed <Badge variant="secondary">{completed}</Badge></TabsTrigger>
            <TabsTrigger value="all">All <Badge variant="secondary">{eligible.length}</Badge></TabsTrigger>
          </TabsList>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => {
              if (!value) return
              setRange(value as TimeRange)
              resetVisibleContests()
            }}
            variant="outline"
            className="hidden sm:flex"
          >
            {ranges.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={range} onValueChange={(value) => {
            setRange(value as TimeRange)
            resetVisibleContests()
          }}>
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

        <Collapsible defaultOpen className="w-full overflow-hidden rounded-lg border bg-muted/20">
          <div className="flex flex-wrap items-center gap-2 p-2.5">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <IconAdjustmentsHorizontal />
                Filters{(minimumIndex !== "any" || maximumIndex !== "any") ? " · Active" : ""}
              </Button>
            </CollapsibleTrigger>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Sort</span>
              <Select value={sortOrder} onValueChange={(value) => {
                setSortOrder(value as SortOrder)
                resetVisibleContests()
              }}>
                <SelectTrigger className="w-44" size="sm" aria-label="Sort upsolve queue">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="index-asc">Index ↑ per contest</SelectItem>
                  <SelectItem value="index-desc">Index ↓ per contest</SelectItem>
                  <SelectItem value="attempted">Attempted first per contest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CollapsibleContent>
            <div className="grid gap-2 border-t p-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
              <p className="pr-2 text-sm font-medium">Problem index range</p>
              <Select value={minimumIndex} onValueChange={(value) => {
                setMinimumIndex(value)
                resetVisibleContests()
              }}>
                <SelectTrigger className="w-full" size="sm" aria-label="Minimum problem index">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any minimum index</SelectItem>
                  {problemIndexes.map((index) => (
                    <SelectItem key={index} value={index}>
                      Index ≥ {index}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={maximumIndex} onValueChange={(value) => {
                setMaximumIndex(value)
                resetVisibleContests()
              }}>
                <SelectTrigger className="w-full" size="sm" aria-label="Maximum problem index">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any maximum index</SelectItem>
                  {problemIndexes.map((index) => (
                    <SelectItem key={index} value={index}>
                      Index ≤ {index}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(minimumIndex !== "any" || maximumIndex !== "any") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinimumIndex("any")
                    setMaximumIndex("any")
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-muted-foreground">Completion reflects the loaded submission history. Search this handle again to check for new solves.{(range === "7d" || range === "30d") && " Day ranges end today."}</p>
        {visibleGroups.map((group) => (
        <section key={group[0].sourceSessionId} className="overflow-hidden rounded-lg border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
            <div>
              <h3 className="text-sm font-medium">{group[0].contestTitle || group[0].contestId.toUpperCase()}</h3>
              <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(group[0].contestStartAt))} · {history.sessions.find((session) => session.sessionId === group[0].sourceSessionId)?.type}</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {group.length} {group.length === 1 ? "problem" : "problems"}
            </span>
          </div>
          <Table className="table-fixed">
            <colgroup>
              <col className="w-20" />
              <col />
              <col className="w-28" />
              <col className="w-36" />
              <col className="w-28" />
            </colgroup>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Index</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="text-right">Difficulty</TableHead>
                <TableHead className="text-center">At contest</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.problemIndex}</TableCell>
                  <TableCell className="min-w-0">
                    <div className="group/problem inline-flex min-w-0 max-w-full items-center gap-1.5">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {item.problemTitle || "Untitled problem"}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover/problem:opacity-100 group-focus-within/problem:opacity-100"
                        asChild
                      >
                        <a href={item.problemUrl} target="_blank" rel="noreferrer" aria-label={`Open ${item.problemIndex} ${item.problemTitle || "problem"}`} title="Open problem">
                          <IconExternalLink />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-right font-medium"
                    style={{ color: platform === "Codeforces" && item.difficulty != null ? cfRatingColor(item.difficulty) : undefined }}
                  >
                    {item.difficulty ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.attemptedInContest ? "destructive" : "outline"}>
                      {item.attemptedInContest ? "Attempted" : "Not attempted"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.completed ? "default" : "secondary"}>
                      {item.completed ? "Solved" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        ))}
        {visibleGroups.length < groups.length && (
          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleContestCount((count) => Math.min(count + CONTESTS_PER_LOAD, groups.length))}
            >
              Load more contests
            </Button>
          </div>
        )}
        {rows.length === 0 && <div className="rounded-lg border p-8 text-center">
          <p className="text-sm text-muted-foreground">{eligible.length > 0 && status === "pending" ? "All problems in this selection are completed." : "No problems match this selection."}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setRange("all"); setStatus("all"); setMinimumIndex("any"); setMaximumIndex("any") }}>Show all problems</Button>
        </div>}
      </Tabs>
    </div>
  )
}
