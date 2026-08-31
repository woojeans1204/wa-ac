"use client"

import * as React from "react"
import { IconCircleCheckFilled, IconSearch } from "@tabler/icons-react"
import type { History, Problem, Session } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ProblemRow = Problem & { contestId: string; types: Set<Session["type"]> }

function collect(history: History) {
  const rows = new Map<string, ProblemRow>()
  for (const session of history.sessions) for (const problem of session.problems) {
    const row = rows.get(problem.problemId)
    if (row) {
      row.solved ||= problem.solved
      row.attempted ||= problem.attempted
      row.types.add(session.type)
    } else rows.set(problem.problemId, { ...problem, contestId: session.contestId, types: new Set([session.type]) })
  }
  return [...rows.values()].sort((a, b) => (b.difficulty ?? -1) - (a.difficulty ?? -1))
}

export function ShadcnProblemsTable({ history }: { history: History }) {
  const problems = React.useMemo(() => collect(history), [history])
  const [status, setStatus] = React.useState("all")
  const [query, setQuery] = React.useState("")
  const rows = problems.filter((problem) => {
    const state = problem.solved ? "solved" : problem.attempted ? "attempted" : "unattempted"
    return (status === "all" || status === state) && `${problem.problemId} ${problem.title ?? ""}`.toLowerCase().includes(query.toLowerCase())
  })
  return (
    <Tabs value={status} onValueChange={setStatus} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between gap-2 px-4 lg:px-6">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="solved">Solved</TabsTrigger><TabsTrigger value="attempted">Attempted</TabsTrigger><TabsTrigger value="unattempted">Not attempted</TabsTrigger></TabsList>
        <div className="relative"><IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems" className="w-56 pl-8" /></div>
      </div>
      {['all','solved','attempted','unattempted'].map((tab) => <TabsContent key={tab} value={tab} className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"><div className="overflow-hidden rounded-lg border"><Table><TableHeader className="sticky top-0 z-10 bg-muted"><TableRow><TableHead>Problem</TableHead><TableHead>Contest</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Difficulty</TableHead></TableRow></TableHeader><TableBody>{rows.map((problem) => <TableRow key={problem.problemId}><TableCell><div className="font-medium">{problem.title ?? problem.problemId}</div><div className="text-muted-foreground">{problem.problemId}</div></TableCell><TableCell>{problem.contestId.toUpperCase()}</TableCell><TableCell><Badge variant="outline" className="px-1.5 text-muted-foreground">{problem.solved && <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />}{problem.solved ? "Solved" : problem.attempted ? "Attempted" : "Not attempted"}</Badge></TableCell><TableCell className="text-right">{problem.difficulty ?? "—"}</TableCell></TableRow>)}</TableBody></Table></div><div className="px-4 text-sm text-muted-foreground">{rows.length} problem row(s).</div></TabsContent>)}
    </Tabs>
  )
}
