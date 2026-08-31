import type { History } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

function frontierBands(history: History) {
  const recent = history.sessions.filter((session) => session.type !== "practice").slice(0, 24)
  return [0, 400, 800, 1200, 1600, 2000].map((floor) => {
    const problems = recent.flatMap((session) => session.problems).filter((problem) => {
      const difficulty = problem.difficulty ?? -1
      return difficulty >= floor && difficulty < floor + 400
    })
    const solved = problems.filter((problem) => problem.solved).length
    const rate = problems.length ? Math.round((solved / problems.length) * 100) : 0
    const state = rate >= 75 ? "Stable" : rate >= 50 ? "Comfortable" : rate >= 25 ? "Training" : "Stretch"
    return { floor, solved, attempted: problems.filter((problem) => problem.attempted).length, total: problems.length, rate, state }
  })
}

export function TrainingFrontier({ history }: { history: History }) {
  const bands = frontierBands(history)

  return (
    <Card id="frontier" className="scroll-mt-5 shadow-xs">
      <CardHeader>
        <CardTitle>Training frontier</CardTitle>
        <CardDescription>Solve coverage by AtCoder difficulty · latest 24 actual and virtual contests</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bands.map((item) => (
          <Card key={item.floor} size="sm">
            <CardHeader>
              <CardDescription>{item.floor}–{item.floor + 399}</CardDescription>
              <CardTitle className="flex items-center justify-between font-mono text-xl"><span>{item.rate}%</span><Badge variant="outline" className="font-sans font-normal">{item.state}</Badge></CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={item.rate} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">{item.solved} solved · {item.attempted} attempted · {item.total} seen</p>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
