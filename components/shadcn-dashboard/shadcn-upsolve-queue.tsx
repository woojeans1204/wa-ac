"use client"

import * as React from "react"
import { cfRatingColor } from "@/lib/codeforces-colors"
import { IconAdjustmentsHorizontal, IconExternalLink } from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Slider } from "@/components/ui/slider"
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
import { buildUpsolveQueue } from "@/lib/upsolve"

type QueueStatus = "all" | "pending" | "completed"
type TimeRange = "latest" | "7d" | "30d" | "all"
type SortOrder = "latest" | "oldest"
type ContestTypeFilter = "all" | "actual" | "virtual"
type AttemptFilter = "all" | "attempted"

const CONTESTS_PER_LOAD = 10
const MIN_DIFFICULTY = 800
const MAX_DIFFICULTY = 3500

const timeRanges: Array<{ value: TimeRange; label: string; days?: number }> = [
  { value: "all", label: "All time" },
  { value: "latest", label: "Latest contest" },
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
]

const indexCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" })

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
})

function matchesTimeRange(
  contestStartAt: string,
  sourceSessionId: string,
  range: TimeRange,
  latestSessionId?: string
) {
  if (range === "all") return true
  if (range === "latest") return sourceSessionId === latestSessionId
  const days = timeRanges.find((item) => item.value === range)?.days ?? 0
  return new Date(contestStartAt).getTime() >= Date.now() - days * 86_400_000
}

