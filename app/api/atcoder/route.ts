import type { History, Problem, Session, Submission } from "@/components/ps-types"
import { buildUpsolveQueue } from "@/lib/upsolve"

type AtSubmission = {
  id: number
  epoch_second: number
  problem_id: string
  contest_id: string
  user_id: string
  language?: string
  result: string
}

type AtContest = {
  id: string
  start_epoch_second: number
  duration_second: number
  title: string
}

type AtProblem = {
  id: string
  contest_id: string
  problem_index: string
  name: string
  title: string
}

type AtContestProblem = {
  contest_id: string
  problem_id: string
  problem_index: string
}

type AtProblemModel = {
  difficulty?: number
}

type AtHistoryItem = {
  IsRated: boolean
  Place: number
  OldRating: number
  NewRating: number
  Performance: number
  ContestScreenName: string
  ContestName: string
  ContestNameEn: string
  EndTime: string
}

type Catalog = {
  expiresAt: number
  contests: AtContest[]
  problems: AtProblem[]
  contestProblems: AtContestProblem[]
  models: Record<string, AtProblemModel>
}

const CUTOFF_SECOND = 1_714_219_200
const PAGE_LIMIT = 20
const REQUEST_GAP_MS = 1_100

let requestQueue: Promise<void> = Promise.resolve()
let nextAllowedAt = 0
let catalogCache: Catalog | null = null
let catalogPromise: Promise<Catalog> | null = null
const playerCache = new Map<string, { expiresAt: number; history: History }>()

async function rateLimitedJson<T>(url: string) {
  const task = requestQueue.then(async () => {
    const wait = Math.max(0, nextAllowedAt - Date.now())
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    const response = await fetch(url, {
      headers: { "User-Agent": "PS-Matchlog/1.0" },
    })
    nextAllowedAt = Date.now() + REQUEST_GAP_MS
    if (!response.ok) throw new Error(`AtCoder data source returned HTTP ${response.status}.`)
    return response.json() as Promise<T>
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}

async function getCatalog() {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const [contests, problems, contestProblems, models] = await Promise.all([
        rateLimitedJson<AtContest[]>("https://kenkoooo.com/atcoder/resources/contests.json"),
        rateLimitedJson<AtProblem[]>("https://kenkoooo.com/atcoder/resources/problems.json"),
        rateLimitedJson<AtContestProblem[]>(
          "https://kenkoooo.com/atcoder/resources/contest-problem.json"
        ),
        rateLimitedJson<Record<string, AtProblemModel>>(
          "https://kenkoooo.com/atcoder/resources/problem-models.json"
        ),
      ])
      return {
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
        contests,
        problems,
        contestProblems,
        models,
      }
    })()
  }
  const pending = catalogPromise
  try {
    catalogCache = await pending
    return catalogCache
  } finally {
    if (catalogPromise === pending) catalogPromise = null
  }
}

async function getUserHistory(handle: string) {
  const response = await fetch(
    `https://atcoder.jp/users/${encodeURIComponent(handle)}/history/json`,
    { headers: { "User-Agent": "PS-Matchlog/1.0" } }
  )
  if (response.status === 404) throw new Error("AtCoder user not found.")
  if (!response.ok) throw new Error(`AtCoder returned HTTP ${response.status}.`)
  return response.json() as Promise<AtHistoryItem[]>
}

async function getSubmissions(handle: string) {
  const submissions: AtSubmission[] = []
  let fromSecond = CUTOFF_SECOND

  for (let page = 0; page < PAGE_LIMIT; page += 1) {
    const url = new URL("https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions")
    url.searchParams.set("user", handle)
    url.searchParams.set("from_second", String(fromSecond))
    const batch = await rateLimitedJson<AtSubmission[]>(url.toString())
    submissions.push(...batch)
    if (batch.length < 500) break
    fromSecond = Math.max(...batch.map((item) => item.epoch_second)) + 1
  }

  return submissions
}

async function getRandomHandle() {
  const recent = await rateLimitedJson<AtSubmission[]>(
    "https://kenkoooo.com/atcoder/atcoder-api/v3/recent"
  )
  const users = [...new Set(recent.map((item) => item.user_id).filter(Boolean))]
  if (!users.length) throw new Error("No recent AtCoder users are available right now.")
  return users[Math.floor(Math.random() * users.length)]
}

function contestIdOf(item: AtHistoryItem) {
  return item.ContestScreenName.split(".")[0]
}

function clippedDifficulty(raw?: number) {
  if (raw == null) return null
  return Math.round(raw < 400 ? 400 / Math.exp((400 - raw) / 400) : raw)
}

