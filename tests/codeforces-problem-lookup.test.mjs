import assert from "node:assert/strict"
import test from "node:test"
import { createProblemLookup } from "../scripts/codeforces-problem-lookup.mjs"

const metadata = {
  2262: { name: "Codeforces Round 1120 (Div. 1)", startTimeSeconds: 100, durationSeconds: 10800 },
  2263: { name: "Codeforces Round 1120 (Div. 2)", startTimeSeconds: 100, durationSeconds: 10800 },
  2264: { name: "Codeforces Round 1121 (Div. 2)", startTimeSeconds: 200, durationSeconds: 10800 },
}
const source = { contestId: 2262, index: "A2", name: "Floor of MEX (Hard Version)", rating: 1800 }
const target = { index: "C2", name: source.name }

test("resolves shared problems without confusing problem indices or rounds", () => {
  const lookup = createProblemLookup([source], metadata)
  assert.equal(lookup(2263, target)?.rating, 1800)
  assert.equal(lookup(2264, target), undefined)
  assert.equal(lookup(2263, { ...target, name: "Floor of MEX (Easy Version)" }), undefined)
  assert.equal(createProblemLookup([source], {})(2263, target), undefined)
})

test("prefers exact ratings and rejects ambiguous matches", () => {
  const direct = { ...target, contestId: 2263, rating: 1900 }
  assert.equal(createProblemLookup([source, direct], metadata)(2263, target)?.rating, 1900)
  assert.equal(createProblemLookup([source, { ...source, index: "B" }], metadata)(2263, target), undefined)
  const differentTime = { ...metadata, 2263: { ...metadata[2263], startTimeSeconds: 101 } }
  assert.equal(createProblemLookup([source], differentTime)(2263, target), undefined)
})
