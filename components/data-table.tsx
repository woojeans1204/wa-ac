"use client"

import * as React from "react"
import type { Problem, Session } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowUpRightIcon, CheckIcon, Clock3Icon, XIcon } from "lucide-react"

const difficultyStyles: Record<string, string> = {
  gray: "bg-zinc-500 text-white",
  brown: "bg-amber-700 text-white",
  green: "bg-emerald-600 text-white",
  cyan: "bg-cyan-600 text-white",
  blue: "bg-blue-600 text-white",
  yellow: "bg-yellow-400 text-zinc-950",
  orange: "bg-orange-500 text-white",
  red: "bg-red-600 text-white",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value))
}

function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds < 0) return "—"
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function firstAc(problem: Problem) {
  return problem.submissions.find((item) => item.result === "AC")?.contestClock?.elapsedSecond
}

function ContestProblems({ session }: { session: Session }) {
  return (
    <TooltipProvider>
      <div className="flex min-w-max items-center gap-1.5">
        {session.problems.map((problem) => (
          <Tooltip key={problem.problemId}>
            <TooltipTrigger asChild>
              <Badge
                variant={problem.attempted ? "default" : "outline"}
                className={`size-7 justify-center rounded-md p-0 font-mono text-[11px] ${
                  problem.solved
                    ? difficultyStyles[problem.difficultyColor ?? "gray"] ?? difficultyStyles.gray
                    : problem.attempted
                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                      : "bg-background text-muted-foreground"
                }`}
              >
                {problem.index}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{problem.title ?? `${session.contestId} ${problem.index}`}</p>
              <p className="text-xs opacity-75">difficulty {problem.difficulty ?? "?"} · {problem.solved ? `AC ${formatDuration(firstAc(problem))}` : problem.attempted ? problem.submissions.map((item) => item.result).join(" → ") : "not attempted"}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}

function ContestDetail({ session }: { session: Session }) {
  const start = Math.floor(new Date(session.startAt).getTime() / 1000)
  const lastAc = session.metrics.lastAcEpochSecond ? session.metrics.lastAcEpochSecond - start : null

  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto px-4 pb-8 sm:px-6">
      <div className="grid grid-cols-3 gap-3 py-5">
        <Card size="sm"><CardHeader><CardDescription>Solved</CardDescription><CardTitle className="font-mono text-2xl">{session.metrics.solved}/{session.problems.length}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>Last AC</CardDescription><CardTitle className="font-mono text-2xl">{formatDuration(lastAc)}</CardTitle></CardHeader></Card>
        <Card size="sm"><CardHeader><CardDescription>Top difficulty</CardDescription><CardTitle className="font-mono text-2xl">{session.metrics.highestSolvedDifficulty ?? "—"}</CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="problems">
        <TabsList variant="line" className="w-full justify-start rounded-none border-b bg-transparent">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="problems" className="mt-4">
          <div className="space-y-3">
            {session.problems.map((problem) => {
              const failed = problem.submissions.filter((item) => item.result !== "AC").length
              return (
                <Card key={problem.problemId} size="sm">
                  <CardContent className="flex items-center gap-3">
                    <Badge className={`size-8 justify-center rounded-md p-0 font-mono ${difficultyStyles[problem.difficultyColor ?? "gray"] ?? difficultyStyles.gray}`}>{problem.index}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{problem.title ?? problem.problemId}</p>
                      <p className="text-xs text-muted-foreground">difficulty {problem.difficulty ?? "?"} · {problem.submissions.length} submissions</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={problem.solved ? "text-emerald-700" : problem.attempted ? "text-red-700" : "text-muted-foreground"}>
                        {problem.solved ? <CheckIcon /> : <XIcon />}{problem.solved ? "AC" : problem.attempted ? problem.submissions.at(-1)?.result : "—"}
                      </Badge>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{problem.solved ? formatDuration(firstAc(problem)) : failed ? `${failed} failed` : "not tried"}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <Card size="sm">
            <CardHeader><CardTitle>Submission timeline</CardTitle><CardDescription>Sorted by contest elapsed time</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {session.problems.filter((problem) => problem.attempted).map((problem) => (
                <div key={problem.problemId} className="grid grid-cols-[28px_1fr_auto] items-center gap-3">
                  <Badge variant="outline" className="size-7 justify-center rounded-md p-0 font-mono">{problem.index}</Badge>
                  <div>
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {problem.submissions.map((submission) => <Badge key={submission.id} variant={submission.result === "AC" ? "default" : "destructive"} className="rounded-sm px-1.5 font-mono text-[10px]">{submission.result}</Badge>)}
                    </div>
                    <Progress value={Math.min(100, ((firstAc(problem) ?? problem.submissions.at(-1)?.contestClock?.elapsedSecond ?? 0) / 6000) * 100)} className="h-1.5" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{formatDuration(firstAc(problem) ?? problem.submissions.at(-1)?.contestClock?.elapsedSecond)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {session.sourceUrl && <Button asChild variant="outline" className="mt-5 w-full"><a href={session.sourceUrl} target="_blank" rel="noreferrer">Open original contest <ArrowUpRightIcon /></a></Button>}
    </div>
  )
}

export function DataTable({ data }: { data: Session[] }) {
  const [filter, setFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<Session | null>(null)
  const sessions = data.filter((session) => filter === "all" || session.type === filter).slice(0, 15)

  return (
    <>
      <Card className="min-w-0 overflow-hidden shadow-xs">
        <CardHeader className="border-b">
          <CardTitle>Recent contests</CardTitle>
          <CardDescription>OP.GG-style match history · click a row for full detail</CardDescription>
          <Tabs value={filter} onValueChange={setFilter} className="mt-2">
            <TabsList variant="line" className="w-full justify-start rounded-none bg-transparent">
              <TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="actual">Actual</TabsTrigger><TabsTrigger value="virtual">Virtual</TabsTrigger><TabsTrigger value="practice">Practice</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">Contest</TableHead><TableHead>Result</TableHead><TableHead>Problems</TableHead><TableHead className="text-right">Top diff.</TableHead><TableHead className="pr-5 text-right">Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const start = Math.floor(new Date(session.startAt).getTime() / 1000)
                  const lastAc = session.metrics.lastAcEpochSecond ? session.metrics.lastAcEpochSecond - start : null
                  const ratio = session.problems.length ? session.metrics.solved / session.problems.length : 0
                  return (
                    <TableRow key={session.sessionId} onClick={() => setSelected(session)} className={`cursor-pointer border-l-4 hover:bg-muted/70 ${ratio >= .65 ? "border-l-blue-500 bg-blue-50/40" : ratio >= .35 ? "border-l-amber-500 bg-amber-50/30" : "border-l-zinc-300"}`}>
                      <TableCell className="pl-4"><p className="font-semibold">{session.contestId.toUpperCase()}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDate(session.startAt)} · <span className="capitalize">{session.type}</span></p></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Badge variant="outline" className={ratio >= .65 ? "border-blue-200 bg-blue-100 text-blue-700" : ratio >= .35 ? "border-amber-200 bg-amber-100 text-amber-700" : ""}>{session.metrics.solved}/{session.problems.length}</Badge><span className="hidden text-xs text-muted-foreground xl:inline">{session.metrics.failedSubmissions ? `${session.metrics.failedSubmissions} failed` : "clean"}</span></div></TableCell>
                      <TableCell><ContestProblems session={session} /></TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{session.metrics.highestSolvedDifficulty ?? "—"}</TableCell>
                      <TableCell className="pr-5 text-right"><span className="inline-flex items-center gap-1 font-mono text-xs"><Clock3Icon className="size-3.5 text-muted-foreground" />{formatDuration(lastAc)}</span></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Drawer open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="max-h-[92vh]">
          {selected && <><DrawerHeader className="mx-auto w-full max-w-3xl text-left"><DrawerTitle>{selected.contestTitle ?? selected.contestId.toUpperCase()}</DrawerTitle><DrawerDescription>{formatDate(selected.startAt)} · <span className="capitalize">{selected.type}</span> contest detail</DrawerDescription></DrawerHeader><ContestDetail session={selected} /></>}
        </DrawerContent>
      </Drawer>
    </>
  )
}
