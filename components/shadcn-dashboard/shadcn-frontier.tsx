import type { History } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const bands = [[0, 400], [400, 800], [800, 1200], [1200, 1600], [1600, 2000], [2000, Infinity]] as const

export function ShadcnFrontier({ history }: { history: History }) {
  const problems = history.sessions.filter((session) => session.type !== "practice").flatMap((session) => session.problems)
  return <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">{bands.map(([min, max]) => {
    const seen = problems.filter((problem) => (problem.difficulty ?? -1) >= min && (problem.difficulty ?? -1) < max)
    const solved = seen.filter((problem) => problem.solved).length
    const rate = seen.length ? Math.round(solved / seen.length * 100) : 0
    return <Card key={min} className="@container/card"><CardHeader><CardDescription>{min}–{max === Infinity ? "∞" : max - 1}</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{rate}%</CardTitle><CardAction><Badge variant="outline">{solved}/{seen.length}</Badge></CardAction></CardHeader><CardFooter className="flex-col items-start gap-3 text-sm"><Progress value={rate} /><div className="text-muted-foreground">Problems solved in full contests</div></CardFooter></Card>
  })}</div>
}
