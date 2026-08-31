import type { History, Problem, Session, Submission } from "@/components/ps-types"

type CfResponse<T> = { status: "OK"; result: T } | { status: "FAILED"; comment?: string }
type CfUser = { handle: string; rating?: number; maxRating?: number }
type CfRating = {
  contestId: number
  contestName: string
  rank: number
  ratingUpdateTimeSeconds: number
  oldRating: number
  newRating: number
}
type CfProblem = {
  contestId?: number
  index: string
  name: string
  rating?: number
  tags?: string[]
}
type CfContest = {
  id: number
  name: string
  startTimeSeconds?: number
  durationSeconds: number
}
type CfSubmission = {
  id: number
  contestId?: number
  creationTimeSeconds: number
  relativeTimeSeconds: number
  problem: CfProblem
  author: {
    participantType: "CONTESTANT" | "PRACTICE" | "VIRTUAL" | "MANAGER" | "OUT_OF_COMPETITION"
    startTimeSeconds?: number
  }
  programmingLanguage?: string
  verdict?: string
}

let requestQueue: Promise<void> = Promise.resolve()
let nextAllowedAt = 0
let catalogCache: {
  expiresAt: number
  problems: CfProblem[]
  contests: CfContest[]
} | null = null

async function codeforcesRequest<T>(method: string, params: Record<string, string>) {
  const task = requestQueue.then(async () => {
    const wait = Math.max(0, nextAllowedAt - Date.now())
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    const url = new URL(`https://codeforces.com/api/${method}`)
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    const response = await fetch(url, {
      headers: { "User-Agent": "PS-Matchlog/1.0" },
    })
    nextAllowedAt = Date.now() + 2100
    if (!response.ok) throw new Error(`Codeforces returned HTTP ${response.status}.`)
    const payload = await response.json() as CfResponse<T>
    if (payload.status !== "OK") throw new Error(payload.comment || "Codeforces API request failed.")
    return payload.result
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}

async function getCatalog() {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache
  const problemset = await codeforcesRequest<{ problems: CfProblem[] }>("problemset.problems", {})
  const contests = await codeforcesRequest<CfContest[]>("contest.list", { gym: "false" })
  catalogCache = {
    expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    problems: problemset.problems,
    contests,
  }
  return catalogCache
}

function problemColor(rating?: number) {
  if (rating == null) return null
  if (rating < 1200) return "gray"
  if (rating < 1400) return "green"
  if (rating < 1600) return "cyan"
  if (rating < 1900) return "blue"
  if (rating < 2100) return "violet"
  if (rating < 2400) return "orange"
  return "red"
}

function buildHistory(
  user: CfUser,
  ratings: CfRating[],
  submissions: CfSubmission[],
  catalog: { problems: CfProblem[]; contests: CfContest[] }
): History {
  const contestMap = new Map(catalog.contests.map((contest) => [contest.id, contest]))
  const problemsByContest = new Map<number, CfProblem[]>()
  for (const problem of catalog.problems) {
    if (problem.contestId == null) continue
    const items = problemsByContest.get(problem.contestId) ?? []
    items.push(problem)
    problemsByContest.set(problem.contestId, items)
  }
  const ratingMap = new Map(ratings.map((rating) => [rating.contestId, rating]))
  const grouped = new Map<string, { type: "actual" | "virtual"; contestId: number; start: number; submissions: CfSubmission[] }>()

  for (const submission of submissions) {
    const contestId = submission.contestId ?? submission.problem.contestId
    const participantType = submission.author.participantType
    if (contestId == null || (participantType !== "CONTESTANT" && participantType !== "VIRTUAL")) continue
    const type = participantType === "VIRTUAL" ? "virtual" : "actual"
    const contest = contestMap.get(contestId)
    const start = submission.author.startTimeSeconds
      ?? (type === "actual" ? contest?.startTimeSeconds : undefined)
      ?? submission.creationTimeSeconds - submission.relativeTimeSeconds
    const key = `${contestId}:${type}:${start}`
    const group = grouped.get(key) ?? { type, contestId, start, submissions: [] }
    group.submissions.push(submission)
    grouped.set(key, group)
  }

  const sessions: Session[] = [...grouped.values()].map((group) => {
    const submittedByProblem = new Map<string, CfSubmission[]>()
    for (const submission of group.submissions) {
      const key = submission.problem.index
      const items = submittedByProblem.get(key) ?? []
      items.push(submission)
      submittedByProblem.set(key, items)
    }
    const catalogProblems = problemsByContest.get(group.contestId)
      ?? [...new Map(group.submissions.map((item) => [item.problem.index, item.problem])).values()]
    const problems: Problem[] = [...catalogProblems]
      .sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true }))
      .map((cfProblem) => {
        const cfSubmissions = (submittedByProblem.get(cfProblem.index) ?? [])
          .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds)
        const mappedSubmissions: Submission[] = cfSubmissions.map((submission) => ({
          id: submission.id,
          result: submission.verdict ?? "TESTING",
          epoch_second: submission.creationTimeSeconds,
          language: submission.programmingLanguage,
          contestClock: {
            elapsedSecond: submission.creationTimeSeconds - group.start,
            insideSession: true,
          },
        }))
        return {
          problemId: `${group.contestId}_${cfProblem.index}`,
          index: cfProblem.index,
          title: cfProblem.name,
          difficulty: cfProblem.rating ?? null,
          difficultyColor: problemColor(cfProblem.rating),
          attempted: mappedSubmissions.length > 0,
          solved: mappedSubmissions.some((submission) => submission.result === "OK"),
          submissions: mappedSubmissions,
        }
      })
    const accepted = group.submissions.filter((submission) => submission.verdict === "OK")
    const solvedDifficulties = problems
      .filter((problem) => problem.solved && problem.difficulty != null)
      .map((problem) => problem.difficulty as number)
    const contest = contestMap.get(group.contestId)
    return {
      sessionId: `cf:${group.contestId}:${group.type}:${group.start}`,
      type: group.type,
      contestId: String(group.contestId),
      contestTitle: ratingMap.get(group.contestId)?.contestName ?? contest?.name ?? `Codeforces Contest ${group.contestId}`,
      startAt: new Date(group.start * 1000).toISOString(),
      sourceUrl: `https://codeforces.com/contest/${group.contestId}`,
      metrics: {
        solved: problems.filter((problem) => problem.solved).length,
        attempted: problems.filter((problem) => problem.attempted).length,
        failedSubmissions: group.submissions.filter((submission) => submission.verdict !== "OK").length,
        submissionCount: group.submissions.length,
        highestSolvedDifficulty: solvedDifficulties.length ? Math.max(...solvedDifficulties) : null,
        lastAcEpochSecond: accepted.length ? Math.max(...accepted.map((submission) => submission.creationTimeSeconds)) : null,
      },
      problems,
    }
  }).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  const actualSessions = sessions.filter((session) => session.type === "actual").length
  const virtualSessions = sessions.filter((session) => session.type === "virtual").length
  const practiceSessions = new Set(
    submissions
      .filter((submission) => submission.author.participantType === "PRACTICE")
      .map((submission) => submission.contestId ?? submission.problem.contestId)
      .filter((contestId): contestId is number => contestId != null)
  ).size

  return {
    user: user.handle,
    summary: {
      sessions: sessions.length + practiceSessions,
      actualSessions,
      virtualSessions,
      practiceSessions,
      submissions: submissions.length,
    },
    sessions,
    raw: {
      actualHistory: ratings.map((rating) => ({
        contestId: String(rating.contestId),
        title: rating.contestName,
        dateText: new Date(
          (contestMap.get(rating.contestId)?.startTimeSeconds ?? rating.ratingUpdateTimeSeconds) * 1000
        ).toISOString(),
        rank: rating.rank,
        performance: null,
        newRating: rating.newRating,
        ratingDiff: rating.newRating - rating.oldRating,
      })),
    },
  }
}

export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get("handle")?.trim()
  if (!handle || handle.length > 64) {
    return Response.json({ error: "Enter a valid Codeforces handle." }, { status: 400 })
  }
  try {
    const users = await codeforcesRequest<CfUser[]>("user.info", { handles: handle })
    const user = users[0]
    if (!user) throw new Error("Codeforces handle not found.")
    const ratings = await codeforcesRequest<CfRating[]>("user.rating", { handle: user.handle })
    const submissions = await codeforcesRequest<CfSubmission[]>("user.status", {
      handle: user.handle,
      from: "1",
      count: "10000",
    })
    const catalog = await getCatalog()
    return Response.json(
      { history: buildHistory(user, ratings, submissions, catalog) },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
    )
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Could not load Codeforces data." },
      { status: 502 }
    )
  }
}
