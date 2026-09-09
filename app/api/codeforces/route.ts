import type { History, Problem, Session, Submission } from "@/components/ps-types"
import { buildUpsolveQueue } from "@/lib/upsolve"

type CfResponse<T> = { status: "OK"; result: T } | { status: "FAILED"; comment?: string }
type CfUser = { handle: string; rating?: number; maxRating?: number; avatar?: string; titlePhoto?: string }
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
    members?: Array<{ handle: string }>
  }
  programmingLanguage?: string
  verdict?: string
}

let requestQueue: Promise<void> = Promise.resolve()
let nextAllowedAt = 0
let catalogCache: {
  fetchedAt: number
  expiresAt: number
  problems: CfProblem[]
  contests: CfContest[]
} | null = null
let ratedUsersCache: { expiresAt: number; users: CfUser[] } | null = null
let gymCache: { expiresAt: number; contests: CfContest[] } | null = null
let gymPromise: Promise<CfContest[]> | null = null
let catalogPromise: Promise<{
  fetchedAt: number
  expiresAt: number
  problems: CfProblem[]
  contests: CfContest[]
}> | null = null
let ratedUsersPromise: Promise<{ expiresAt: number; users: CfUser[] }> | null = null

async function codeforcesRequest<T>(method: string, params: Record<string, string>) {
  const task = requestQueue.then(async () => {
    const wait = Math.max(0, nextAllowedAt - Date.now())
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    const url = new URL(`https://codeforces.com/api/${method}`)
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
    const response = await fetch(url, {
      headers: { "User-Agent": "PS-Matchlog/1.0" },
      signal: AbortSignal.timeout(15_000),
    })
    nextAllowedAt = Date.now() + 2100
    const payload = await response.json().catch(() => null) as CfResponse<T> | null
    if (!payload || payload.status !== "OK") {
      const comment = payload?.status === "FAILED" ? payload.comment : undefined
      if (comment && /user with handle .* not found/i.test(comment)) {
        throw new Error("User not found.")
      }
      throw new Error(comment || `Codeforces returned HTTP ${response.status}.`)
    }
    return payload.result
  })
  requestQueue = task.then(() => undefined, () => undefined)
  return task
}

async function getCatalog(forceRefresh = false) {
  if (!forceRefresh && catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache
  if (forceRefresh) catalogCache = null
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const problemset = await codeforcesRequest<{ problems: CfProblem[] }>("problemset.problems", {})
      const contests = await codeforcesRequest<CfContest[]>("contest.list", { gym: "false" })
      const fetchedAt = Date.now()
      return {
        fetchedAt,
        expiresAt: fetchedAt + 6 * 60 * 60 * 1000,
        problems: problemset.problems,
        contests,
      }
    })()
  }
  const pendingCatalog = catalogPromise
  try {
    catalogCache = await pendingCatalog
    return catalogCache
  } finally {
    if (catalogPromise === pendingCatalog) catalogPromise = null
  }
}

function catalogPredatesFinishedContest(
  catalog: { fetchedAt: number; contests: CfContest[] },
  contestIds: Set<number>
) {
  const now = Date.now()
  return catalog.contests.some((contest) => {
    if (!contestIds.has(contest.id) || contest.startTimeSeconds == null) return false
    const contestEndAt = (contest.startTimeSeconds + contest.durationSeconds) * 1000
    return catalog.fetchedAt < contestEndAt && contestEndAt <= now
  })
}

async function getRandomUser() {
  if (!ratedUsersCache || ratedUsersCache.expiresAt <= Date.now()) {
    if (!ratedUsersPromise) {
      ratedUsersPromise = (async () => ({
        expiresAt: Date.now() + 60 * 60 * 1000,
        users: await codeforcesRequest<CfUser[]>("user.ratedList", {
          activeOnly: "true",
          includeRetired: "false",
        }),
      }))()
    }
    const pendingUsers = ratedUsersPromise
    try {
      ratedUsersCache = await pendingUsers
    } finally {
      if (ratedUsersPromise === pendingUsers) ratedUsersPromise = null
    }
  }
  const candidates = ratedUsersCache.users.filter((user) => user.handle && user.rating != null)
  if (!candidates.length) throw new Error("No active Codeforces users are available right now.")
  return candidates[Math.floor(Math.random() * candidates.length)]
}