function difficultyColor(difficulty: number | null) {
  if (difficulty == null) return null
  if (difficulty < 400) return "gray"
  if (difficulty < 800) return "brown"
  if (difficulty < 1200) return "green"
  if (difficulty < 1600) return "cyan"
  if (difficulty < 2000) return "blue"
  if (difficulty < 2400) return "yellow"
  if (difficulty < 2800) return "orange"
  return "red"
}

function buildSession(
  type: "actual" | "virtual",
  contest: AtContest,
  contestProblems: AtProblem[],
  models: Record<string, AtProblemModel>,
  submissions: AtSubmission[],
  start: number
): Session {
  const submissionsByProblem = new Map<string, AtSubmission[]>()
  for (const submission of submissions) {
    const items = submissionsByProblem.get(submission.problem_id) ?? []
    items.push(submission)
    submissionsByProblem.set(submission.problem_id, items)
  }

  const problems: Problem[] = contestProblems
    .toSorted((a, b) =>
      a.problem_index.localeCompare(b.problem_index, undefined, { numeric: true })
    )
    .map((problem) => {
      const problemSubmissions = (submissionsByProblem.get(problem.id) ?? [])
        .toSorted((a, b) => a.epoch_second - b.epoch_second)
      const mapped: Submission[] = problemSubmissions.map((submission) => ({
        id: submission.id,
        result: submission.result,
        epoch_second: submission.epoch_second,
        language: submission.language,
        contestClock: {
          elapsedSecond: Math.max(0, submission.epoch_second - start),
          insideSession: true,
        },
      }))
      const difficulty = clippedDifficulty(models[problem.id]?.difficulty)
      return {
        problemId: problem.id,
        index: problem.problem_index,
        title: problem.title || problem.name,
        difficulty,
        difficultyColor: difficultyColor(difficulty),
        attempted: mapped.length > 0,
        solved: mapped.some((submission) => submission.result === "AC"),
        submissions: mapped,
      }
    })

  const accepted = submissions.filter((submission) => submission.result === "AC")
  const solvedDifficulties = problems
    .filter((problem) => problem.solved && problem.difficulty != null)
    .map((problem) => problem.difficulty as number)

  return {
    sessionId: `at:${contest.id}:${type}:${start}`,
    type,
    contestId: contest.id,
    contestTitle: contest.title,
    startAt: new Date(start * 1000).toISOString(),
    sourceUrl: `https://atcoder.jp/contests/${contest.id}/standings${
      type === "virtual" ? "/virtual" : ""
    }`,
    metrics: {
      solved: problems.filter((problem) => problem.solved).length,
      attempted: problems.filter((problem) => problem.attempted).length,
      failedSubmissions: submissions.filter((submission) => submission.result !== "AC").length,
      submissionCount: submissions.length,
      highestSolvedDifficulty: solvedDifficulties.length
        ? Math.max(...solvedDifficulties)
        : null,
      lastAcEpochSecond: accepted.length
        ? Math.max(...accepted.map((submission) => submission.epoch_second))
        : null,
    },
    problems,
  }
}

function inferVirtualClusters(submissions: AtSubmission[], contest: AtContest) {
  const ordered = submissions.toSorted((a, b) => a.epoch_second - b.epoch_second)
  const clusters: AtSubmission[][] = []
  let current: AtSubmission[] = []

  for (const submission of ordered) {
    const first = current[0]
    const previous = current.at(-1)
    const breaksSession =
      first && previous &&
      (submission.epoch_second - previous.epoch_second > 3_600 ||
        submission.epoch_second - first.epoch_second > contest.duration_second + 1_800)
    if (breaksSession) {
      clusters.push(current)
      current = []
    }
    current.push(submission)
  }
  if (current.length) clusters.push(current)

  return clusters.filter((cluster) => {
    const problemCount = new Set(cluster.map((item) => item.problem_id)).size
    const span = cluster.at(-1)!.epoch_second - cluster[0].epoch_second
    return problemCount >= 3 || (problemCount >= 2 && cluster.length >= 4 && span >= 600)
  })
}

