"use client"

import * as React from "react"
import type { History, Problem, Session } from "@/components/ps-types"
import { AtCoderDifficultyIndicator, AtCoderDifficultyScale } from "@/components/vendor/atcoder-problems/difficulty-indicator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowUpRightIcon, CheckCircle2Icon, SearchIcon } from "lucide-react"

type ProblemRecord = Problem & {
  contestId: string
  contestTitle?: string
  latestAt: string
  sessionTypes: Set<Session["type"]>
  submissionIds: Set<number>
}

const difficultyBands = [
  { value: "gray", label: "Gray · <400", min: -Infinity, max: 400 },
  { value: "brown", label: "Brown · 400–799", min: 400, max: 800 },
  { value: "green", label: "Green · 800–1199", min: 800, max: 1200 },
  { value: "cyan", label: "Cyan · 1200–1599", min: 1200, max: 1600 },
  { value: "blue", label: "Blue · 1600–1999", min: 1600, max: 2000 },
  { value: "yellow", label: "Yellow+ · 2000+", min: 2000, max: Infinity },
]

function collectProblems(history: History) {
  const records = new Map<string, ProblemRecord>()

  for (const session of history.sessions) {
    for (const problem of session.problems) {
      const current = records.get(problem.problemId)
      if (!current) {
        records.set(problem.problemId, {
          ...problem,
          contestId: session.contestId,
          contestTitle: session.contestTitle,
          latestAt: session.startAt,
          sessionTypes: new Set([session.type]),
          submissionIds: new Set(problem.submissions.map((submission) => submission.id)),
        })
        continue
      }

      current.solved ||= problem.solved
      current.attempted ||= problem.attempted
      current.sessionTypes.add(session.type)
      problem.submissions.forEach((submission) => current.submissionIds.add(submission.id))
      if (new Date(session.startAt) > new Date(current.latestAt)) current.latestAt = session.startAt
    }
  }

  return [...records.values()].sort((a, b) => {
    const difficulty = (a.difficulty ?? -1) - (b.difficulty ?? -1)
    return difficulty || a.problemId.localeCompare(b.problemId)
  })
}

function problemStatus(problem: ProblemRecord) {
  if (problem.solved) return "solved"
  if (problem.attempted) return "attempted"
  return "unattempted"
}

export function ProblemExplorer({ history }: { history: History }) {
  const problems = React.useMemo(() => collectProblems(history), [history])
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [difficulty, setDifficulty] = React.useState("all")

  const filtered = problems.filter((problem) => {
    const normalized = query.trim().toLowerCase()
    const matchesQuery = !normalized || `${problem.problemId} ${problem.title ?? ""} ${problem.contestId}`.toLowerCase().includes(normalized)
    const matchesStatus = status === "all" || problemStatus(problem) === status
    const band = difficultyBands.find((item) => item.value === difficulty)
    const rating = problem.difficulty ?? -1
    const matchesDifficulty = !band || (rating >= band.min && rating < band.max)
    return matchesQuery && matchesStatus && matchesDifficulty
  })

  const solved = problems.filter((problem) => problem.solved).length
  const attempted = problems.filter((problem) => problem.attempted && !problem.solved).length

  return (
    <Card className="min-w-0 overflow-hidden shadow-xs">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Problem explorer</CardTitle>
            <CardDescription className="mt-1">All unique problems found in imported contests and training sessions</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{problems.length} unique</Badge>
            <Badge variant="outline" className="text-emerald-700">{solved} solved</Badge>
            <Badge variant="outline" className="text-red-700">{attempted} attempted</Badge>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <Tabs value={status} onValueChange={setStatus}>
            <TabsList variant="line" className="w-full justify-start overflow-x-auto rounded-none bg-transparent">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="solved">Solved</TabsTrigger>
              <TabsTrigger value="attempted">Attempted</TabsTrigger>
              <TabsTrigger value="unattempted">Not attempted</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problem or contest" className="pl-9" />
            </div>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger aria-label="Difficulty filter"><SelectValue placeholder="All difficulties" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All difficulties</SelectItem>
                {difficultyBands.map((band) => <SelectItem key={band.value} value={band.value}>{band.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AtCoderDifficultyScale />
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-5">Diff.</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Contest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="w-16 pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((problem) => {
                const state = problemStatus(problem)
                const url = `https://atcoder.jp/contests/${problem.contestId}/tasks/${problem.problemId}`
                return (
                  <TableRow key={problem.problemId}>
                    <TableCell className="pl-5">
                      <AtCoderDifficultyIndicator rating={problem.difficulty} label={problem.index} state={state} size={34} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{problem.title ?? problem.problemId}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{problem.problemId} · difficulty {problem.difficulty ?? "?"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{problem.contestId.toUpperCase()}</div>
                      <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">{[...problem.sessionTypes].join(" · ")}</div>
                    </TableCell>
                    <TableCell>
                      {state === "solved" ? (
                        <Badge variant="outline" className="text-emerald-700"><CheckCircle2Icon /> AC</Badge>
                      ) : state === "attempted" ? (
                        <Badge variant="outline" className="text-red-700">Attempted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not tried</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{problem.submissionIds.size}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${problem.title ?? problem.problemId}`}>
                        <a href={url} target="_blank" rel="noreferrer"><ArrowUpRightIcon /></a>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!filtered.length && (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No problems match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">Showing {filtered.length} of {problems.length} unique problems</div>
      </CardContent>
    </Card>
  )
}
