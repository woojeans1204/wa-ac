import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

function metrics(history: History) {
  const rated = history.raw?.actualHistory?.filter((item) => item.newRating != null) ?? []
  const current = rated.at(-1)?.newRating ?? 0
  const peak = Math.max(current, ...rated.map((item) => item.newRating ?? 0))
  const full = history.sessions.filter((item) => item.type !== "practice")
  const solved = full.reduce((sum, item) => sum + item.metrics.solved, 0)
  const recent = full.slice(0, 4).reduce((sum, item) => sum + item.metrics.solved, 0)
  return { current, peak, solved, recent }
}

export function ShadcnSectionCards({ history }: { history: History }) {
  const data = metrics(history)
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card size="sm" className="@container/card">
        <CardHeader><CardDescription>Current Rating</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.current}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />AtCoder</Badge></CardAction></CardHeader>
        <CardFooter className="text-xs text-muted-foreground">Imported rated history</CardFooter>
      </Card>
      <Card size="sm" className="@container/card">
        <CardHeader><CardDescription>Peak Rating</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.peak}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />Peak</Badge></CardAction></CardHeader>
        <CardFooter className="text-xs text-muted-foreground">Across rated contests</CardFooter>
      </Card>
      <Card size="sm" className="@container/card">
        <CardHeader><CardDescription>Full Contests</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{history.summary.actualSessions + history.summary.virtualSessions}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />{history.summary.virtualSessions} virtual</Badge></CardAction></CardHeader>
        <CardFooter className="text-xs text-muted-foreground">Practice excluded</CardFooter>
      </Card>
      <Card size="sm" className="@container/card">
        <CardHeader><CardDescription>Problems Solved</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.solved}</CardTitle><CardAction><Badge variant="outline"><IconTrendingDown />{data.recent} recent</Badge></CardAction></CardHeader>
        <CardFooter className="text-xs text-muted-foreground">Full contests only</CardFooter>
      </Card>
    </div>
  )
}
