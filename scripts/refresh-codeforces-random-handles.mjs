import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const SOURCE_URL = "https://codeforces.com/api/user.ratedList?activeOnly=true&includeRetired=false"
const OUTPUT_URL = new URL("../app/data/codeforces-random-handles.json", import.meta.url)

async function readPayload() {
  const inputPath = process.argv[2]
  if (inputPath) return JSON.parse(await readFile(inputPath, "utf8"))

  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "WA-AC-Random-Handle-Refresh/1.0" },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Codeforces returned HTTP ${response.status}.`)
  return response.json()
}

const payload = await readPayload()
if (payload?.status !== "OK" || !Array.isArray(payload.result)) {
  throw new Error(payload?.comment || "Codeforces returned an invalid rated-user list.")
}

const candidates = payload.result
  .filter((user) => typeof user?.handle === "string" && Number.isFinite(user?.rating))
  .map((user) => user.handle)

if (!candidates.length) throw new Error("No active rated Codeforces handles were returned.")

await writeFile(OUTPUT_URL, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceCount: candidates.length,
  handles: candidates,
}, null, 2)}\n`)

console.log(`Saved ${candidates.length.toLocaleString()} active rated handles.`)
console.log(fileURLToPath(OUTPUT_URL))