function buildHistory(
  handle: string,
  ratingHistory: AtHistoryItem[],
  submissions: AtSubmission[],
  catalog: Catalog
): History {
  const contestMap = new Map(catalog.contests.map((contest) => [contest.id, contest]))
  const problemMap = new Map(catalog.problems.map((problem) => [problem.id, problem]))
  const problemsByContest = new Map<string, AtProblem[]>()
  for (const relation of catalog.contestProblems) {
    const source = problemMap.get(relation.problem_id)
    const problem: AtProblem = {
      id: relation.problem_id,
      contest_id: relation.contest_id,
      problem_index: relation.problem_index,
      name: source?.name ?? relation.problem_id,
      title: source?.title ?? `${relation.problem_index}. ${relation.problem_id}`,
    }
    const items = problemsByContest.get(relation.contest_id) ?? []
    items.push(problem)
    problemsByContest.set(relation.contest_id, items)
  }

  const eligibleHistory = ratingHistory.filter(
    (item) => new Date(item.EndTime).getTime() / 1000 >= CUTOFF_SECOND
  )
  const actualSubmissionIds = new Set<number>()
  const actualSessions: Session[] = eligibleHistory.flatMap((item) => {
    const contestId = contestIdOf(item)
    const catalogContest = contestMap.get(contestId)
    const end = Math.floor(new Date(item.EndTime).getTime() / 1000)
    const contest: AtContest = catalogContest ?? {
      id: contestId,
      title: item.ContestNameEn || item.ContestName || contestId.toUpperCase(),
      start_epoch_second: end - 7_200,
      duration_second: 7_200,
    }
    const start = contest.start_epoch_second
    const sessionSubmissions = submissions.filter(
      (submission) =>
        submission.contest_id === contestId &&
        submission.epoch_second >= start &&
        submission.epoch_second <= end
    )
    sessionSubmissions.forEach((submission) => actualSubmissionIds.add(submission.id))
    return [
      buildSession(
        "actual",
        { ...contest, title: item.ContestNameEn || item.ContestName || contest.title },
        problemsByContest.get(contestId) ?? [],
        catalog.models,
        sessionSubmissions,
        start
      ),
    ]
  })

  const remaining = submissions.filter((submission) => !actualSubmissionIds.has(submission.id))
  const remainingByContest = new Map<string, AtSubmission[]>()
  for (const submission of remaining) {
    const items = remainingByContest.get(submission.contest_id) ?? []
    items.push(submission)
    remainingByContest.set(submission.contest_id, items)
  }

  const virtualSubmissionIds = new Set<number>()
  const virtualSessions: Session[] = []
  for (const [contestId, contestSubmissions] of remainingByContest) {
    const contest = contestMap.get(contestId)
    if (!contest) continue
    for (const cluster of inferVirtualClusters(contestSubmissions, contest)) {
      cluster.forEach((submission) => virtualSubmissionIds.add(submission.id))
      const start = Math.floor(cluster[0].epoch_second / 300) * 300
      virtualSessions.push(
        buildSession(
          "virtual",
          contest,
          problemsByContest.get(contestId) ?? [],
          catalog.models,
          cluster,
          start
        )
      )
    }
  }

  const practiceSessions = new Set(
    remaining
      .filter((submission) => !virtualSubmissionIds.has(submission.id))
      .map((submission) => submission.contest_id)
  ).size
  const sessions = [...actualSessions, ...virtualSessions].toSorted(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  )

  const history: History = {
    user: handle,
    summary: {
      sessions: sessions.length + practiceSessions,
      actualSessions: actualSessions.length,
      virtualSessions: virtualSessions.length,
      practiceSessions,
      submissions: submissions.length,
    },
    sessions,
    raw: {
      actualHistory: eligibleHistory.map((item) => ({
        contestId: contestIdOf(item),
        title: item.ContestNameEn || item.ContestName,
        dateText: item.EndTime,
        rank: item.Place,
        performance: item.IsRated ? item.Performance : null,
        newRating: item.IsRated ? item.NewRating : null,
        ratingDiff: item.IsRated ? item.NewRating - item.OldRating : null,
      })),
    },
  }
  history.upsolves = buildUpsolveQueue(
    history,
    "AtCoder",
    submissions
      .filter((submission) => submission.result === "AC")
      .map((submission) => ({
        problemId: submission.problem_id,
        epochSecond: submission.epoch_second,
      }))
  )
  return history
}

async function loadPlayer(handle: string) {
  const key = handle.toLowerCase()
  const cached = playerCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.history

  const [ratingHistory, submissions, catalog] = await Promise.all([
    getUserHistory(handle),
    getSubmissions(handle),
    getCatalog(),
  ])
  const canonicalHandle = submissions[0]?.user_id ?? handle
  const history = buildHistory(canonicalHandle, ratingHistory, submissions, catalog)
  playerCache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, history })
  return history
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const enteredHandle = searchParams.get("handle")?.trim()
  const wantsRandom = searchParams.get("random") === "1"
  const wantsWarmup = searchParams.get("warm") === "1"

  if (wantsWarmup) {
    try {
      await getCatalog()
      return Response.json({ ready: true }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      return Response.json({ ready: false }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }
  }
  if ((!enteredHandle && !wantsRandom) || (enteredHandle?.length ?? 0) > 64) {
    return Response.json({ error: "Enter a valid AtCoder username." }, { status: 400 })
  }

  try {
    const handle = wantsRandom ? await getRandomHandle() : enteredHandle!
    const history = await loadPlayer(handle)
    return Response.json(
      { history },
      { headers: { "Cache-Control": wantsRandom ? "no-store" : "public, max-age=60, s-maxage=300" } }
    )
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Could not load AtCoder data." },
      { status: 502 }
    )
  }
}
