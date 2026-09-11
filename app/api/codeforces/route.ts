import type { History, Problem, Session, Submission } from "@/components/ps-types"
import { buildUpsolveQueue } from "@/lib/upsolve"
import backfilledContestCatalog from "@/app/data/codeforces-contest-problems.json"
import randomHandleCatalog from "@/app/data/codeforces-random-handles.json"

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

type BackfilledContest = { problems: Array<CfProblem & { standingsRating?: number | null }> }
type BackfilledCatalog = {
  contests: Record<string, BackfilledContest>
  contestMetadata?: Record<string, {
    id: number
    name: string
    startTimeSeconds?: number | null
    durationSeconds: number
  }>
}
const storedCatalog = backfilledContestCatalog as BackfilledCatalog
const backfilledContests = storedCatalog.contests
const contestProblemOverrides = new Map<number, CfProblem[]>(
  Object.entries(backfilledContests).map(([contestId, contest]) => [Number(contestId), contest.problems]),
)
const storedContests: CfContest[] = Object.entries(storedCatalog.contestMetadata ?? {}).map(
  ([contestId, contest]) => ({
    id: Number(contestId),
    name: contest.name,
    startTimeSeconds: contest.startTimeSeconds ?? undefined,
    durationSeconds: contest.durationSeconds,
  }),
)
const randomHandles = (randomHandleCatalog as { handles: string[] }).handles

function completeContestProblems(contestId: number, catalogProblems: CfProblem[] | undefined) {
  const confirmedProblems = contestProblemOverrides.get(contestId)
  if (!confirmedProblems) return catalogProblems

  const merged = new Map(confirmedProblems.map((problem) => [problem.index, problem]))
  for (const problem of catalogProblems ?? []) {
    merged.set(problem.index, { ...merged.get(problem.index), ...problem })
  }
  return [...merged.values()]
}

function getRandomUser() {
  if (!randomHandles.length) throw new Error("No active Codeforces users are available right now.")
  return { handle: randomHandles[Math.floor(Math.random() * randomHandles.length)] }
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
  contests: CfContest[]
): History {
  const contestMap = new Map(contests.map((contest) => [contest.id, contest]))
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
    const submittedProblems = [...new Map(
      group.submissions.map((item) => [item.problem.index, item.problem]),
    ).values()]
    const catalogProblems = completeContestProblems(group.contestId, submittedProblems)
      ?? submittedProblems
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

function buildHistoryWithCatalog(
  user: CfUser,
  ratings: CfRating[],
  submissions: CfSubmission[]
) {
  return buildHistory(user, ratings, submissions, storedContests)
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      user?: CfUser
      ratings?: CfRating[]
      submissions?: CfSubmission[]
    }
    if (!payload.user?.handle || !Array.isArray(payload.ratings) || !Array.isArray(payload.submissions)) {
      return Response.json({ error: "Invalid Codeforces data." }, { status: 400 })
    }
    const history = await buildHistoryWithCatalog(payload.user, payload.ratings, payload.submissions)
    return Response.json({ history }, { headers: { "Cache-Control": "no-store" } })
  } catch (cause) {
    const timedOut = cause instanceof Error && (
      cause.name === "TimeoutError" || cause.name === "AbortError"
    )
    return Response.json(
      {
        error: timedOut
          ? "Codeforces catalog took too long to respond. Please try again."
          : cause instanceof Error
            ? cause.message
            : "Could not prepare Codeforces history.",
      },
      { status: timedOut ? 504 : 502 }
    )
  }
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const wantsRandomHandle = searchParams.get("randomHandle") === "1"
  const wantsWarmup = searchParams.get("warm") === "1"
  if (wantsWarmup) {
    try {
      await getRandomUser()
      return Response.json({ ready: true }, { headers: { "Cache-Control": "no-store" } })
    } catch {
      return Response.json({ ready: false }, { status: 502, headers: { "Cache-Control": "no-store" } })
    }
  }
  if (!wantsRandomHandle) return Response.json({ error: "Unsupported request." }, { status: 400 })
  try {
    const user = await getRandomUser()
    return Response.json(
      { handle: user.handle },
      { headers: { "Cache-Control": "no-store" } }
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
