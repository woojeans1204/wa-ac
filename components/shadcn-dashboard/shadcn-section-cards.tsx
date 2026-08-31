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
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader><CardDescription>Current Rating</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.current}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />AtCoder</Badge></CardAction></CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm"><div className="line-clamp-1 flex gap-2 font-medium">Current algorithm rating <IconTrendingUp className="size-4" /></div><div className="text-muted-foreground">Imported rated history</div></CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader><CardDescription>Peak Rating</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.peak}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />Peak</Badge></CardAction></CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm"><div className="line-clamp-1 flex gap-2 font-medium">Highest recorded rating <IconTrendingUp className="size-4" /></div><div className="text-muted-foreground">Across rated contests</div></CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader><CardDescription>Full Contests</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{history.summary.actualSessions + history.summary.virtualSessions}</CardTitle><CardAction><Badge variant="outline"><IconTrendingUp />{history.summary.virtualSessions} virtual</Badge></CardAction></CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm"><div className="line-clamp-1 flex gap-2 font-medium">Actual and virtual sessions <IconTrendingUp className="size-4" /></div><div className="text-muted-foreground">Practice sessions excluded</div></CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader><CardDescription>Problems Solved</CardDescription><CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{data.solved}</CardTitle><CardAction><Badge variant="outline"><IconTrendingDown />{data.recent} recent</Badge></CardAction></CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm"><div className="line-clamp-1 flex gap-2 font-medium">Solved inside full contests <IconTrendingUp className="size-4" /></div><div className="text-muted-foreground">Recent four contests included</div></CardFooter>
      </Card>
    </div>
  )
}