async function getGymContests() {
  if (gymCache && gymCache.expiresAt > Date.now()) return gymCache.contests
  if (!gymPromise) {
    gymPromise = codeforcesRequest<CfContest[]>("contest.list", { gym: "true" })
      .then((contests) => {
        gymCache = { contests, expiresAt: Date.now() + 6 * 60 * 60 * 1000 }
        return contests
      })
      .finally(() => { gymPromise = null })
  }
  return gymPromise
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
          tags: cfProblem.tags ?? [],
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
      durationSecond: contest?.durationSeconds ?? null,
      sourceUrl: `https://codeforces.com/${group.contestId >= 100000 ? "gym" : "contest"}/${group.contestId}`,
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

  const history: History = {
    user: user.handle,
    avatarUrl: (user.avatar || user.titlePhoto || "").replace(/^http:\/\//, "https://") || null,
    avatarFallbackUrl: (user.titlePhoto || "").replace(/^http:\/\//, "https://") || null,
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
  history.upsolves = buildUpsolveQueue(
    history,
    "Codeforces",
    submissions
      .filter((submission) => submission.verdict === "OK")
      .map((submission) => ({
        problemId: `${submission.contestId ?? submission.problem.contestId}_${submission.problem.index}`,
        epochSecond: submission.creationTimeSeconds,
      }))
  )
  return history
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const handle = searchParams.get("handle")?.trim()
  const wantsProfile = searchParams.get("profile") === "1"
  const wantsRandom = searchParams.get("random") === "1"
  const wantsRandomHandle = searchParams.get("randomHandle") === "1"
  const wantsWarmup = searchParams.get("warm") === "1"
  if (wantsWarmup) {
    try {
      await Promise.all([getCatalog(), getRandomUser()])
      return Response.json({ ready: true }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      return Response.json({ ready: false }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }
  }
  if ((!handle && !wantsRandom && !wantsRandomHandle) || (handle?.length ?? 0) > 64) {
    return Response.json({ error: "Enter a valid Codeforces handle." }, { status: 400 })
  }
  try {
    if (wantsRandomHandle) {
      const user = await getRandomUser()
      return Response.json(
        { handle: user.handle },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    if (wantsProfile && handle) {
      const user = (await codeforcesRequest<CfUser[]>("user.info", { handles: handle }))[0]
      if (!user) throw new Error("Codeforces handle not found.")
      return Response.json({
        profile: {
          handle: user.handle,
          avatarUrl: (user.avatar || user.titlePhoto || "").replace(/^http:\/\//, "https://") || null,
          avatarFallbackUrl: (user.titlePhoto || "").replace(/^http:\/\//, "https://") || null,
        },
      }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400" } })
    }

    const requestedUser = wantsRandom ? await getRandomUser() : { handle: handle! }
    const submissions = await codeforcesRequest<CfSubmission[]>("user.status", {
      handle: requestedUser.handle,
      from: "1",
      count: "10000",
    })
    const canonicalHandle = submissions[0]?.author.members?.[0]?.handle ?? requestedUser.handle
    const ratings = await codeforcesRequest<CfRating[]>("user.rating", { handle: canonicalHandle })
    const user: CfUser = {
      handle: canonicalHandle,
      rating: ratings.at(-1)?.newRating,
      maxRating: ratings.length ? Math.max(...ratings.map((rating) => rating.newRating)) : undefined,
    }
    let catalog = await getCatalog()
    const submissionContestIds = new Set(
      submissions
        .map((submission) => submission.contestId ?? submission.problem.contestId)
        .filter((contestId): contestId is number => contestId != null && contestId < 100000)
    )
    if (catalogPredatesFinishedContest(catalog, submissionContestIds)) {
      catalog = await getCatalog(true)
    }
    const hasGym = submissions.some((submission) =>
      (submission.contestId ?? submission.problem.contestId ?? 0) >= 100000
    )
    const gyms = hasGym ? await getGymContests().catch(() => []) : []
    return Response.json(
      { history: buildHistory(user, ratings, submissions, {
        ...catalog,
        contests: [...catalog.contests, ...gyms],
      }) },
      { headers: { "Cache-Control": wantsRandom ? "no-store" : "public, max-age=60, s-maxage=300" } }
    )
  } catch (cause) {
    const timedOut = cause instanceof Error && (
      cause.name === "TimeoutError" || cause.name === "AbortError"
    )
    const notFound = cause instanceof Error && cause.message === "User not found."
    return Response.json(
      {
        error: timedOut
          ? "Codeforces took too long to respond. Please try again."
          : cause instanceof Error
            ? cause.message
            : "Could not load Codeforces data.",
      },
      { status: notFound ? 404 : timedOut ? 504 : 502 }
    )
  }
}
