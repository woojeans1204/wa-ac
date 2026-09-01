import type { History, UpsolveItem } from "@/components/ps-types"

export type AcceptedSubmission = {
  problemId: string
  epochSecond: number
}

export function buildUpsolveQueue(
  history: History,
  platform: "AtCoder" | "Codeforces",
  acceptedSubmissions: AcceptedSubmission[] = []
): UpsolveItem[] {
  const acceptedByProblem = new Map<string, number[]>()
  const accepted = [
    ...acceptedSubmissions,
    ...history.sessions.flatMap((session) =>
      session.problems.flatMap((problem) =>
        problem.submissions
          .filter((submission) => submission.result === "AC" || submission.result === "OK")
          .map((submission) => ({
            problemId: problem.problemId,
            epochSecond: submission.epoch_second,
          }))
      )
    ),
  ]

  for (const submission of accepted) {
    const items = acceptedByProblem.get(submission.problemId) ?? []
    items.push(submission.epochSecond)
    acceptedByProblem.set(submission.problemId, items)
  }
  acceptedByProblem.forEach((items) => items.sort((a, b) => a - b))

  const seenProblems = new Set<string>()
  const queue: UpsolveItem[] = []
  const fullContests = history.sessions
    .filter((session) => session.type !== "practice")
    .toSorted((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  for (const session of fullContests) {
    const sessionStart = Math.floor(new Date(session.startAt).getTime() / 1000)
    for (const problem of session.problems) {
      if (problem.solved || seenProblems.has(problem.problemId)) continue
      seenProblems.add(problem.problemId)

      const acceptedTimes = acceptedByProblem.get(problem.problemId) ?? []
      const completedSecond =
        acceptedTimes.find((time) => time > sessionStart) ?? acceptedTimes.at(-1) ?? null
      const problemUrl = platform === "Codeforces"
        ? `https://codeforces.com/contest/${session.contestId}/problem/${problem.index}`
        : `https://atcoder.jp/contests/${session.contestId}/tasks/${problem.problemId}`

      queue.push({
        id: `${session.sessionId}:${problem.problemId}`,
        sourceSessionId: session.sessionId,
        contestId: session.contestId,
        contestTitle: session.contestTitle,
        contestStartAt: session.startAt,
        problemId: problem.problemId,
        problemIndex: problem.index,
        problemTitle: problem.title,
        difficulty: problem.difficulty,
        difficultyColor: problem.difficultyColor,
        attemptedInContest: problem.attempted,
        completed: completedSecond != null,
        completedAt: completedSecond == null
          ? null
          : new Date(completedSecond * 1000).toISOString(),
        problemUrl,
      })
    }
  }

  return queue
}
