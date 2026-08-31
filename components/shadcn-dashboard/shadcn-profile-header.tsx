import type { History } from "@/components/ps-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ShadcnProfileHeader({ history, platform = "AtCoder" }: { history: History; platform?: "AtCoder" | "Codeforces" }) {
  const ratedHistory = history.raw?.actualHistory?.filter(
    (contest) => contest.newRating != null
  ) ?? []
  const currentRating = ratedHistory.at(-1)?.newRating ?? 0
  const peakRating = Math.max(
    currentRating,
    ...ratedHistory.map((contest) => contest.newRating ?? 0)
  )

  const metrics = [
    { label: "Rating", value: currentRating.toLocaleString() },
    { label: "Peak", value: peakRating.toLocaleString() },
    { label: "Actual", value: history.summary.actualSessions.toLocaleString() },
    { label: "Virtual", value: history.summary.virtualSessions.toLocaleString() },
  ]

  return (
    <Card size="sm" className="mx-4 lg:mx-6">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Avatar size="lg" className="rounded-lg">
          <AvatarFallback className="rounded-lg">
            {history.user
              .split(/[_\s-]+/)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "PS"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardDescription className="flex items-center gap-2">
            <Badge variant="outline">{platform}</Badge>
            {history.summary.submissions.toLocaleString()} submissions
          </CardDescription>
          <CardTitle className="truncate text-lg">{history.user}</CardTitle>
        </div>
        <div className="grid w-full grid-cols-4 gap-3 sm:w-auto">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-16">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="font-medium tabular-nums">{metric.value}</p>
            </div>
          ))}
        </div>
      </CardHeader>
    </Card>
  )
}
