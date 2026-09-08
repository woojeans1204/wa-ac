"use client"

import * as React from "react"
import { cfRatingColor } from "@/lib/codeforces-colors"
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconCircleCheckFilled, IconExternalLink, IconLayoutColumns } from "@tabler/icons-react"
import type { Problem, Session } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function isAccepted(result: string) {
  return result === "AC" || result === "OK"
}

function duration(session: Session) {
  if (!session.metrics.lastAcEpochSecond) return "—"
  const seconds = session.metrics.lastAcEpochSecond - Math.floor(new Date(session.startAt).getTime() / 1000)
  if (seconds < 0) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  if (!hours) return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function firstAcSecond(problem: Problem) {
  const seconds = problem.submissions
    .filter((submission) => isAccepted(submission.result))
    .map((submission) => submission.contestClock?.elapsedSecond)
    .filter((second): second is number => second != null && second >= 0)
  return seconds.length ? Math.min(...seconds) : null
}

function wrongAttempts(problem: Problem) {
  const firstAc = firstAcSecond(problem)
  return problem.submissions.filter((submission) => {
    if (isAccepted(submission.result)) return false
    const elapsed = submission.contestClock?.elapsedSecond
    return firstAc == null || elapsed == null || elapsed <= firstAc
  }).length
}

function compactElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

function contestLength(seconds?: number | null) {
  if (seconds == null) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (!hours) return `${minutes}m`
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

function exactElapsed(seconds: number | null) {
  if (seconds == null) return "—"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
})

const mobileDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
})

function contestDivision(title?: string) {
  if (!title) return "—"
  const divisions = [...title.matchAll(/Div\.?\s*(\d+)/gi)]
    .map((match) => match[1])
    .filter((value, index, values) => values.indexOf(value) === index)
  return divisions.length ? `Div. ${divisions.join(" + ")}` : "—"
}

function compactContestDivision(title?: string) {
  const division = contestDivision(title)
  return division === "—" ? division : division.replace("Div. ", "D").replaceAll(" ", "")
}