export function ShadcnUpsolveQueue({
  history,
  platform,
}: {
  history: History
  platform: "AtCoder" | "Codeforces"
}) {
  const [status, setStatus] = React.useState<QueueStatus>("pending")
  const [difficultyRange, setDifficultyRange] = React.useState([MIN_DIFFICULTY, MAX_DIFFICULTY])
  const [tagFilter, setTagFilter] = React.useState("any")
  const [attemptFilter, setAttemptFilter] = React.useState<AttemptFilter>("attempted")
  const [timeRange, setTimeRange] = React.useState<TimeRange>("all")
  const [contestTypeFilter, setContestTypeFilter] = React.useState<ContestTypeFilter>("all")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("latest")
  const [visibleContestCount, setVisibleContestCount] = React.useState(CONTESTS_PER_LOAD)
  const items = React.useMemo(
    () => history.upsolves ?? buildUpsolveQueue(history, platform),
    [history, platform]
  )
  const problemTags = React.useMemo(
    () => [...new Set(items.flatMap((item) => item.tags ?? []))]
      .toSorted((a, b) => a.localeCompare(b)),
    [items]
  )
  const hasDifficultyFilter = difficultyRange[0] !== MIN_DIFFICULTY
    || difficultyRange[1] !== MAX_DIFFICULTY
  const latestSessionId = history.sessions
    .filter((session) => session.type !== "practice")
    .toSorted((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))
    .at(0)?.sessionId
  const eligible = items.filter((item) => {
    if (!matchesTimeRange(item.contestStartAt, item.sourceSessionId, timeRange, latestSessionId)) return false
    if (hasDifficultyFilter && (
      item.difficulty == null
      || item.difficulty < difficultyRange[0]
      || item.difficulty > difficultyRange[1]
    )) return false
    if (tagFilter !== "any" && !item.tags?.includes(tagFilter)) return false
    if (attemptFilter === "attempted" && !item.attemptedInContest) return false
    if (contestTypeFilter !== "all" && item.contestType !== contestTypeFilter) return false
    return true
  })
  const pending = eligible.filter((item) => !item.completed).length
  const completed = eligible.filter((item) => item.completed).length
  const rows = eligible.filter(
    (item) => status === "all" || item.completed === (status === "completed")
  )

  const groups = [...Map.groupBy(rows, (item) => item.sourceSessionId).values()]
    .map((group) => group.toSorted((a, b) => indexCollator.compare(a.problemIndex, b.problemIndex)))
    .toSorted((a, b) => {
      const dateOrder = Date.parse(b[0].contestStartAt) - Date.parse(a[0].contestStartAt)
      return sortOrder === "oldest" ? -dateOrder : dateOrder
    })
  const visibleGroups = groups.slice(0, visibleContestCount)

  const resetVisibleContests = () => setVisibleContestCount(CONTESTS_PER_LOAD)
  const hasActiveFilters = hasDifficultyFilter
    || tagFilter !== "any"
    || attemptFilter !== "all"
    || timeRange !== "all"
    || contestTypeFilter !== "all"
    || sortOrder !== "latest"

  const resetFilters = () => {
    setDifficultyRange([MIN_DIFFICULTY, MAX_DIFFICULTY])
    setTagFilter("any")
    setAttemptFilter("attempted")
    setTimeRange("all")
    setContestTypeFilter("all")
    setSortOrder("latest")
    resetVisibleContests()
  }

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
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "problem" : "problems"} in {groups.length} {groups.length === 1 ? "contest" : "contests"}
          </p>
        </div>

        <Collapsible className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Difficulty</span>
            <div className="flex h-7 w-56 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 dark:bg-input/30" title="Difficulty range">
              <span
                className="w-8 text-right text-xs font-medium tabular-nums"
                style={{ color: cfRatingColor(difficultyRange[0]) }}
              >
                {difficultyRange[0]}
              </span>
              <Slider
                value={difficultyRange}
                min={MIN_DIFFICULTY}
                max={MAX_DIFFICULTY}
                step={100}
                minStepsBetweenThumbs={1}
                onValueChange={(value) => {
                  setDifficultyRange(value)
                  resetVisibleContests()
                }}
                className="min-w-24"
              />
              <span
                className="w-8 text-xs font-medium tabular-nums"
                style={{ color: cfRatingColor(difficultyRange[1]) }}
              >
                {difficultyRange[1]}
              </span>
            </div>
            <div>
              <Select value={tagFilter} onValueChange={(value) => {
                setTagFilter(value)
                resetVisibleContests()
              }}>
                <SelectTrigger className="w-32" size="sm" aria-label="Problem tag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any tag</SelectItem>
                  {problemTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={attemptFilter} onValueChange={(value) => {
                setAttemptFilter(value as AttemptFilter)
                resetVisibleContests()
              }}>
              <SelectTrigger className="w-36" size="sm" aria-label="Attempt filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any attempt</SelectItem>
                <SelectItem value="attempted">Only attempted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="contents">
            <div className="order-3 flex items-center gap-1 lg:col-span-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <IconAdjustmentsHorizontal />
                  More filters{contestTypeFilter !== "all" ? " · 1" : ""}
                </Button>
              </CollapsibleTrigger>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
              )}
            </div>
            <div className="order-2 flex flex-wrap items-center gap-2">
              <div>
                <Select value={timeRange} onValueChange={(value) => {
                  setTimeRange(value as TimeRange)
                  resetVisibleContests()
                }}>
                  <SelectTrigger className="w-32" size="sm" aria-label="Upsolve period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRanges.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={sortOrder} onValueChange={(value) => {
                  setSortOrder(value as SortOrder)
                  resetVisibleContests()
                }}>
                  <SelectTrigger className="w-32" size="sm" aria-label="Sort upsolve queue">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="latest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <CollapsibleContent className="order-4 lg:col-span-2">
            <div className="mt-2 rounded-lg border bg-muted/20 p-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Contest type</p>
                <Select value={contestTypeFilter} onValueChange={(value) => {
                  setContestTypeFilter(value as ContestTypeFilter)
                  resetVisibleContests()
                }}>
                  <SelectTrigger className="w-full sm:w-48" size="sm" aria-label="Contest type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Actual + virtual</SelectItem>
                    <SelectItem value="actual">Actual only</SelectItem>
                    <SelectItem value="virtual">Virtual only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
          <div className="divide-y lg:hidden">
            {group.map((item) => (
              <div key={item.id} className="space-y-2 px-4 py-3">
                <a href={item.problemUrl} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm font-medium">
                  <span className="shrink-0 text-muted-foreground">{item.problemIndex}</span>
                  <span className="min-w-0 break-words">{item.problemTitle || "Untitled problem"}</span>
                  <IconExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </a>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium tabular-nums" style={{ color: platform === "Codeforces" && item.difficulty != null ? cfRatingColor(item.difficulty) : undefined }}>{item.difficulty ?? "Unrated"}</span>
                  <Badge variant={item.attemptedInContest ? "destructive" : "outline"}>{item.attemptedInContest ? "Attempted" : "Not attempted"}</Badge>
                  <Badge variant={item.completed ? "default" : "secondary"}>{item.completed ? "Solved" : "Pending"}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
          <Table className="min-w-[720px] table-fixed">
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
          </div>
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
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setStatus("all"); resetFilters() }}>Show all problems</Button>
        </div>}
      </Tabs>
    </div>
  )
}
