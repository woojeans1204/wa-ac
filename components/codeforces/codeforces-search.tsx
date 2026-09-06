"use client"

import * as React from "react"
import { IconDice5, IconLoader2, IconSearch } from "@tabler/icons-react"
import type { History } from "@/components/ps-types"
import { ShadcnDashboard } from "@/components/shadcn-dashboard/dashboard"
import { ShadcnSiteHeader } from "@/components/shadcn-dashboard/shadcn-site-header"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

type CodeforcesProfile = {
  handle: string
  avatarUrl?: string | null
  avatarFallbackUrl?: string | null
}

export function CodeforcesSearch({ initialHandle = "" }: { initialHandle?: string }) {
  const [handle, setHandle] = React.useState(initialHandle)
  const [history, setHistory] = React.useState<History | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadPlayer = React.useCallback(async (url: string) => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(35_000) })
      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.includes("application/json")) {
        throw new Error(
          response.status === 504
            ? "Codeforces search timed out. Please try again."
            : "The search server returned an invalid response. Please try again."
        )
      }
      const payload = await response.json() as { history?: History; error?: string }
      if (!response.ok || !payload.history) throw new Error(payload.error || "Could not load this handle.")
      setHistory(payload.history)
      setHandle(payload.history.user)
      window.history.replaceState(
        null,
        "",
        `/codeforces/${encodeURIComponent(payload.history.user)}${window.location.hash || "#dashboard"}`
      )
    } catch (cause) {
      const timedOut = cause instanceof Error && (
        cause.name === "TimeoutError" || cause.name === "AbortError"
      )
      setError(
        timedOut
          ? "Codeforces search timed out. Please try again."
          : cause instanceof Error
            ? cause.message
            : "Could not load this handle."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    const query = initialHandle.trim()
    if (!query) return
    const timeout = window.setTimeout(() => {
      void loadPlayer(`/api/codeforces?handle=${encodeURIComponent(query)}`)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [initialHandle, loadPlayer])

  const profileHandle = history?.user
  const profileAvatarUrl = history?.avatarUrl
  React.useEffect(() => {
    if (!profileHandle || profileAvatarUrl) return
    const controller = new AbortController()
    void fetch(`/api/codeforces?profile=1&handle=${encodeURIComponent(profileHandle)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ profile?: CodeforcesProfile }>
      })
      .then((payload) => {
        const profile = payload?.profile
        if (!profile) return
        setHistory((current) => current?.user.toLowerCase() === profile.handle.toLowerCase()
          ? {
              ...current,
              user: profile.handle,
              avatarUrl: profile.avatarUrl ?? null,
              avatarFallbackUrl: profile.avatarFallbackUrl ?? null,
            }
          : current)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [profileHandle, profileAvatarUrl])

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    const query = handle.trim()
    if (query) void loadPlayer(`/api/codeforces?handle=${encodeURIComponent(query)}`)
  }

  const randomPlayer = () => {
    void loadPlayer(`/api/codeforces?random=1&t=${Date.now()}`)
  }

  const searchForm = (
    <form onSubmit={search} className="flex w-full max-w-md items-center gap-2">
      <Input
        value={handle}
        onChange={(event) => setHandle(event.target.value)}
        placeholder="Codeforces handle"
        aria-label="Codeforces handle"
        autoCapitalize="none"
        autoCorrect="off"
      />
      <Button type="submit" size="sm" aria-label="Search" disabled={loading || !handle.trim()}>
        {loading ? <IconLoader2 className="animate-spin" /> : <IconSearch />}
        <span className="hidden md:inline">Search</span>
      </Button>
      <Button type="button" size="sm" variant="outline" aria-label="Random player" onClick={randomPlayer} disabled={loading}>
        <IconDice5 />
        <span className="hidden md:inline">Random</span>
      </Button>
    </form>
  )

  if (history) {
    return <ShadcnDashboard history={history} platform="Codeforces" headerContent={searchForm} error={error} />
  }

  return (
    <div className="min-h-screen bg-background">
      <ShadcnSiteHeader />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col px-2 py-6 md:px-3 lg:px-4">
        <Card className="mx-4 lg:mx-6">
          <CardHeader>
            <CardTitle>Search Codeforces player</CardTitle>
            <CardDescription>
              Enter an exact handle or discover a random recently active rated player.
            </CardDescription>
            <div className="max-w-xl pt-3">{searchForm}</div>
            {error && <p className="pt-2 text-sm text-destructive">{error}</p>}
          </CardHeader>
        </Card>
        {loading && (
          <Card size="sm" className="mx-4 mt-6 lg:mx-6">
            <CardHeader className="flex flex-row items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
            </CardHeader>
          </Card>
        )}
      </main>
    </div>
  )
}
