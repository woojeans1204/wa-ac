"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { IconPin, IconPinned, IconX } from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { cfRatingColor } from "@/lib/codeforces-colors"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toggleSavedAccountPin, useSavedAccounts } from "@/lib/saved-accounts"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function ProfileAvatar({ history, platform }: { history: History; platform: string }) {
  const [attempt, setAttempt] = React.useState(0)
  const urls = [...new Set([history.avatarUrl, history.avatarFallbackUrl].filter((url): url is string => !!url))]
  const sources = urls.flatMap((url) => {
    if (platform !== "Codeforces") return [url]
    const officialUrl = url.replace(/^https:\/\/userpic\.codeforces\.org\//, "https://codeforces.com/userpic.codeforces.org/")
    return [officialUrl, `/api/codeforces-avatar?v=2&url=${encodeURIComponent(url)}`, url]
  })
  const source = sources[attempt]
  const fallback = history.user
    .split(/[_\s-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PS"

  const image = source && (
    <AvatarImage
      key={source}
      src={source}
      alt={`${history.user} avatar`}
      referrerPolicy="no-referrer"
      loading="eager"
      onLoadingStatusChange={(status) => {
        if (status === "error") setAttempt((current) => current + 1)
      }}
    />
  )

  const avatar = (
    <Avatar size="lg" className="rounded-lg">
      {image}
      <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
    </Avatar>
  )

  if (!source) return avatar

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="rounded-lg outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Open ${history.user} profile picture`}
        >
          {avatar}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex h-[67vh] w-[74vw] max-w-xl -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">{history.user} profile picture</DialogPrimitive.Title>
          {/* The modal preserves the original remote image instead of requesting another optimized copy. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source}
            alt={history.user}
            className="h-full w-full rounded-xl object-contain drop-shadow-2xl"
            referrerPolicy="no-referrer"
            onError={() => setAttempt((current) => current + 1)}
          />
          <DialogPrimitive.Close className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-lg outline-none transition-colors hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-white">
            <IconX className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function ShadcnProfileHeader({ history, platform = "AtCoder" }: { history: History; platform?: "AtCoder" | "Codeforces" }) {
  const savedAccounts = useSavedAccounts()
  const pinned = savedAccounts.some((account) =>
    account.platform === platform && account.handle.toLowerCase() === history.user.toLowerCase() && account.pinned
  )
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
    <Card size="sm" className="mx-4 lg:mx-6" data-hover-actions>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ProfileAvatar key={`${history.user}:${history.avatarUrl}:${history.avatarFallbackUrl}`} history={history} platform={platform} />
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
              <p className="font-medium tabular-nums" style={{ color: platform === "Codeforces" && (metric.label === "Rating" || metric.label === "Peak") ? cfRatingColor(metric.label === "Rating" ? currentRating : peakRating) : undefined }}>{metric.value}</p>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="self-start transition-opacity sm:self-center"
          data-hover-action
          aria-label={pinned ? `Unpin ${history.user}` : `Pin ${history.user}`}
          title={pinned ? "Unpin account" : "Pin account"}
          onClick={() => toggleSavedAccountPin(platform, history.user)}
        >
          {pinned ? <IconPinned /> : <IconPin />}
        </Button>
      </CardHeader>
    </Card>
  )
}