export function ShadcnDataTable({
  data,
  platform = "AtCoder",
  showRowsPerPage = false,
}: {
  data: Session[]
  platform?: "AtCoder" | "Codeforces"
  showRowsPerPage?: boolean
}) {
  const [view, setView] = React.useState("all")
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = React.useState<5 | 10 | 20>(10)
  const [openContest, setOpenContest] = React.useState<string | null>(null)
  const [visible, setVisible] = React.useState({ type: true, division: true, duration: true, problems: true, difficulty: true, time: true })
  const showDivision = platform === "Codeforces" && visible.division
  const filtered = data.filter((session) => view === "all" || session.type === view)
    .toSorted((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice(page * pageSize, page * pageSize + pageSize)

  function changeView(value: string) {
    setView(value)
    setPage(0)
    setOpenContest(null)
  }

  function changePageSize(value: string) {
    const next = Number(value) as 5 | 10 | 20
    setPageSize(next)
    setPage(0)
    setOpenContest(null)
  }

  function changePage(nextPage: number) {
    setPage(Math.max(0, Math.min(pageCount - 1, nextPage)))
    setOpenContest(null)
  }

  return (
    <Tabs value={view} onValueChange={changeView} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">View</Label>
        <Select value={view} onValueChange={changeView}>
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector"><SelectValue placeholder="Select a view" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All contests</SelectItem><SelectItem value="actual">Actual</SelectItem><SelectItem value="virtual">Virtual</SelectItem></SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all">All contests</TabsTrigger><TabsTrigger value="actual">Actual <Badge variant="secondary">{data.filter((item) => item.type === "actual").length}</Badge></TabsTrigger><TabsTrigger value="virtual">Virtual <Badge variant="secondary">{data.filter((item) => item.type === "virtual").length}</Badge></TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          {showRowsPerPage && (
            <Select value={String(pageSize)} onValueChange={changePageSize}>
              <SelectTrigger className="w-28" size="sm" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Rows: 5</SelectItem>
                <SelectItem value="10">Rows: 10</SelectItem>
                <SelectItem value="20">Rows: 20</SelectItem>
              </SelectContent>
            </Select>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><IconLayoutColumns /><span className="hidden lg:inline">Customize Columns</span><span className="hidden min-[360px]:inline lg:hidden">Columns</span><IconChevronDown /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">{Object.entries(visible).filter(([key]) => key !== "division" || platform === "Codeforces").map(([key, value]) => <DropdownMenuCheckboxItem key={key} className="capitalize" checked={value} onCheckedChange={(checked) => setVisible((current) => ({ ...current, [key]: !!checked }))}>{key}</DropdownMenuCheckboxItem>)}</DropdownMenuContent>
          </DropdownMenu>
      </div>
        </div>
        <TabsContent value={view} className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="space-y-2 lg:hidden">
              {rows.map((session) => {
                const isOpen = openContest === session.sessionId
                return (
                  <Collapsible
                    key={session.sessionId}
                    open={isOpen}
                    onOpenChange={(open) => setOpenContest(open ? session.sessionId : null)}
                    className="overflow-hidden rounded-lg border bg-card"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        aria-label={`${session.contestId.toUpperCase()} contest details`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
                            <span className="truncate">{session.contestId.toUpperCase()}</span>
                            <IconChevronDown className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </span>
                          {visible.type && <Badge variant="outline" className="shrink-0 capitalize">{session.type}</Badge>}
                          <Badge variant="outline" className="shrink-0 px-1.5 text-muted-foreground">
                            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
                            {session.metrics.solved}/{session.problems.length}
                          </Badge>
                          {visible.difficulty && (
                            <span
                              className="shrink-0 font-medium tabular-nums"
                              style={{ color: platform === "Codeforces" ? cfRatingColor(session.metrics.highestSolvedDifficulty) : undefined }}
                            >
                              {session.metrics.highestSolvedDifficulty ?? "—"}
                            </span>
                          )}
                        </span>
                        <span className="mt-1.5 flex min-w-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                          <span>{mobileDateFormatter.format(new Date(session.startAt))}</span>
                          {showDivision && <><span aria-hidden="true">·</span><span>{compactContestDivision(session.contestTitle)}</span></>}
                          {visible.duration && <><span aria-hidden="true">·</span><span className="font-mono">{contestLength(session.durationSecond).replaceAll(" ", "")}</span></>}
                          {visible.time && <><span aria-hidden="true">·</span><span className="ml-auto font-mono tabular-nums">Last AC {duration(session)}</span></>}
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20">
                        <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{session.contestTitle || session.contestId.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground">{session.metrics.submissionCount} submissions · {session.metrics.failedSubmissions} failed</div>
                          </div>
                          {session.sourceUrl && (
                            <Button variant="outline" size="icon-sm" className="shrink-0" asChild>
                              <a href={session.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open contest">
                                <IconExternalLink />
                              </a>
                            </Button>
                          )}
                        </div>
                        {visible.problems && (
                          <div className="divide-y border-t">
                            {session.problems.map((problem) => {
                              const firstAc = firstAcSecond(problem)
                              return (
                                <div key={problem.problemId} className="space-y-1.5 px-3 py-2.5">
                                  <div className="flex min-w-0 items-baseline gap-2 text-sm">
                                    <span className="shrink-0 font-medium">{problem.index}</span>
                                    {problem.title && <span className="min-w-0 truncate text-muted-foreground">{problem.title}</span>}
                                    <span
                                      className="ml-auto shrink-0 font-medium tabular-nums"
                                      style={{ color: platform === "Codeforces" ? cfRatingColor(problem.difficulty) : undefined }}
                                    >
                                      {problem.difficulty ?? "—"}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <Badge variant={problem.solved ? "default" : problem.attempted ? "destructive" : "outline"}>
                                      {problem.solved ? "AC" : problem.attempted ? "Unsolved" : "Not attempted"}
                                    </Badge>
                                    <span>First AC <span className="font-mono tabular-nums">{exactElapsed(firstAc)}</span></span>
                                    <span>Wrong {problem.attempted ? wrongAttempts(problem) : "—"}</span>
                                    <span>{problem.submissions.length} submissions</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
              {rows.length === 0 && (
                <div className="rounded-lg border px-4 py-12 text-center text-sm text-muted-foreground">
                  No contests match this view.
                </div>
              )}
            </div>
          <div className="hidden overflow-hidden rounded-lg border lg:block">
            <Table className="min-w-[900px]">
              <TableHeader className="sticky top-0 z-10 bg-muted"><TableRow><TableHead>Contest</TableHead>{visible.type && <TableHead className="text-center">Type</TableHead>}{showDivision && <TableHead>Division</TableHead>}{visible.duration && <TableHead>Length</TableHead>}<TableHead>Solved</TableHead>{visible.problems && <TableHead className="w-80 max-w-80">Problems</TableHead>}{visible.difficulty && <TableHead className="text-right">Top difficulty</TableHead>}{visible.time && <TableHead className="text-right" title="Elapsed time from contest start to last accepted submission">Last AC</TableHead>}</TableRow></TableHeader>
              {rows.map((session) => {
                const columnCount = 2 + Number(visible.type) + Number(showDivision) + Number(visible.duration) + Number(visible.problems) + Number(visible.difficulty) + Number(visible.time)
                return (
                  <Collapsible
                    key={session.sessionId}
                    open={openContest === session.sessionId}
                    onOpenChange={(open) => setOpenContest(open ? session.sessionId : null)}
                    asChild
                  >
                    <TableBody>
                      <TableRow aria-expanded={openContest === session.sessionId}>
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="h-auto justify-start px-0 py-0 text-left">
                              <span>
                                <span className="block font-medium">{session.contestId.toUpperCase()}</span>
                                <span className="block text-muted-foreground">{dateFormatter.format(new Date(session.startAt))}</span>
                              </span>
                              <IconChevronDown className={`transition-transform ${openContest === session.sessionId ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        {visible.type && <TableCell className="text-center"><Badge variant="outline" className="capitalize">{session.type}</Badge></TableCell>}
                        {showDivision && <TableCell className="whitespace-nowrap">{contestDivision(session.contestTitle)}</TableCell>}
                        {visible.duration && <TableCell className="whitespace-nowrap font-mono text-muted-foreground">{contestLength(session.durationSecond)}</TableCell>}
                        <TableCell><Badge variant="outline" className="px-1.5 text-muted-foreground"><IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />{session.metrics.solved}/{session.problems.length}</Badge></TableCell>
                        {visible.problems && (
                          <TableCell className="w-80 max-w-80">
                            <div className="flex max-w-80 flex-wrap gap-1">
                              {session.problems.map((problem) => {
                                const firstAc = firstAcSecond(problem)
                                const wrong = wrongAttempts(problem)
                                return (
                                  <Badge
                                    key={problem.problemId}
                                    variant={problem.solved ? "secondary" : problem.attempted ? "destructive" : "outline"}
                                    className="font-mono font-normal tabular-nums"
                                  >
                                    <span>{problem.index}</span>
                                    <span className="text-[10px] leading-none opacity-75">
                                      {firstAc != null
                                        ? compactElapsed(firstAc)
                                        : problem.attempted
                                          ? `${wrong}×`
                                          : "—"}
                                    </span>
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>
                        )}
                        {visible.difficulty && <TableCell className="text-right font-medium" style={{ color: platform === "Codeforces" ? cfRatingColor(session.metrics.highestSolvedDifficulty) : undefined }}>{session.metrics.highestSolvedDifficulty ?? "—"}</TableCell>}
                        {visible.time && <TableCell className="text-right font-mono tabular-nums">{duration(session)}</TableCell>}
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={columnCount} className="bg-muted/30 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">{session.contestTitle || session.contestId.toUpperCase()}</div>
                                <div className="text-sm text-muted-foreground">{session.metrics.submissionCount} submissions · {session.metrics.failedSubmissions} failed</div>
                              </div>
                              {session.sourceUrl && <Button variant="outline" size="sm" asChild><a href={session.sourceUrl} target="_blank" rel="noreferrer">Open contest <IconExternalLink /></a></Button>}
                            </div>
                            <Table>
                              <TableHeader><TableRow><TableHead>Problem</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Difficulty</TableHead><TableHead className="text-right">First AC</TableHead><TableHead className="text-right">Wrong tries</TableHead><TableHead className="text-right">Submissions</TableHead></TableRow></TableHeader>
                              <TableBody>
                                {session.problems.map((problem) => {
                                  const firstAc = firstAcSecond(problem)
                                  return (
                                    <TableRow key={problem.problemId}>
                                      <TableCell><span className="font-medium">{problem.index}</span>{problem.title && <span className="ml-2 text-muted-foreground">{problem.title}</span>}</TableCell>
                                      <TableCell><Badge variant={problem.solved ? "default" : problem.attempted ? "destructive" : "outline"}>{problem.solved ? "AC" : problem.attempted ? "Unsolved" : "Not attempted"}</Badge></TableCell>
                                      <TableCell className="text-right font-medium" style={{ color: platform === "Codeforces" ? cfRatingColor(problem.difficulty) : undefined }}>{problem.difficulty ?? "—"}</TableCell>
                                      <TableCell className="text-right font-mono tabular-nums">{exactElapsed(firstAc)}</TableCell>
                                      <TableCell className="text-right tabular-nums">{problem.attempted ? wrongAttempts(problem) : "—"}</TableCell>
                                      <TableCell className="text-right">{problem.submissions.length}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </TableBody>
                  </Collapsible>
                )
              })}
              {rows.length === 0 && (
                <TableBody>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={2 + Number(visible.type) + Number(showDivision) + Number(visible.duration) + Number(visible.problems) + Number(visible.difficulty) + Number(visible.time)} className="h-24 text-center text-muted-foreground">
                      No contests match this view.
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4">
              <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">{filtered.length} contest row(s).</div>
              <div className="flex w-full items-center gap-8 lg:w-fit"><div className="flex w-fit items-center justify-center text-sm font-medium">Page {page + 1} of {pageCount}</div><div className="ml-auto flex items-center gap-2 lg:ml-0"><Button variant="outline" className="size-8" size="icon" onClick={() => changePage(page - 1)} disabled={page === 0}><span className="sr-only">Go to previous page</span><IconChevronLeft /></Button><Button variant="outline" className="size-8" size="icon" onClick={() => changePage(page + 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to next page</span><IconChevronRight /></Button></div></div>
            </div>
          )}
        </TabsContent>
    </Tabs>
  )
}
