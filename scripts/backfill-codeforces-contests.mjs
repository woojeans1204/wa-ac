import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import process from "node:process"

const DEFAULT_OUTPUT = "app/data/codeforces-contest-problems.json"
const API_BASE = "https://codeforces.com/api"
// Finished contests that Codeforces keeps in contest.list but exposes neither
// through contest.standings nor problemset.problems. Their web pages are also
// access-restricted legacy practice or trial rounds.
const PERMANENTLY_UNAVAILABLE_CONTEST_IDS = new Set([
  1597, 1596, 1595, 1414, 1412, 1410, 1258, 1226, 1224, 1222, 1094,
  1050, 1049, 1048, 905, 885, 874, 857, 826, 728, 726, 693,
])

function usage() {
  console.log(`Usage: node scripts/backfill-codeforces-contests.mjs [options]

Options:
  --contest <id[,id...]>  Fetch only selected contest IDs
  --from <id>             Minimum contest ID
  --to <id>               Maximum contest ID
  --limit <count>         Stop after this many newly fetched contests
  --delay <ms>            Delay between API requests (default: 2100)
  --checkpoint <count>    Save after this many contests (default: 5)
  --refresh               Fetch contests already in the checkpoint again
  --output <path>         Checkpoint path
  --help                  Show this help
`)
}

