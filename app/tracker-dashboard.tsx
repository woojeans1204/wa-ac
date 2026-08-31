"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Submission = {
  id: number;
  result: string;
  epoch_second: number;
  contestClock?: { elapsedSecond?: number; insideSession?: boolean };
};

type Problem = {
  problemId: string;
  index: string;
  difficulty?: number | null;
  difficultyColor?: string | null;
  attempted: boolean;
  solved: boolean;
  submissions: Submission[];
};

type Session = {
  sessionId: string;
  type: "actual" | "virtual" | "practice";
  contestId: string;
  startAt: string;
  metrics: {
    solved: number;
    attempted: number;
    failedSubmissions: number;
    submissionCount: number;
    highestSolvedDifficulty?: number | null;
    lastAcEpochSecond?: number | null;
  };
  problems: Problem[];
};

type History = {
  user: string;
  summary: {
    sessions: number;
    actualSessions: number;
    virtualSessions: number;
    practiceSessions: number;
    submissions: number;
  };
  sessions: Session[];
  raw?: {
    actualHistory?: Array<{
      performance?: number | null;
      newRating?: number | null;
    }>;
  };
};

const difficultyColors: Record<string, string> = {
  gray: "bg-zinc-400",
  brown: "bg-amber-700",
  green: "bg-emerald-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

const typeStyles = {
  actual: "border-sky-200 bg-sky-50 text-sky-700",
  virtual: "border-violet-200 bg-violet-50 text-violet-700",
  practice: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

function formatDuration(seconds?: number | null) {
  if (seconds == null || seconds < 0) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function firstAcElapsed(problem: Problem) {
  return problem.submissions.find((submission) => submission.result === "AC")
    ?.contestClock?.elapsedSecond;
}

function deriveMetrics(history: History) {
  const official = history.raw?.actualHistory ?? [];
  const rated = official.filter((item) => item.newRating != null);
  const performances = official.filter((item) => item.performance != null);
  const currentRating = rated.at(-1)?.newRating ?? 904;
  const peakRating = Math.max(currentRating, ...rated.map((item) => item.newRating ?? 0));
  const recentPerformance = performances.at(-1)?.performance ?? null;
  const contestSessions = history.sessions.filter((session) => session.type !== "practice");
  const solvedProblems = contestSessions.flatMap((session) =>
    session.problems.filter((problem) => problem.solved),
  );
  const solveTimes = solvedProblems
    .map(firstAcElapsed)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const medianSolveTime = solveTimes.length
    ? solveTimes[Math.floor(solveTimes.length / 2)]
    : null;
  const firstTry = solvedProblems.filter(
    (problem) => problem.submissions[0]?.result === "AC",
  ).length;
  const failed = contestSessions.reduce(
    (sum, session) => sum + session.metrics.failedSubmissions,
    0,
  );

  return {
    currentRating,
    peakRating,
    recentPerformance,
    medianSolveTime,
    firstTryRate: solvedProblems.length
      ? Math.round((firstTry / solvedProblems.length) * 100)
      : 0,
    failuresPerAc: solvedProblems.length
      ? (failed / solvedProblems.length).toFixed(2)
      : "0.00",
  };
}

function deriveFrontier(sessions: Session[]) {
  const recent = sessions.filter((session) => session.type !== "practice").slice(0, 24);
  return [400, 800, 1200, 1600, 2000].map((floor) => {
    const problems = recent.flatMap((session) =>
      session.problems.filter((problem) => {
        const difficulty = problem.difficulty ?? -1;
        return difficulty >= floor && difficulty < floor + 400;
      }),
    );
    const solved = problems.filter((problem) => problem.solved).length;
    const rate = problems.length ? Math.round((solved / problems.length) * 100) : 0;
    const label = rate >= 75
      ? "Stable"
      : rate >= 50
        ? "Comfortable"
        : rate >= 20
          ? "Training"
          : "Stretch";
    return { floor, rate, label };
  });
}

function deriveUpsolveQueue(sessions: Session[]) {
  const seen = new Set<string>();
  const queue: Array<Problem & { contestId: string }> = [];
  for (const session of sessions.filter((item) => item.type !== "practice")) {
    const highest = session.metrics.highestSolvedDifficulty ?? 0;
    for (const problem of session.problems) {
      const difficulty = problem.difficulty ?? 0;
      if (
        !problem.solved &&
        difficulty >= Math.max(400, highest - 100) &&
        difficulty <= highest + 550 &&
        !seen.has(problem.problemId)
      ) {
        seen.add(problem.problemId);
        queue.push({ ...problem, contestId: session.contestId });
      }
      if (queue.length >= 5) return queue;
    }
  }
  return queue;
}

function deriveGrowth(sessions: Session[]) {
  return sessions
    .filter((session) => session.type !== "practice")
    .slice(0, 20)
    .reverse()
    .map((session) => ({
      contest: session.contestId.toUpperCase(),
      date: new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
        timeZone: "Asia/Seoul",
      }).format(new Date(session.startAt)),
      highest: session.metrics.highestSolvedDifficulty ?? 0,
      solved: session.metrics.solved,
    }));
}

export function TrackerDashboard({ history }: { history: History }) {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(history.sessions[0]?.sessionId ?? "");
  const metrics = useMemo(() => deriveMetrics(history), [history]);
  const frontier = useMemo(() => deriveFrontier(history.sessions), [history.sessions]);
  const upsolveQueue = useMemo(
    () => deriveUpsolveQueue(history.sessions),
    [history.sessions],
  );
  const growth = useMemo(() => deriveGrowth(history.sessions), [history.sessions]);
  const filteredSessions = history.sessions.filter(
    (session) => filter === "all" || session.type === filter,
  );
  const selected = history.sessions.find((session) => session.sessionId === selectedId)
    ?? filteredSessions[0];

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-zinc-950">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-5 px-4 lg:px-8">
          <div className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center bg-zinc-950 text-xs text-white">PS</span>
            <span>Matchlog</span>
          </div>
          <div className="relative ml-auto w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              aria-label="Handle search"
              className="h-9 border-zinc-200 bg-zinc-50 pl-9 shadow-none"
              defaultValue={history.user}
              readOnly
            />
          </div>
          <Badge variant="outline" className="hidden rounded-sm md:inline-flex">AtCoder</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8">
        <section className="border-b border-zinc-300 pb-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 rounded-md border bg-white">
                <AvatarFallback className="rounded-md bg-zinc-900 text-lg font-semibold text-white">
                  SP
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{history.user}</h1>
                  <Badge className="rounded-sm bg-zinc-900">AtCoder</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {history.summary.actualSessions} actual · {history.summary.virtualSessions} virtual · {history.summary.practiceSessions} practice
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
              {[
                ["Rating", metrics.currentRating],
                ["Peak", metrics.peakRating],
                ["Recent perf.", metrics.recentPerformance ?? "—"],
                ["Sessions", history.summary.sessions],
              ].map(([label, value]) => (
                <div key={label} className="min-w-24">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 bg-white ring-1 ring-zinc-200">
            <div className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Recent contests</h2>
                <p className="text-xs text-zinc-500">Actual, virtual, and practice in one timeline</p>
              </div>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="h-8 rounded-sm bg-zinc-100 p-0.5">
                  {[["all", "All"], ["actual", "Actual"], ["virtual", "Virtual"], ["practice", "Practice"]].map(([value, label]) => (
                    <TabsTrigger key={value} value={value} className="h-7 rounded-sm px-3 text-xs">
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Contest</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Solved</TableHead>
                  <TableHead>Problems</TableHead>
                  <TableHead className="text-right">Top diff.</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="pr-4 text-right">Last AC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.slice(0, 16).map((session) => {
                  const isSelected = selected?.sessionId === session.sessionId;
                  const lastAcElapsed = session.metrics.lastAcEpochSecond
                    ? session.metrics.lastAcEpochSecond - Math.floor(new Date(session.startAt).getTime() / 1000)
                    : null;
                  return (
                    <TableRow
                      key={session.sessionId}
                      aria-selected={isSelected}
                      className="cursor-pointer aria-selected:bg-zinc-100"
                      onClick={() => setSelectedId(session.sessionId)}
                    >
                      <TableCell className="pl-4">
                        <p className="font-semibold">{session.contestId.toUpperCase()}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{formatDate(session.startAt)}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-sm capitalize ${typeStyles[session.type]}`}>
                          {session.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-semibold tabular-nums">
                        {session.metrics.solved}/{session.problems.length}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {session.problems.map((problem) => (
                            <span
                              key={problem.problemId}
                              title={`${problem.index} · ${problem.difficulty ?? "?"}`}
                              className={`grid size-5 place-items-center rounded-[3px] text-[10px] font-semibold ${
                                problem.solved
                                  ? `${difficultyColors[problem.difficultyColor ?? "gray"] ?? "bg-zinc-400"} text-white`
                                  : problem.attempted
                                    ? "border border-red-300 bg-red-50 text-red-700"
                                    : "border border-zinc-200 bg-white text-zinc-400"
                              }`}
                            >
                              {problem.index}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {session.metrics.highestSolvedDifficulty ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-red-600">
                        {session.metrics.failedSubmissions || "—"}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-mono tabular-nums">
                        {formatDuration(lastAcElapsed)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>

          <aside className="space-y-7">
            <section className="bg-white p-5 ring-1 ring-zinc-200">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Training frontier</h2>
                <span className="text-[11px] text-zinc-400">last 24 contests</span>
              </div>
              <div className="mt-5 space-y-4">
                {frontier.map((item) => (
                  <div key={item.floor}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold">{item.floor}–{item.floor + 399}</span>
                      <span className="text-zinc-500">{item.rate}% · {item.label}</span>
                    </div>
                    <Progress value={item.rate} className="h-1.5 rounded-none bg-zinc-100" />
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white p-5 ring-1 ring-zinc-200">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Next upsolve</h2>
                <span className="text-[11px] text-zinc-400">nearest unsolved</span>
              </div>
              <div className="mt-4 divide-y">
                {upsolveQueue.map((problem) => (
                  <div key={problem.problemId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`size-2 ${difficultyColors[problem.difficultyColor ?? "gray"] ?? "bg-zinc-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{problem.contestId.toUpperCase()} {problem.index}</p>
                      <p className="font-mono text-xs text-zinc-500">{problem.difficulty ?? "?"}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-zinc-400" />
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-3 border border-zinc-200 bg-white">
              {[
                ["Median", formatDuration(metrics.medianSolveTime)],
                ["First AC", `${metrics.firstTryRate}%`],
                ["Fail / AC", metrics.failuresPerAc],
              ].map(([label, value], index) => (
                <div key={label} className={`p-3 ${index ? "border-l" : ""}`}>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
                </div>
              ))}
            </section>
          </aside>
        </div>

        {selected && (
          <section className="mt-7 bg-white ring-1 ring-zinc-200">
            <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Selected session</p>
                <h2 className="mt-1 text-lg font-semibold">
                  {selected.contestId.toUpperCase()} · <span className="capitalize">{selected.type}</span>
                </h2>
              </div>
              <p className="font-mono text-sm text-zinc-500">
                {selected.metrics.solved}/{selected.problems.length} solved · {selected.metrics.failedSubmissions} failed
              </p>
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-x-auto p-5">
                <div className="relative flex min-w-[680px] items-start justify-between pt-4">
                  <div className="absolute left-5 right-5 top-[27px] h-px bg-zinc-200" />
                  {selected.problems.map((problem) => (
                    <div key={problem.problemId} className="relative z-10 flex w-20 flex-col items-center text-center">
                      <span className={`grid size-7 place-items-center rounded-full border-4 border-white text-[11px] font-semibold ${
                        problem.solved
                          ? `${difficultyColors[problem.difficultyColor ?? "gray"] ?? "bg-zinc-400"} text-white`
                          : problem.attempted
                            ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                            : "bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200"
                      }`}>
                        {problem.index}
                      </span>
                      <span className="mt-2 font-mono text-xs font-medium">{formatDuration(firstAcElapsed(problem))}</span>
                      <span className="mt-0.5 font-mono text-[10px] text-zinc-400">{problem.difficulty ?? "?"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t bg-zinc-50 p-5 lg:border-l lg:border-t-0">
                <p className="text-xs font-medium text-zinc-500">Submission summary</p>
                <div className="mt-3 space-y-2.5">
                  {selected.problems.filter((problem) => problem.attempted).map((problem) => (
                    <div key={problem.problemId} className="flex items-start gap-2 text-xs">
                      <span className="font-mono font-semibold">{problem.index}</span>
                      <span className="font-mono text-zinc-600">
                        {problem.submissions.map((submission) => submission.result).join(" → ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-7 bg-white ring-1 ring-zinc-200">
          <div className="flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">Growth preview</p>
              <h2 className="mt-1 text-lg font-semibold">Contest frontier over time</h2>
            </div>
            <p className="text-xs text-zinc-500">Highest difficulty solved · actual + virtual</p>
          </div>
          <div className="grid gap-0 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
            {growth.slice(-10).map((item) => (
              <div key={`${item.contest}-${item.date}`} className="border-b p-3 sm:border-r lg:nth-[5n]:border-r-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold">{item.contest}</span>
                  <span className="font-mono text-[10px] text-zinc-400">{item.date}</span>
                </div>
                <p className="mt-3 font-mono text-lg font-semibold tabular-nums">{item.highest}</p>
                <Progress
                  value={Math.min(100, (item.highest / 2200) * 100)}
                  className="mt-2 h-1 rounded-none bg-zinc-100"
                />
                <p className="mt-2 text-[10px] text-zinc-500">{item.solved} solved</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
