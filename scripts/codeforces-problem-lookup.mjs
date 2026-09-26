// Shared Div. 1/2 problems may appear only once in problemset.problems.
// Require the same round, start time, duration and exact problem title.
function roundKey(contest) {
  const match = contest?.name?.match(/Codeforces Round\s*#?\s*(\d+)\s*\(Div\.\s*[12]\)/i)
  if (!match || !contest.startTimeSeconds || !contest.durationSeconds) return null
  return `${match[1]}:${contest.startTimeSeconds}:${contest.durationSeconds}`
}

export function createProblemLookup(problems, metadata) {
  const exact = new Map(problems.map((p) => [`${p.contestId}:${p.index}`, p]))
  const shared = new Map()
  for (const problem of problems) {
    const round = roundKey(metadata[problem.contestId])
    if (!round || !Number.isFinite(problem.rating)) continue
    const key = `${round}:${problem.name}`
    const entries = shared.get(key) ?? []
    entries.push(problem)
    shared.set(key, entries)
  }
  return (contestId, problem) => {
    const direct = exact.get(`${contestId}:${problem.index}`)
    if (Number.isFinite(direct?.rating)) return direct
    const round = roundKey(metadata[contestId])
    const candidates = round ? shared.get(`${round}:${problem.name}`) ?? [] : []
    if (candidates.length === 1) return candidates[0]
    return direct
  }
}