function positiveInteger(value, name, { allowZero = false } = {}) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${name} must be ${allowZero ? "a non-negative" : "a positive"} integer.`)
  }
  return number
}

function parseArguments(argv) {
  const options = {
    contestIds: [],
    from: 1,
    to: Number.MAX_SAFE_INTEGER,
    limit: Number.MAX_SAFE_INTEGER,
    delay: 2100,
    checkpoint: 5,
    refresh: false,
    output: DEFAULT_OUTPUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    const next = () => {
      const value = argv[index + 1]
      if (value == null) throw new Error(`${argument} requires a value.`)
      index += 1
      return value
    }

    if (argument === "--help") return { ...options, help: true }
    if (argument === "--contest") {
      options.contestIds.push(...next().split(",").map((value) => positiveInteger(value, "contest ID")))
    } else if (argument === "--from") options.from = positiveInteger(next(), "--from")
    else if (argument === "--to") options.to = positiveInteger(next(), "--to")
    else if (argument === "--limit") options.limit = positiveInteger(next(), "--limit")
    else if (argument === "--delay") options.delay = positiveInteger(next(), "--delay", { allowZero: true })
    else if (argument === "--checkpoint") options.checkpoint = positiveInteger(next(), "--checkpoint")
    else if (argument === "--output") options.output = next()
    else if (argument === "--refresh") options.refresh = true
    else throw new Error(`Unknown option: ${argument}`)
  }

  return options
}

async function readCheckpoint(path) {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8"))
    if (parsed?.version !== 1 || typeof parsed?.contests !== "object") {
      throw new Error("Unsupported checkpoint format.")
    }
    return parsed
  } catch (error) {
    if (error?.code !== "ENOENT") throw error
    return {
      version: 1,
      updatedAt: null,
      problemsetFetchedAt: null,
      ratingDisagreements: [],
      contests: {},
    }
  }
}

function sortedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => Number(right) - Number(left)),
  )
}

async function saveCheckpoint(path, checkpoint) {
  checkpoint.updatedAt = new Date().toISOString()
  checkpoint.contests = sortedRecord(checkpoint.contests)
  const absolutePath = resolve(path)
  const temporaryPath = `${absolutePath}.tmp`
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(temporaryPath, `${JSON.stringify(checkpoint, null, 2)}\n`)
  await rename(temporaryPath, absolutePath)
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

async function readProblemsBeforeStandingsRows(response) {
  if (!response.body) throw new Error("Codeforces returned an empty response.")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let source = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    source += decoder.decode(value, { stream: true })

    const keyAt = source.indexOf('"problems"')
    if (keyAt < 0) continue
    const arrayStart = source.indexOf("[", keyAt)
    if (arrayStart < 0) continue

    let depth = 0
    let quoted = false
    let escaped = false
    for (let index = arrayStart; index < source.length; index += 1) {
      const character = source[index]
      if (quoted) {
        if (escaped) escaped = false
        else if (character === "\\") escaped = true
        else if (character === '"') quoted = false
        continue
      }
      if (character === '"') quoted = true
      else if (character === "[") depth += 1
      else if (character === "]") {
        depth -= 1
        if (depth === 0) {
          const problems = JSON.parse(source.slice(arrayStart, index + 1))
          await reader.cancel()
          return problems
        }
      }
    }
  }

  source += decoder.decode()
  const payload = JSON.parse(source)
  throw new Error(payload?.comment || "Codeforces response did not include a problem list.")
}

function createCodeforcesClient(delay) {
  let nextAllowedAt = 0

  return async function request(method, parameters = {}, { problemsOnly = false } = {}) {
    let lastError
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const wait = Math.max(0, nextAllowedAt - Date.now())
      if (wait > 0) await sleep(wait)

      const url = new URL(`${API_BASE}/${method}`)
      for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, String(value))

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "WA-AC-contest-backfill/1.0" },
          signal: AbortSignal.timeout(30_000),
        })
        nextAllowedAt = Date.now() + delay
        if (response.ok && problemsOnly) return await readProblemsBeforeStandingsRows(response)
        const payload = await response.json().catch(() => null)
        if (response.ok && payload?.status === "OK") return payload.result

        const message = payload?.comment || `Codeforces returned HTTP ${response.status}.`
        lastError = new Error(message)
        if (response.status !== 429 && response.status < 500) break
      } catch (error) {
        nextAllowedAt = Date.now() + delay
        lastError = error
      }
    }
    throw lastError ?? new Error(`Could not fetch ${method}.`)
  }
}

function problemKey(contestId, index) {
  return `${contestId}:${index}`
}

function compactProblem(problem, contestId, globalProblem) {
  const standingsRating = Number.isFinite(problem.rating) ? problem.rating : null
  const problemsetRating = Number.isFinite(globalProblem?.rating) ? globalProblem.rating : null
  return {
    contestId,
    index: problem.index,
    name: globalProblem?.name || problem.name,
    rating: problemsetRating ?? standingsRating,
    standingsRating,
    tags: globalProblem?.tags ?? problem.tags ?? [],
  }
}

function crossValidateStoredContests(checkpoint, globalProblems) {
  const globalMap = new Map(
    globalProblems
      .filter((problem) => problem.contestId != null)
      .map((problem) => [problemKey(problem.contestId, problem.index), problem]),
  )
  const disagreements = []
  let updatedRatings = 0

  for (const [contestIdText, contest] of Object.entries(checkpoint.contests)) {
    const contestId = Number(contestIdText)
    contest.problems = contest.problems.map((problem) => {
      const globalProblem = globalMap.get(problemKey(contestId, problem.index))
      const standingsRating = Number.isFinite(problem.standingsRating) ? problem.standingsRating : null
      const problemsetRating = Number.isFinite(globalProblem?.rating) ? globalProblem.rating : null
      if (standingsRating != null && problemsetRating != null && standingsRating !== problemsetRating) {
        disagreements.push({ contestId, index: problem.index, standingsRating, problemsetRating })
      }
      const rating = problemsetRating ?? standingsRating
      if (problem.rating !== rating) updatedRatings += 1
      return {
        ...problem,
        name: globalProblem?.name || problem.name,
        rating,
        tags: globalProblem?.tags ?? problem.tags ?? [],
      }
    })
  }

  checkpoint.problemsetFetchedAt = new Date().toISOString()
  checkpoint.ratingDisagreements = disagreements
  return { globalMap, disagreements, updatedRatings }
}

let stopping = false
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (stopping) process.exit(1)
    stopping = true
    console.log(`\n${signal} received. Saving the current checkpoint after this request...`)
  })
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    usage()
    return
  }

  const outputPath = resolve(options.output)
  const checkpoint = await readCheckpoint(outputPath)
  const request = createCodeforcesClient(options.delay)

  console.log("Fetching the current Codeforces problemset for rating cross-validation...")
  const problemset = await request("problemset.problems")
  const { globalMap, disagreements, updatedRatings } = crossValidateStoredContests(
    checkpoint,
    problemset.problems,
  )
  console.log(`Checked ${Object.keys(checkpoint.contests).length} stored contests: ${updatedRatings} rating updates, ${disagreements.length} disagreements.`)

  const contests = await request("contest.list", { gym: "false" })
  const selectedIds = new Set(options.contestIds)
  const targets = contests
    .filter((contest) => contest.phase === "FINISHED")
    .filter((contest) => !PERMANENTLY_UNAVAILABLE_CONTEST_IDS.has(contest.id))
    .filter((contest) => contest.id >= options.from && contest.id <= options.to)
    .filter((contest) => selectedIds.size === 0 || selectedIds.has(contest.id))
    .filter((contest) => options.refresh || !checkpoint.contests[String(contest.id)])
    .sort((left, right) => right.id - left.id)
    .slice(0, options.limit)

  console.log(`${targets.length} contests selected. Output: ${outputPath}`)
  let completedSinceSave = 0
  let completed = 0
  let failures = 0

  for (const contest of targets) {
    if (stopping) break
    try {
      const standingsProblems = await request(
        "contest.standings",
        { contestId: contest.id },
        { problemsOnly: true },
      )
      const contestDisagreements = []
      const problems = standingsProblems.map((problem) => {
        const globalProblem = globalMap.get(problemKey(contest.id, problem.index))
        const compact = compactProblem(problem, contest.id, globalProblem)
        if (
          compact.standingsRating != null
          && globalProblem?.rating != null
          && compact.standingsRating !== globalProblem.rating
        ) {
          contestDisagreements.push({
            contestId: contest.id,
            index: problem.index,
            standingsRating: compact.standingsRating,
            problemsetRating: globalProblem.rating,
          })
        }
        return compact
      })

      checkpoint.contests[String(contest.id)] = {
        name: contest.name,
        fetchedAt: new Date().toISOString(),
        problems,
      }
      checkpoint.ratingDisagreements = [
        ...checkpoint.ratingDisagreements.filter((issue) => issue.contestId !== contest.id),
        ...contestDisagreements,
      ]
      completed += 1
      completedSinceSave += 1
      console.log(`[${completed}/${targets.length}] ${contest.id}: ${problems.length} problems, ${contestDisagreements.length} rating disagreements`)

      if (completedSinceSave >= options.checkpoint) {
        await saveCheckpoint(outputPath, checkpoint)
        completedSinceSave = 0
      }
    } catch (error) {
      failures += 1
      console.error(`[failed] ${contest.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await saveCheckpoint(outputPath, checkpoint)
  console.log(`Saved ${Object.keys(checkpoint.contests).length} contests. Added ${completed}; failed ${failures}.`)
  if (stopping) console.log("Stopped cleanly. Run the same command to resume.")
  if (failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
})
